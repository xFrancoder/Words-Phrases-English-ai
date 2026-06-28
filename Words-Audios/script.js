const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const API_KEY = process.env.ELEVENLABS_API_KEY;

const VOICE_IDS = [
  process.env.VOICE_ID_1,
  process.env.VOICE_ID_2,
  process.env.VOICE_ID_3
].filter(Boolean);

if (!API_KEY) {
  throw new Error("Falta ELEVENLABS_API_KEY en .env");
}

if (VOICE_IDS.length === 0) {
  throw new Error("No agregaste voces en .env");
}

// CONFIG
const JSON_PATH = "./data.json";

// rango (incluidos)
const START_ID = 666;
const END_ID = 719;

async function generateAudio(text, fileName, voiceId) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const response = await axios.post(
    url,
    {
      text,
      model_id: "eleven_multilingual_v2",

      voice_settings: {
        stability: 0.75,
        similarity_boost: 0.95,
        style: 0,
        use_speaker_boost: true,
        speed: 1.05
      }
    },
    {
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg"
      },
      responseType: "arraybuffer"
    }
  );

  const outputPath = path.join("audios", fileName);

  await fs.writeFile(outputPath, response.data);
}

async function main() {
  await fs.mkdir("audios", { recursive: true });

  const file = await fs.readFile(JSON_PATH, "utf8");
  const data = JSON.parse(file);

  const filtered = data.filter(
    item =>
      item.id >= START_ID &&
      item.id <= END_ID &&
      item.example?.trim()
  );

  console.log(`Se generarán ${filtered.length} audios...`);

  for (let index = 0; index < filtered.length; index++) {
    const item = filtered[index];

    try {
      // rotación: 0 → 1 → 2 → 0 → 1 → 2
      const voiceIndex = index % VOICE_IDS.length;
      const voiceId = VOICE_IDS[voiceIndex];

      const fileName = `A1-Words-${item.id}.mp3`;

      await generateAudio(
        item.example,
        fileName,
        voiceId
      );

      console.log(
        `✓ ID ${item.id} | voz ${voiceIndex + 1}`
      );
    } catch (error) {
      console.error(`Error con ID ${item.id}`);

      try {
        const errorData = error.response?.data;

        if (Buffer.isBuffer(errorData)) {
          console.error(
            JSON.parse(errorData.toString("utf8"))
          );
        } else {
          console.error(errorData);
        }
      } catch {
        console.error(error.message);
      }
    }
  }

  console.log("Proceso terminado.");
}

main().catch(console.error);