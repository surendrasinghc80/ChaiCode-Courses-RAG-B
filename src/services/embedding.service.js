import { openai } from "../config/openai.js";
import dotenv from "dotenv";
dotenv.config();

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

export async function embedText(text) {
  if (!openai.apiKey) {
    throw new Error("OPENAI_API_KEY not set");
  }
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return res.data[0].embedding;
}
