import 'dotenv/config';
import { YoutubeTranscript } from "youtube-transcript";
import { SentenceSplitter } from "llamaindex";
// import { OllamaEmbedding } from "@llamaindex/ollama";
import { GoogleGenAI } from "@google/genai";
import { saveChunks } from "./storage.js";
import { callGroq } from "./query.js";
import { downloadAudio , extractAudioFromVideo } from "./audio.js";

import { transcribeAudio } from "./transcribeAudio.js";
import fs from "fs";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

export async function generateEmbedding(text) {

    const response = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: text,
    });

    return response.embeddings[0].values;
}
// const embedModel = new OllamaEmbedding({
//   model: "nomic-embed-text",
// });
// const embedModel = {
//   async getTextEmbedding(text) {
//     console.log("OLLAMA_API_KEY exists:", !!process.env.OLLAMA_API_KEY);
//     console.log(
//       "OLLAMA_API_KEY preview:",
//       process.env.OLLAMA_API_KEY
//         ? process.env.OLLAMA_API_KEY.substring(0, 10) + "..."
//         : "Not Found"
//     );
//     const response = await fetch("http://localhost:11434/api/embed", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${process.env.OLLAMA_API_KEY}`,
//       },
      
//       body: JSON.stringify({
//         model: "embeddinggemma",
//         input: text,
//       }),
//     });
//         console.log("Response Status:", response.status);
//     console.log("Response Status Text:", response.statusText);

//     if (!response.ok) {
//       const errText = await response.text();
  
//   console.log("Response Body:", errText);

//       throw new Error(`Ollama embedding failed: ${response.status} ${errText}`);
//     }

//     const data = await response.json();
//     return data.embeddings[0];
//   },
// };


// -------------------------
// Chunk Transcript (caption path — has timestamps)
// -------------------------
function chunkTranscript(segments, chunkSize = 200, chunkOverlap = 20) {
  let fullText = "";
  const segmentPositions = [];

  for (const seg of segments) {
    segmentPositions.push({
      charStart: fullText.length,
      offset: seg.offset,
      duration: seg.duration,
    });

    fullText += seg.text + " ";
  }

  const splitter = new SentenceSplitter({ chunkSize, chunkOverlap });
  const textChunks = splitter.splitText(fullText);

  const chunks = [];
  let searchPos = 0;

  for (const chunkText of textChunks) {
    const charStart = fullText.indexOf(chunkText, searchPos);
    if (charStart === -1) continue;

    const charEnd = charStart + chunkText.length;
    searchPos = charStart + 1;

    const covering = segmentPositions.filter(
      (p) => p.charStart >= charStart && p.charStart < charEnd
    );

    if (covering.length === 0) continue;

    const first = covering[0];
    const last = covering[covering.length - 1];

    chunks.push({
      text: chunkText.trim(),
      start: first.offset / 1000,
      end: (last.offset + last.duration) / 1000,
    });
  }

  return chunks;
}

// -------------------------
// Chunk Plain Text (audio/Whisper path — no timestamps)
// -------------------------
function chunkPlainText(text, chunkSize = 200, chunkOverlap = 20) {
  const splitter = new SentenceSplitter({ chunkSize, chunkOverlap });
  const textChunks = splitter.splitText(text);

  return textChunks.map((chunkText) => ({
    text: chunkText.trim(),
    start: null,
    end: null,
  }));
}

// -------------------------
// Validate URL
// -------------------------
function isValidYoutubeUrl(url) {
  const pattern =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
  return pattern.test(url);
}

function getVideoId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  return match ? match[1] : null;
}

// -------------------------
// SHARED PIPELINE: chunks -> embeddings -> store -> summary
// (used by BOTH YouTube path and uploaded-file path)
// -------------------------
async function processChunksAndSummarize(chunks, title) {
  // Generate Embeddings
  for (const chunk of chunks) {
    // chunk.embedding = await embedModel.getTextEmbedding(chunk.text);
    chunk.embedding = await generateEmbedding(chunk.text);
  }

  // Store in ChromaDB
  await saveChunks(chunks);

  // Generate Summary
  const summaryPrompt = `You are an expert at analyzing transcripts and extracting their structure.

Your task is to generate a hierarchical outline of the provided content.

Instructions:
1. Read the entire content carefully.
2. Identify the main topics discussed.
3. Organize them into:
   - Main Headings
   - Subheadings
   - Nested Subheadings (if applicable)
4. Do NOT include any explanations, descriptions, summaries, or body text.
5. keep each point in next line
6. Do Not use any special characters like #,@

Output Format:

 Main Heading 1
- Subheading 1.1
  - Subheading 1.1.1
- Subheading 1.2
next line

 Main Heading 2
- Subheading 2.1
- Subheading 2.2
next line

 Main Heading 3
- Subheading 3.1

Only output the outline. Do not include introductions, conclusions, notes, or any additional text.


Context:

${chunks.map((c) => c.text).join("\n\n")}
`;

  const summary = await callGroq(summaryPrompt);

  return {
    chunkCount: chunks.length,
    summary,
    title,
  };
}

// -------------------------
// Main Function — YouTube
// -------------------------
export async function ingestVideo(youtubeUrl) {
  if (!youtubeUrl || !isValidYoutubeUrl(youtubeUrl)) {
    const err = new Error("Invalid YouTube URL");
    err.statusCode = 400;
    throw err;
  }

  const response = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`
  );

  if (!response.ok) {
    throw new Error("Could not fetch video details");
  }

  const videoInfo = await response.json();

  let rawTranscript = null;
  try {
    const fetched = await YoutubeTranscript.fetchTranscript(youtubeUrl);
    if (fetched && fetched.length > 0) {
      rawTranscript = fetched;
    }
  } catch (err) {
    rawTranscript = null;
  }

  let chunks;

  if (rawTranscript) {
    chunks = chunkTranscript(rawTranscript);
  } else {
    const videoId = getVideoId(youtubeUrl);
    if (!videoId) {
      const err = new Error("Unable to extract video ID.");
      err.statusCode = 400;
      throw err;
    }

    const audioPath = await downloadAudio(youtubeUrl, videoId);

    let transcriptText;
    try {
      transcriptText = await transcribeAudio(audioPath);
    } finally {
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    }

    if (!transcriptText || transcriptText.trim().length === 0) {
      const err = new Error("Could not generate transcript from audio");
      err.statusCode = 422;
      throw err;
    }

    chunks = chunkPlainText(transcriptText);
  }

  return processChunksAndSummarize(chunks, videoInfo.title);
}

// -------------------------
// NEW: Main Function — Uploaded File
// -------------------------
export async function ingestUploadedVideo(videoPath, originalName) {
  let audioPath;

  try {
    // Extract audio from the uploaded video file
    audioPath = await extractAudioFromVideo(videoPath);

    const transcriptText = await transcribeAudio(audioPath);

    if (!transcriptText || transcriptText.trim().length === 0) {
      const err = new Error("Could not generate transcript from uploaded video");
      err.statusCode = 422;
      throw err;
    }

    const chunks = chunkPlainText(transcriptText);

    return await processChunksAndSummarize(chunks, originalName);
  } finally {
    // Clean up both the uploaded video and the extracted audio
    if (audioPath && fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
  }
}