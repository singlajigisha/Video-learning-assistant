import 'dotenv/config';
import { searchChunks } from "./storage.js";     
import { Groq } from 'groq-sdk';                   

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const embedModel = {
  async getTextEmbedding(text) {
    const response = await fetch("https://ollama.com/api/embed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: "nomic-embed-text",
        input: text,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama embedding failed: ${response.status} ${errText}`);
    }

    const data = await response.json();
    return data.embeddings[0];
  },
};



// ---- Prompt banane ka function ----
function buildPrompt(question, chunks) {
    const context = chunks.join("\n\n");

    return `You are a helpful assistant answering questions about a YouTube video transcript.
Use only the following context to answer the question.
If the answer isn't in the context, say you don't know.
- Give a complete and beginner-friendly explanation.
- Explain the concept instead of giving only a definition or full form.

Context:
${context}

Question: ${question}
Answer:`;
}

// ---- Groq ko call karne ka function ----
 export async function callGroq(prompt) {
    const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
    });

    return response.choices[0].message.content;
}


// ---- Poora pipeline ek function mein ----
export async function answerQuestion(question) {
    // 1. Question ka embedding
    const questionEmbedding = await embedModel.getTextEmbedding(question);

    // 2. Similarity search
    const result = await searchChunks(questionEmbedding);
    // console.log("Search result:", result);
    const chunks = result.documents[0];   // top 5 matching texts

    // console.log("Retrieved chunks:",chunks);

    // chunks.forEach((c, i) => console.log(`  ${i + 1}. ${c.slice(0, 60)}...`));

    // 3. Prompt build karo
    const prompt = buildPrompt(question, chunks);

    // 4. Groq ko bhejo
    const answer = await callGroq(prompt);

    return answer;
}