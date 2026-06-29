const fs = require("fs");

const data = JSON.parse(fs.readFileSync("phrases.json", "utf8"));

for (const item of data) {
  if (typeof item.audio === "string") {
    item.audio = item.audio.replace(
      /^frase-(.+)\.mp3$/i,
      (_, id) => `A1-Frase-${id}.mp3`
    );
  }
}

fs.writeFileSync("data.json", JSON.stringify(data, null, 2));

console.log("Done!");