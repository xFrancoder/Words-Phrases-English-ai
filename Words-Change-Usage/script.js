import "dotenv/config";
import fs from "fs/promises";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = "gemini-2.5-flash";
const BATCH_SIZE = 50;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL });

async function save(words) {
  await fs.writeFile(
    "./words.json",
    JSON.stringify(words, null, 2),
    "utf8"
  );
}

const words = JSON.parse(
  await fs.readFile("./words.json", "utf8")
);

const pendingItems = words.filter(
  item => item.usage && !item._translated
);

for (let i = 0; i < pendingItems.length; i += BATCH_SIZE) {
  const batch = pendingItems.slice(i, i + BATCH_SIZE);

  const usages = batch.map(item => item.usage);

  const prompt = `
Translate each Spanish usage explanation into natural English.

Rules:
- Return ONLY a valid JSON array.
- Keep the same meaning.
- Do not add explanations.
- Do not add markdown.
- The output array must have the same number of items as the input array.

Input:
${JSON.stringify(usages, null, 2)}
`;

  try {
    const result = await model.generateContent(prompt);

    let text = result.response.text().trim();

    text = text.replace(/^```json\s*/i, "");
    text = text.replace(/^```\s*/i, "");
    text = text.replace(/\s*```$/i, "");

    const translations = JSON.parse(text);

    if (translations.length !== batch.length) {
      throw new Error(
        `Expected ${batch.length} translations but got ${translations.length}`
      );
    }

    batch.forEach((item, index) => {
      item.usage = translations[index];
      item._translated = true;
    });

    await save(words);

    console.log(
      `Translated ${Math.min(i + BATCH_SIZE, pendingItems.length)}/${pendingItems.length}`
    );
  } catch (error) {
    console.error("Batch failed:", error);
    process.exit(1);
  }
}

console.log("All usage values translated.");