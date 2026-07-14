import 'dotenv/config';
import express from 'express';
import { ingestVideo , ingestUploadedVideo} from './main.js';
import multer from 'multer';
import fs from 'fs';         
import path from 'path';  
import { answerQuestion } from './query.js';
import cors from 'cors';

if (process.env.YT_COOKIES) {
  fs.writeFileSync(path.join(process.cwd(), "cookies.txt"), process.env.YT_COOKIES);
  console.log("cookies.txt created from env variable");
}

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
  dest: 'temp/',
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB cap, adjust as needed
});

// ---- Upload/ingest a video ----
app.post('/api/videos/upload', async (req, res) => {
  const { youtubeUrl } = req.body;
  

  try {
    const result = await ingestVideo(youtubeUrl);
    // console.log(result);
    return res.status(200).json({
      success: true,
      message: 'Video uploaded successfully',
      chunkCount: result.chunkCount,
      summary: result.summary,
      title: result.title, 
    });
  } catch (err) {
    console.error('Upload failed:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Something went wrong processing the video',
    });
  }
  // for public video 

});

// ---- NEW: Upload/ingest a local video file ----
app.post('/api/videos/upload-file', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    const result = await ingestUploadedVideo(req.file.path, req.file.originalname);
    return res.status(200).json({
      success: true,
      message: 'Video uploaded successfully',
      chunkCount: result.chunkCount,
      summary: result.summary,
      title: result.title,
    });
  } catch (err) {
    console.error('File upload failed:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Something went wrong processing the video',
    });
  }
});

// ---- Ask a question ----
app.post('/api/videos/query', async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ success: false, message: 'question is required' });
  }

  try {
    const answer = await answerQuestion(question);
    return res.status(200).json({ success: true, answer });
  } catch (err) {
    console.error('Query failed:', err);
    return res.status(500).json({ success: false, message: 'Failed to answer question' });
  }
});

// ---- generate a summary of the video ---- 
app.get('/api/videos/summary', async (req, res) => {
  try {
    const answer = await answerQuestion("generate a Summary of the video ");
    return res.status(200).json({ success: true, summary: answer });
  } catch (err) {
    console.error('Summary generation failed:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate summary' });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

