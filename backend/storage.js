import client from "./connection.js";

// const collection = await client.getOrCreateCollection({
//     name: "youtube-transcripts",

// });
const COLLECTION_NAME = "youtube-transcripts";

async function resetCollection() {
  try {
    await client.deleteCollection({ name: COLLECTION_NAME });
  } catch (err) {
    // ignore error if collection does not exist yet
  }

  return await client.getOrCreateCollection({
    name: COLLECTION_NAME,
  });
}

export async function saveChunks(chunks) {
  const collection = await resetCollection();

  await collection.add({
    ids: chunks.map((_, i) => `chunk-${i}`),
    documents: chunks.map((c) => c.text),
    embeddings: chunks.map((c) => c.embedding),
  });

  const count = await collection.count();
  const result = await collection.get({
    include: ["documents", "embeddings"],
  });
  // console.log("Stored ids:", result.ids);
  // console.log("Stored chunks:", count);

  // console.log("Stored documents:", result.documents.length);
  // console.log("Embedding dimensions:", result.embeddings.map(e => e.length));
}
export async function searchChunks(queryEmbedding, limit = 5) {
  const collection = await client.getOrCreateCollection({
    name: COLLECTION_NAME,
  });
  const result = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: limit,
  });
  return result;
}
// const collections = await client.listCollections();

// console.log(collections);
