const fs = require("fs");
const path = require("path");

const folderPath = path.join(__dirname, "audios");

const files = fs.readdirSync(folderPath)
  .filter(file => file.endsWith(".mp3"))
  .map(file => {
    const match = file.match(/(\d+)(?=\.mp3$)/);

    return {
      file,
      number: match ? Number(match[1]) : -1
    };
  })
  .filter(item => item.number !== -1)
  .sort((a, b) => b.number - a.number); // mayor a menor

for (const { file, number } of files) {
  const newFileName = file.replace(
    /(\d+)(?=\.mp3$)/,
    String(number + 1)
  );

  fs.renameSync(
    path.join(folderPath, file),
    path.join(folderPath, newFileName)
  );

  console.log(`${file} -> ${newFileName}`);
}

console.log("Proceso terminado.");