const fs = require("fs");

// Load files
const json1 = JSON.parse(fs.readFileSync("json1.json", "utf8"));
const json2 = JSON.parse(fs.readFileSync("json2.json", "utf8"));

// Create lookup table by ID
const examplesById = new Map(
  json1.map(item => [item.id, item.example])
);

// Replace only the example property
for (const item of json2) {
  if (examplesById.has(item.id)) {
    item.example = examplesById.get(item.id);
  }
}

// Save result
fs.writeFileSync(
  "json2-updated.json",
  JSON.stringify(json2, null, 2),
  "utf8"
);

console.log("Done!");