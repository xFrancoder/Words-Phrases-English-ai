const fs = require("fs");
const path = require("path");

// ==========================
// CONFIG
// ==========================
const JSON_PATH = "./A1.json"; // tu json
const OUTPUT_FOLDER = "./frases-md"; // carpeta donde crear .md
const MAX_PHRASES_PER_FILE = 15;

// ==========================
// HELPERS
// ==========================

function escapeMarkdownTable(text = "") {
  return String(text)
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function buildPhraseCell(item) {
  const lines = [escapeMarkdownTable(item.phrase)];

  if (Array.isArray(item.children) && item.children.length > 0) {
    for (const child of item.children) {
      lines.push(`_- ${escapeMarkdownTable(child.phrase)}_`);
    }
  }

  return lines.join("<br>");
}

function buildTranslationCell(item) {
  const lines = [
    `${escapeMarkdownTable(item.translation)}`,
  ];

  if (Array.isArray(item.children) && item.children.length > 0) {
    for (const child of item.children) {
      lines.push(`_- ${escapeMarkdownTable(child.translation)}_`);
    }
  }

  return lines.join("<br>");
}

function buildAudioCell(audio) {
  if (!audio) return "";

  return `![[${audio}]]`;
}

function buildMarkdownTable(items) {
  
  const header =
    "| Phonetic | Phrase | Translation | Usage | Audio | ​ | ​ | Example | ID |\n" +
    "|---|---|---|---|---|---|---|---|---|";
  const rows = items.map((item) => {
    const phonetic = buildPhoneticCell(item);

    const phrase = buildPhraseCell(item);

    const translation = buildTranslationCell(item);

    const usage = escapeMarkdownTable(item.usage || "");

    const audio = buildAudioCell(item.audio);

    const example = escapeMarkdownTable(item.example || "");


    const id = item.id ?? "";

    return `| ${phonetic} | ${phrase} | ${translation} | ${usage} | ${audio} | < | < | ${example} | ${id} |`;
  });

  return [header, ...rows].join("\n");
}

function buildPhoneticCell(item) {
  const lines = [
    escapeMarkdownTable(item.phoneticSimple || "")
  ];

  if (Array.isArray(item.children) && item.children.length > 0) {
    for (const child of item.children) {
      lines.push(
        `- ${escapeMarkdownTable(child.phoneticSimple || "")}`
      );
    }
  }

  return lines.join("<br>");
}
// ==========================
// MAIN
// ==========================

function main() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error(`No existe el archivo JSON: ${JSON_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(JSON_PATH, "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    console.error("El JSON debe ser un array.");
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_FOLDER)) {
    fs.mkdirSync(OUTPUT_FOLDER, { recursive: true });
  }

 let created = 0;

let groups = [];
let currentGroup = [];
let currentCount = 0;

for (const item of data) {
  const phraseCount = 1 + (item.children?.length || 0);

  if (
    currentGroup.length > 0 &&
    currentCount + phraseCount > MAX_PHRASES_PER_FILE
  ) {
    groups.push(currentGroup);
    currentGroup = [];
    currentCount = 0;
  }

  currentGroup.push(item);
  currentCount += phraseCount;
}

if (currentGroup.length > 0) {
  groups.push(currentGroup);
}

for (let fileIndex = 0; fileIndex < groups.length; fileIndex++) {
  const fileNumber = fileIndex + 1;

  const fileName = `${fileNumber}-frases.md`;
  const filePath = path.join(
    OUTPUT_FOLDER,
    fileName
  );

  if (fs.existsSync(filePath)) {
    continue;
  }

  const markdown = buildMarkdownTable(
    groups[fileIndex]
  );

  fs.writeFileSync(
    filePath,
    markdown,
    "utf8"
  );

  created++;

  console.log(`Creado: ${fileName}`);
}

console.log("\n====================");
console.log("Proceso terminado");
console.log(`Total frases: ${data.length}`);
console.log(`Archivos generados: ${groups.length}`);
console.log(`Archivos creados: ${created}`);
}

main();