import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const AUDIO_FOLDER = path.resolve("./audio");

const {
  ELEVENLABS_API_KEY,
  VOICE_ID_1,
  VOICE_ID_2,
  VOICE_ID_3,
  JSON_FILE,
  MODEL_ID,
  START_ID,
} = process.env;

if (!ELEVENLABS_API_KEY) {
  throw new Error("Falta ELEVENLABS_API_KEY en .env");
}

const VOICES = [VOICE_ID_1, VOICE_ID_2, VOICE_ID_3].filter(Boolean);

if (VOICES.length !== 3) {
  throw new Error("Debes configurar las 3 voces en el .env");
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureAudioFolder() {
  await fs.mkdir(AUDIO_FOLDER, { recursive: true });
}

async function loadJson() {
  const file = await fs.readFile(JSON_FILE, "utf-8");
  return JSON.parse(file);
}

async function generateAudio(text, voiceId, outputPath) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID || "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Error ElevenLabs (${response.status}): ${errorText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await fs.writeFile(outputPath, buffer);
}

async function main() {
  await ensureAudioFolder();

  const phrases = await loadJson();

  let generated = 0;
  let skipped = 0;

  for (let i = 0; i < phrases.length; i++) {
    const item = phrases[i];
    const startId = Number(START_ID || 1);

    if (item.id < startId) {
      continue;
    }

    if (!item?.id || !item?.example) {
      console.log(
        `Saltando item inválido en índice ${i}`
      );
      continue;
    }

    const fileName = `A1-Frase-${item.id}.mp3`;
    const outputPath = path.join(
      AUDIO_FOLDER,
      fileName
    );

    const alreadyExists = await fileExists(outputPath);

    if (alreadyExists) {
      skipped++;
      console.log(`⏭ Ya existe: ${fileName}`);
      continue;
    }

    const voiceId = VOICES[i % VOICES.length];

    console.log(
      `Generando ${fileName} con voz ${
        (i % VOICES.length) + 1
      }`
    );

    try {
      await generateAudio(
        item.example,
        voiceId,
        outputPath
      );

      generated++;

      console.log(`✓ Generado: ${fileName}`);
    } catch (err) {
      console.error(
        `✗ Error en ${fileName}:`,
        err.message
      );
    }
  }

  console.log("\n===== RESUMEN =====");
  console.log(`Generados: ${generated}`);
  console.log(`Saltados: ${skipped}`);
}

main().catch(console.error);