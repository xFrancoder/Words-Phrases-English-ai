const fs = require("fs");
const path = require("path");

/**
 * CONFIG
 */
const INPUT_JSON = "./words.json";
const OUTPUT_FOLDER = "./tablas1";

// Desde qué ID empezar (incluyente)
const FROM_ID =1;

// Máximo de filas por tabla
const ROWS_PER_TABLE = 15;

/**
 * Crear carpeta si no existe
 */
if (!fs.existsSync(OUTPUT_FOLDER)) {
  fs.mkdirSync(OUTPUT_FOLDER, { recursive: true });
}

/**
 * Leer JSON
 */
const rawData = fs.readFileSync(INPUT_JSON, "utf8");
const jsonData = JSON.parse(rawData);

/**
 * Filtrar desde un ID hasta el final
 */
const filtered = jsonData.filter(
  (item) => item.id >= FROM_ID
);

/**
 * Ordenar por id por seguridad
 */
filtered.sort((a, b) => a.id - b.id);

if (filtered.length === 0) {
  console.log("No se encontraron datos desde ese ID.");
  process.exit(0);
}

/**
 * Divide array en grupos de 15
 */
function chunkArray(arr, size) {
  const chunks = [];

  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }

  return chunks;
}

const chunks = chunkArray(filtered, ROWS_PER_TABLE);

/**
 * Escapar caracteres problemáticos en markdown
 */
function escapeMarkdown(text = "") {
  return String(text)
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ")
    .trim();
}

/**
 * Generar fila markdown
 */
function generateRow(item) {
  const grammar = Array.isArray(item.grammar)
    ? item.grammar.join(", ")
    : "";

  const phonetic = [
    item.phoneticIpa || "",
    item.phoneticSimple || "",
  ]
    .filter(Boolean)
    .join(" ");

  const word = item.displayWord || item.word || "";

 const audio = item.audio || "";

  return `| ${escapeMarkdown(grammar)} | ${escapeMarkdown(
  phonetic
)} | ${escapeMarkdown(word)} | ${escapeMarkdown(
  item.translation || ""
)} | ${audio} | < | < | ${escapeMarkdown(
  item.example || ""
)} | ${escapeMarkdown(item.usage || "")} | ${item.id} |`;
}

/**
 * Crear archivos markdown
 */
chunks.forEach((chunk, index) => {
  const tableNumber = index + 1;

const header = [
  "| Part of speech | Phonetics | Words | Translation | Audio | ​ | ​ | Example | Application | # |",
  "| --- | --------- | -------- | ---------- | ----- | --- | --- | -------- | --- | --- |",
];

  const rows = chunk.map(generateRow);

  const markdown = [...header, ...rows].join("\n");

  const fileName = `${tableNumber}-Lista.md`;
  const filePath = path.join(
    OUTPUT_FOLDER,
    fileName
  );

  fs.writeFileSync(filePath, markdown, "utf8");

  console.log(`Creado: ${fileName}`);
});

console.log(
  `\nListo. Se generaron ${chunks.length} archivo(s).`
);