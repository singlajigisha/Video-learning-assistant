import 'dotenv/config';
import { Groq } from 'groq-sdk';
import fs from 'fs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function transcribeAudio(filePath) {
  // File size check — Groq Whisper bhi 25MB limit follow karta hai
  const stats = fs.statSync(filePath);
  const fileSizeMB = stats.size / (1024 * 1024);
  if (fileSizeMB > 25) {
    throw new Error(`Audio file too large: ${fileSizeMB.toFixed(2)}MB (limit: 25MB)`);
  }

  const transcription = await groq.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: "whisper-large-v3",
    response_format: "text",
  });

  return transcription;
}

export { transcribeAudio };
