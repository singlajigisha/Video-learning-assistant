import { exec } from "child_process";
import ytdlp from 'yt-dlp-exec';
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import path from "path";
import fs from "fs";

ffmpeg.setFfmpegPath(ffmpegInstaller.path); 
// Create temp directory if it doesn't exist
function ensureTempDir() {
  const tempDir = path.join(process.cwd(), "temp");

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  return tempDir;
}

// Extract audio from a local video

function extractAudioFromVideo(videoPath) {
  return new Promise((resolve, reject) => {
    const tempDir = ensureTempDir();
    const baseName = path.basename(videoPath, path.extname(videoPath));
    const outputPath = path.join(tempDir, `${baseName}-audio.mp3`);

    ffmpeg(videoPath)
      .noVideo()
      .audioCodec("libmp3lame")
      .audioChannels(1)
      .audioFrequency(16000)
      .audioBitrate("64k")
      .on("end", () => {
        console.log("Audio extracted:", outputPath);
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err.message);
        reject(err);
      })
      .save(outputPath);
  });
}


// Download audio from YouTube
async function downloadAudio(youtubeUrl, videoId) {
  const tempDir = ensureTempDir();

  const outputTemplate = path.join(tempDir, `${videoId}.%(ext)s`);

  await ytdlp(youtubeUrl, {
    extractAudio: true,
    audioFormat: "mp3",
    output: outputTemplate,
    cookies: path.join(process.cwd(), "cookies.txt"),
    extractorArgs: "youtube:player_client=android",
  });

  return path.join(tempDir, `${videoId}.mp3`);
}


export {
  extractAudioFromVideo,
  downloadAudio,
};















