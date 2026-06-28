const fs = require("fs");
const path = require("path");

const folderPath = "./audios"; // change to your folder

const files = fs.readdirSync(folderPath);

for (const file of files) {
  const match = file.match(/^frase-(\d+)\.mp3$/i);

  if (match) {
    const id = match[1];

    const oldPath = path.join(folderPath, file);
    const newPath = path.join(folderPath, `A1-Frase-${id}.mp3`);

    fs.renameSync(oldPath, newPath);

    console.log(`${file} -> A1-Frase-${id}.mp3`);
  }
}

console.log("Done!");