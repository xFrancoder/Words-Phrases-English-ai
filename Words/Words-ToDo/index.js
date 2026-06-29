import fs from "fs";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const INPUT_FILE = "words.txt";
const OUTPUT_FILE = "output/vocabulary.json";
const BATCH_SIZE = 10;

// -----------------------------
// UTIL: parse línea Oxford
// -----------------------------
function parseLine(line) {
  line = line.trim();
  if (!line) return null;

  // grammar al final
  const grammarMatch = line.match(
    /(n\.|v\.|adj\.|adv\.|prep\.|pron\.|det\.|conj\.|exclam\.|modal v\.|auxiliary v\.|number)(,\s*(n\.|v\.|adj\.|adv\.|prep\.|pron\.|det\.|conj\.|exclam\.|modal v\.|auxiliary v\.|number))*$/i
  );

  if (!grammarMatch) {
    console.warn("No grammar found:", line);
    return null;
  }

  const grammarPart = grammarMatch[0];
  let wordPart = line.slice(0, line.length - grammarPart.length).trim();

  // hint
  let hint = "";
  const hintMatch = wordPart.match(/\((.*?)\)/);

  if (hintMatch) {
    hint = hintMatch[1].trim();
    wordPart = wordPart.replace(/\(.*?\)/g, "").trim();
  }

  wordPart = wordPart.replace(/,$/, "").trim();

  let baseWord = wordPart;

  const numMatch = wordPart.match(/^(.+?)(\d+)$/);

  if (numMatch) {
    baseWord = numMatch[1];
  }

  const grammar = grammarPart
    .split(",")
    .map(g => g.trim());

  return {
    word: wordPart,
    displayWord: baseWord,
    hint,
    grammar,
  };
}
// -----------------------------
// leer archivo
// -----------------------------
function loadWords() {
  const raw = fs.readFileSync(INPUT_FILE, "utf-8");

  const lines = raw
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const fixedLines = [];

  for (const line of lines) {
    // si parece continuación, unir a la anterior
    if (
      fixedLines.length > 0 &&
      (
        line.startsWith("adj.") ||
        line.startsWith("adv.") ||
        line.startsWith("n.") ||
        line.startsWith("v.") ||
        line.startsWith("prep.") ||
        line.startsWith("pron.") ||
        line.startsWith("det.") ||
        line.startsWith("conj.")
      )
    ) {
      fixedLines[fixedLines.length - 1] += " " + line;
    } else {
      fixedLines.push(line);
    }
  }

  return fixedLines
    .map(parseLine)
    .filter(Boolean);
}

// -----------------------------
// chunk array
// -----------------------------
function chunk(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
}

// -----------------------------
// prompt Gemini (solo lingüístico)
// -----------------------------
function buildPrompt(batch) {
    return `
You are an English vocabulary assistant.

Return ONLY raw valid JSON array.
Do not wrap in markdown.
Do not explain anything.
Keep same order as input.

For each item generate:

- phoneticIpa:
US pronunciation using IPA symbols.

- phoneticSimple:
Pronunciation for a Spanish speaker using normal letters.
Examples:
banana → banána
action → ákshon
water → uáder
thought → zót

- translation:
Main Spanish translation(s).
If grammar has multiple meanings, include translations for those meanings.

- example:
Short, natural, common English sentence.
Prefer simple English.
Maximum 12 words.

- usage:
Very short description in English.
Examples:
banana -> common fruit
home -> place to live
action -> doing something important
area -> part of a place

Rules:
- Write in English.
- 2 to 6 words.
- Do not describe grammar.
- Do not write dictionary definitions.

Examples:
banana -> common fruit
home -> place to live
action -> doing something important
area -> part of a place
teacher -> person who teaches
friend -> person you know well

INPUT:
${JSON.stringify(batch)}


OUTPUT FORMAT:
[
  {
    "phoneticIpa": "",
    "phoneticSimple": "",
    "translation": "",
    "example": "",
    "usage": ""
  }
]
`;
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
// -----------------------------
// llamar Gemini
// -----------------------------
async function callGemini(prompt, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const cleanText = response.text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      return JSON.parse(cleanText);

    } catch (err) {

      // retry automático para quota/rate limit
      if (err?.status === 429 && attempt < retries) {
        console.log(
          `429 rate limit. Esperando 25s... intento ${attempt}/${retries}`
        );

        await sleep(25000);
        continue;
      }

      throw err;
    }
  }
}

// -----------------------------
// llamar Gemini (batch)
// -----------------------------
async function callGeminiBatch(batch) {
  const prompt = buildPrompt(batch);
  return await callGemini(prompt);
}

// -----------------------------
// MAIN
// -----------------------------
async function main() {
  const words = loadWords();
  const batches = chunk(words, BATCH_SIZE);

    let existingData = [];

  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existingData = JSON.parse(
        fs.readFileSync(OUTPUT_FILE, "utf-8")
      );
    } catch {
      existingData = [];
    }
  }
  const final = existingData;

  let globalId = existingData.length
  ? existingData[existingData.length - 1].id + 1
  : 1;

 for (const batch of batches) {
  const aiResult = await callGeminiBatch(batch);

  const merged = aiResult.map((item, idx) => {
    const base = batch[idx];
    const id = globalId++;

    return {
      id,
      grammar: base.grammar,
      phoneticIpa: `**${item.phoneticIpa}**`,
      phoneticSimple: item.phoneticSimple,
      word: base.word,
      translation: item.translation,
      audio: `![[B2-Words-${id}.mp3]]`,
      example: item.example,
      usage: item.usage,
      displayWord: base.displayWord,
      hint: base.hint,
    };
  });

  final.push(...merged);

  // guardar progreso parcial
  fs.mkdirSync("output", { recursive: true });

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(final, null, 2)
  );
}

console.log("DONE →", OUTPUT_FILE);

}

main();