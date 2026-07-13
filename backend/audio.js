import { exec } from "child_process";
import path from "path";
import fs from "fs";

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

    exec(
      `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -ac 1 -ar 16000 -b:a 64k "${outputPath}" -y`,
      (error, stdout, stderr) => {
        if (error) {
          console.error("FFmpeg error:", stderr);
          return reject(error);
        }

        console.log("Audio extracted:", outputPath);
        resolve(outputPath);
      }
    );
  });
}

// Download audio from YouTube
function downloadAudio(youtubeUrl, videoId) {
  return new Promise((resolve, reject) => {
    const tempDir = ensureTempDir();

    const outputTemplate = path.join(tempDir, `${videoId}.%(ext)s`);
    const finalPath = path.join(tempDir, `${videoId}.mp3`);

    exec(
      `yt-dlp -x --audio-format mp3 "${youtubeUrl}" -o "${outputTemplate}"`,
      (error, stdout, stderr) => {
        if (error) {
          console.error("yt-dlp error:", stderr);
          return reject(error);
        }

        console.log("Audio downloaded:", finalPath);
        resolve(finalPath);
      }
    );
  });
}

export {
  extractAudioFromVideo,
  downloadAudio,
};

// import { exec } from "child_process";
// import path from "path";
// import fs from "fs";

// function downloadAudio(youtubeUrl, videoId) {
//   return new Promise((resolve, reject) => {
//     const tempDir = path.join(process.cwd(), "temp");
//     if (!fs.existsSync(tempDir)) {
//       fs.mkdirSync(tempDir, { recursive: true });
//     }

//     const outputPath = path.join(tempDir, `${videoId}.%(ext)s`);
//     const finalPath = path.join(tempDir, `${videoId}.mp3`);

//     exec(
//       `yt-dlp -x --audio-format mp3 "${youtubeUrl}" -o "${outputPath}"`,
//       (error, stdout, stderr) => {
//         if (error) {
//           console.error("yt-dlp error:", stderr);
//           return reject(error);
//         }
//         console.log("Audio downloaded:", finalPath);
//         resolve(finalPath);
//       }
//     );
//   });
// }

// export { downloadAudio };














