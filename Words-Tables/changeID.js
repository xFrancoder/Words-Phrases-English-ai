const fs = require("fs");

const filePath = "./test.json";

// Read JSON
const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

// Add 1 to every id
data.forEach(obj => {
  //obj.id += 1;
  obj.audio = `![[1-${obj.id}.mp3]]`
});

// Save back to the same file
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

console.log("IDs updated successfully.");