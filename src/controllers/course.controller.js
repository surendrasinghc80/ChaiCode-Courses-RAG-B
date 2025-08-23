import fs from "fs";
import path from "path";
import { parseVTT } from "../services/vttParser.js";
import { chunkSegments } from "../utils/chunking.js";
import { embedText } from "../services/embedding.service.js";
import { upsertMany, query } from "../db/vectorDB.js";
import { openai } from "../config/openai.js";
import dotenv from "dotenv";
dotenv.config();

const CHAT_MODEL = process.env.CHAT_MODEL || "gpt-4.1-mini";

// allowed sections for validation
const VALID_SECTIONS = [
  "Normal Node",
  "Authentication",
  "Basics of System Design",
];

function parseSectionName(fileName) {
  const base = path.basename(fileName, ".vtt"); // "01-node-introduction"
  const parts = base.split("-");
  if (parts.length > 1) parts.shift(); // remove "01"
  const section = parts.join(" ");
  // Capitalize each word
  return section
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const uploadVtt = async (req, res) => {
  try {
    const { section } = req.body;
    const sec = parseSectionName(req.files[0].originalname) || "Unknown";

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const globalRecords = [];
    const fileReports = [];

    // process each file
    for (const file of req.files) {
      try {
        const content = fs.readFileSync(file.path, "utf-8");
        fs.unlinkSync(file.path); // cleanup early

        const segments = parseVTT(content);
        const chunks = chunkSegments(segments, { windowSeconds: 45 });

        // embed all chunks in parallel
        const embeddings = await Promise.allSettled(
          chunks.map((ch) =>
            ch.text.trim() ? embedText(ch.text) : Promise.resolve(null)
          )
        );

        const records = [];
        embeddings.forEach((res, idx) => {
          if (res.status === "fulfilled" && res.value) {
            records.push({
              embedding: res.value,
              text: chunks[idx].text,
              metadata: {
                section: sec,
                file: file.originalname,
                start: chunks[idx].start,
                end: chunks[idx].end,
              },
            });
          }
        });

        if (records.length > 0) {
          await upsertMany(records);
          globalRecords.push(...records);
        }

        fileReports.push({
          file: file.originalname,
          chunks: records.length,
        });
      } catch (err) {
        console.error(`Error processing file ${file.originalname}:`, err);
        fileReports.push({
          file: file.originalname,
          error: err.message,
        });
      }
    }

    return res.json({
      section: sec,
      totalInserted: globalRecords.length,
      files: fileReports,
    });
  } catch (err) {
    console.error("/upload-vtt error:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const askQuestion = async (req, res) => {
  try {
    const { question, section } = req.body;
    if (!question) {
      return res.status(400).json({ error: "question is required" });
    }

    // embed query
    const qEmbedding = await embedText(question);

    // retrieve from vector DB (Qdrant under the hood)
    const hits = await query(qEmbedding, {
      topK: 5,
      filter: section ? { section } : {},
    });

    const contextBlocks = hits
      .map(
        (h, idx) =>
          `[#${idx + 1}] [Section: ${h.metadata.section}] [File: ${
            h.metadata.file
          }] [Time: ${h.metadata.start} → ${h.metadata.end}]\n${h.text}`
      )
      .join("\n\n");

    const systemPrompt = `You are a helpful teaching assistant for a Node.js video course. Answer ONLY using the provided transcript excerpts. Always:
- Cite the relevant timestamp ranges and section names.
- If code was mentioned, reproduce it as Markdown fenced code.
- Be concise and accurate. If unsure, say you don't have enough context.`;

    const userPrompt = `Student question: "${question}"\n\nRelevant course context:\n\n${contextBlocks}\n\nAnswer the student using only the above context. Include the best timestamps and section names.`;

    if (!openai.apiKey) throw new Error("OPENAI_API_KEY not set");

    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    });

    const answer =
      completion.choices?.[0]?.message?.content || "No answer generated.";

    return res.json({
      answer,
      references: hits.map((h) => ({
        section: h.metadata.section,
        file: h.metadata.file,
        start: h.metadata.start,
        end: h.metadata.end,
        score: h.score,
      })),
    });
  } catch (err) {
    console.error("/ask error:", err);
    return res.status(500).json({ error: err.message });
  }
};
