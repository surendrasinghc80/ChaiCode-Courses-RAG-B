import fs from "fs";
import path from "path";
import { parseVTT } from "../services/vttParser.js";
import { chunkSegments } from "../utils/chunking.js";
import { embedText } from "../services/embedding.service.js";
import { upsertMany, query } from "../db/vectorDB.js";
import { openai } from "../config/openai.js";
import { buildSystemPrompt, buildUserPrompt } from "../utils/prompts.js";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const CHAT_MODEL = process.env.CHAT_MODEL || "gpt-4.1-mini";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

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

    // Use authenticated user ID from middleware
    const currentUserId = req.user.id;

    // Store user question in database for RAG context
    const userChat = await Chat.create({
      conversationId: `rag_${currentUserId}_${Date.now()}`,
      userId: currentUserId,
      message: question,
      role: "user",
      metadata: {
        section: section || "general",
        ragQuery: true,
      },
    });

    // Get previous questions from this user for better context
    const previousQuestions = await Chat.findAll({
      where: {
        userId: currentUserId,
        role: "user",
      },
      order: [["timestamp", "DESC"]],
      limit: 3,
    });

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

    // Add previous questions context for better responses
    const previousContext =
      previousQuestions.length > 0
        ? `\n\nPrevious questions from this user:\n${previousQuestions
            .map((q) => `- ${q.message}`)
            .join("\n")}`
        : "";

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(
      question,
      contextBlocks + previousContext
    );

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

    // Store AI response in database
    await Chat.create({
      conversationId: userChat.conversationId,
      userId: currentUserId,
      message: answer,
      role: "assistant",
      metadata: {
        section: section || "general",
        ragResponse: true,
        tokensUsed: completion.usage?.total_tokens || 0,
        model: CHAT_MODEL,
        referencesCount: hits.length,
      },
      vectorId: hits.length > 0 ? hits[0].id : null,
    });

    return res.json({
      answer,
      userId: currentUserId,
      conversationId: userChat.conversationId,
      references: hits.map((h) => ({
        section: h.metadata.section,
        file: h.metadata.file,
        start: h.metadata.start,
        end: h.metadata.end,
        score: h.score,
      })),
      usage: {
        tokensUsed: completion.usage?.total_tokens || 0,
        previousQuestions: previousQuestions.length,
      },
    });
  } catch (err) {
    console.error("/ask error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// Get RAG usage statistics
export const getRagStats = async (req, res) => {
  try {
    const { userId } = req.params;
    // Use authenticated user's ID if no specific userId provided
    const targetUserId = userId || req.user.id;
    const whereClause = { userId: targetUserId };

    const stats = await Chat.findAll({
      where: {
        ...whereClause,
        metadata: {
          ragQuery: true,
        },
      },
      attributes: [
        [
          Chat.sequelize.fn("COUNT", Chat.sequelize.col("id")),
          "totalQuestions",
        ],
        [
          Chat.sequelize.fn(
            "COUNT",
            Chat.sequelize.fn("DISTINCT", Chat.sequelize.col("userId"))
          ),
          "uniqueUsers",
        ],
        [
          Chat.sequelize.fn(
            "AVG",
            Chat.sequelize.literal("JSON_EXTRACT(metadata, '$.tokensUsed')")
          ),
          "avgTokensPerQuery",
        ],
        [
          Chat.sequelize.fn(
            "SUM",
            Chat.sequelize.literal("JSON_EXTRACT(metadata, '$.tokensUsed')")
          ),
          "totalTokensUsed",
        ],
      ],
      raw: true,
    });

    // Get most asked sections
    const sectionStats = await Chat.findAll({
      where: {
        ...whereClause,
        role: "user",
      },
      attributes: [
        [
          Chat.sequelize.literal("JSON_EXTRACT(metadata, '$.section')"),
          "section",
        ],
        [Chat.sequelize.fn("COUNT", Chat.sequelize.col("id")), "questionCount"],
      ],
      group: [Chat.sequelize.literal("JSON_EXTRACT(metadata, '$.section')")],
      order: [[Chat.sequelize.fn("COUNT", Chat.sequelize.col("id")), "DESC"]],
      limit: 5,
      raw: true,
    });

    res.json({
      success: true,
      data: {
        overview: stats[0],
        topSections: sectionStats,
      },
    });
  } catch (error) {
    console.error("Error fetching RAG stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch RAG statistics",
      error: error.message,
    });
  }
};

// User Signup
export const signup = async (req, res) => {
  try {
    const { username, email, password, age, city } = req.body;

    // Validation
    if (!username || !email || !password || !age || !city) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are required: username, email, password, age, city",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      age: parseInt(age),
      city,
    });

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          age: user.age,
          city: user.city,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
};

// User Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          age: user.age,
          city: user.city,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};
