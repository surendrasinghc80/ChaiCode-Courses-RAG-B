import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.warn(
    "[openai] OPENAI_API_KEY is not set. Embedding and LLM calls will fail until it's provided."
  );
}

export const openai = new OpenAI({ apiKey });
