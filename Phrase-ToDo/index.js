require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");
const { PROMPT } = require("./prompt");
const { group } = require("console");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = process.env.MODEL || "gemini-2.5-flash";

const WORDS_PATH = path.join(__dirname, "test.txt");
const JSON_PATH = path.join(__dirname, "test.json");

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;


function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isExampleLine(line) {
  if (!line) return false;

  const trimmed = line.trim();

  if (!trimmed) return false;

  // Frases Oxford tipo:
  // "He came into the room."
  // "Prices are going down."
  // "Would you like coffee?"
  // "Oh no!"
  const startsUpperCase = /^[A-Z]/.test(trimmed);

  const endsLikeSentence = /[.!?…]$/.test(trimmed);

  return startsUpperCase && endsLikeSentence;
}

function isBrokenLine(line) {
  const trimmed = line.trim();

  const brokenWords = [
    "sth",
    "sb",
    "etc.",
    "like?",
    "do?",
    "to",
    "with",
    "for",
    "of",
    "in",
    "on",
    "that)…",
  ];

  return brokenWords.includes(trimmed);
}

function normalizeLines(text) {
  const rawLines = text
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const merged = [];

  for (const line of rawLines) {
    if (!merged.length) {
      merged.push(line);
      continue;
    }

    const prev = merged[merged.length - 1];

    if (isBrokenLine(line)) {
      merged[merged.length - 1] = `${prev} ${line}`.trim();
      continue;
    }

    merged.push(line);
  }

  return merged;
}

function dedupe(lines) {
  const seen = new Set();
  const result = [];

  for (const line of lines) {
    const key = line.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(line);
  }

  return result;
}

function looksLikeChild(parent, candidate) {
  const p = parent.toLowerCase().trim();
  const c = candidate.toLowerCase().trim();

  if (p === c) return false;

  if (c.startsWith(`${p} `)) return true;

  return false;
}

function createAudioName(id) {
  return `A2-Frase-${id}.mp3`;
}

async function readWords() {
  try {
    const content = await fs.readFile(WORDS_PATH, "utf8");

    return content;
  } catch {
    return "";
  }
}

async function readJson() {
  try {
    const content = await fs.readFile(JSON_PATH, "utf8");

    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function saveJson(data) {
  const pretty = JSON.stringify(data, null, 2);

  await fs.writeFile(JSON_PATH, pretty, "utf8");
}

async function saveWords(lines) {
  await fs.writeFile(
    WORDS_PATH,
    lines.join("\n").trim(),
    "utf8"
  );
}

function buildOxfordGroups(lines) {
  const groups = [];

  let i = 0;

  while (i < lines.length) {
    const current = lines[i];

    if (isExampleLine(current)) {
      i++;
      continue;
    }

    const group = {
      phrase: current,
      children: [],
      consumedLines: [current],
    };

    let j = i + 1;

    while (j < lines.length) {
      const next = lines[j];

      if (isExampleLine(next)) {
        group.children.push({
          phrase: next,
        });

        group.consumedLines.push(next);

        j++;
        continue;
      }

      if (looksLikeChild(current, next)) {
        group.children.push({
          phrase: next,
        });

        group.consumedLines.push(next);

        // ejemplo del child
        const maybeExample = lines[j + 1];

        if (
          maybeExample &&
          isExampleLine(maybeExample)
        ) {
          group.children.push({
            phrase: maybeExample,
          });

          group.consumedLines.push(maybeExample);

          j++;
        }

        j++;
        continue;
      }

      break;
    }

    groups.push(group);

    i = j;
  }

  return groups;
}
async function askGemini(group) {
  const payload = {
    phrase: group.phrase,
    children: group.children.map(
      (x) => x.phrase
    ),
  };

  let lastError;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    try {
      console.log(
        `Intentando Gemini (${attempt}/${MAX_RETRIES}) → ${group.phrase}`
      );

      const response =
        await ai.models.generateContent({
          model: MODEL,
          contents: `${PROMPT}

Devuelve JSON válido.

INPUT:
${JSON.stringify(payload, null, 2)}
`,
        });

      const text =
        response.text?.trim() ??
        response.outputText?.trim() ??
        "";

      if (!text) {
        throw new Error(
          "Gemini devolvió texto vacío."
        );
      }

      const cleaned = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(cleaned);

      return parsed;
    } catch (error) {
      lastError = error;

      console.error(
        `Error Gemini (${attempt}/${MAX_RETRIES})`,
        error.message
      );

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  throw lastError;
}

async function processOneGroup(group) {
  const existing = await readJson();

  const nextId =
    existing.length > 0
      ? existing[existing.length - 1].id + 1
      : 1;

  const aiResult = await askGemini(group);

  const item = {
    id: nextId,

    phrase:
      aiResult.phrase || group.phrase,

    translation:
      aiResult.translation || "",

    audio: createAudioName(nextId),

    children: Array.isArray(
      aiResult.children
    )
      ? aiResult.children
      : [],


    phoneticSimple:
      aiResult.phoneticSimple || "",

    example:
      aiResult.example || "",

    usage:
      aiResult.usage || "",
  };

  existing.push(item);

  // SEGURIDAD:
  // primero guardar JSON
  await saveJson(existing);

  // luego recién borrar txt
  const currentWords = await readWords();

  let lines = normalizeLines(currentWords);
  lines = dedupe(lines);

  const consumed =
    group.consumedLines.map((x) =>
      x.trim().toLowerCase()
    );

  lines = lines.filter(
    (line) =>
      !consumed.includes(
        line.trim().toLowerCase()
      )
  );

  await saveWords(lines);

  console.log(
    `✓ Guardado ID ${nextId}: ${group.phrase}`
  );
}

async function main() {
  try {
    const wordsText =
      await readWords();

    if (!wordsText.trim()) {
      console.log(
        "words.txt está vacío."
      );
      return;
    }

    let lines =
      normalizeLines(wordsText);

    lines = dedupe(lines);

    const groups =
      buildOxfordGroups(lines);

    if (!groups.length) {
      console.log(
        "No se encontraron frases."
      );
      return;
    }
    for (const group of groups) {
      const BATCH_SIZE = 6;
      console.log(
        `Procesando: ${group.phrase}`
      );

      await processOneGroup(group);
    }

    console.log(
      "Proceso completado."
    );
  } catch (error) {
    console.error(
      "Error fatal:",
      error
    );
  }
}

main();