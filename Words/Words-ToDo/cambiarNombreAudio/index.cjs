const fs = require("fs");
const path = require("path");

const folderPath = "./audios"; // Cambia por la ruta de tu carpeta

const files = fs.readdirSync(folderPath);

for (const file of files) {
  const match = file.match(/^1-(\d+)\.mp3$/i);

  if (!match) continue;

  const number = match[1];

  const oldPath = path.join(folderPath, file);
  const newPath = path.join(
    folderPath,
    `A1-Words-${number}.mp3`
  );

  fs.renameSync(oldPath, newPath);

  console.log(`${file} -> A1-Words-${number}.mp3`);
}

console.log("Proceso completado.");