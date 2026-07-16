import{ CloudClient } from 'chromadb';

const client = new CloudClient({
  apiKey: process.env.CHROMA_API_KEY,
  tenant: process.env.CHROMA_TENANT,
  database: process.env.CHROMA_DATABASE,
});

export default client;

// const collection = await client.getOrCreateCollection({ name: "video_transcripts" });



// import { ChromaClient } from "chromadb";

// const client = new ChromaClient({
//     host: "localhost",
//     port: 8000,
//     ssl: false,
// });




