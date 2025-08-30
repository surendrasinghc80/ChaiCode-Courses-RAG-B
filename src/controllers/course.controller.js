import fs from "fs";
import path from "path";
import { parseVTT } from "../services/vttParser.js";
import { chunkSegments } from "../utils/chunking.js";
import { embedText } from "../services/embedding.service.js";
import { upsertMany, query } from "../db/vectorDB.js";
import { openai } from "../config/openai.js";
import { buildSystemPrompt, buildUserPrompt } from "../utils/prompts.js";
import { Chat, User, Conversation, Course, UserCourse } from "../models/index.js";
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

// Create a new course (admin only)
export const createCourse = async (req, res) => {
  try {
    const { id, title, description, topic, difficulty, duration, price } = req.body;
    const createdBy = req.user.id;

    // Validation
    if (!id || !title || !topic) {
      return res.status(400).json({
        success: false,
        message: "Course ID, title, and topic are required",
      });
    }

    // Check if course ID already exists
    const existingCourse = await Course.findByPk(id);
    if (existingCourse) {
      return res.status(409).json({
        success: false,
        message: "Course with this ID already exists",
      });
    }

    // Create course
    const course = await Course.create({
      id,
      title,
      description,
      topic: topic.toLowerCase(),
      difficulty: difficulty || "beginner",
      duration: duration ? parseInt(duration) : null,
      price: price ? parseFloat(price) : 0.0,
      createdBy,
      metadata: {
        createdAt: new Date(),
        version: "1.0",
      },
    });

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: {
        course: {
          id: course.id,
          title: course.title,
          description: course.description,
          topic: course.topic,
          difficulty: course.difficulty,
          duration: course.duration,
          price: course.price,
          isActive: course.isActive,
          createdBy: course.createdBy,
        },
      },
    });
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create course",
      error: error.message,
    });
  }
};

// Get all courses (admin can see all, users see only active)
export const getAllCourses = async (req, res) => {
  try {
    const { page = 1, limit = 20, topic, difficulty, isActive } = req.query;
    const offset = (page - 1) * limit;
    const isAdmin = req.user.role === "admin";

    const whereClause = {};
    
    // Non-admin users can only see active courses
    if (!isAdmin) {
      whereClause.isActive = true;
    } else if (isActive !== undefined) {
      whereClause.isActive = isActive === "true";
    }

    if (topic) {
      whereClause.topic = topic.toLowerCase();
    }

    if (difficulty) {
      whereClause.difficulty = difficulty;
    }

    const courses = await Course.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "username", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        courses: courses.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(courses.count / limit),
          totalItems: courses.count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get courses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch courses",
      error: error.message,
    });
  }
};

// Upload VTT files for a specific course (admin only)
export const uploadVtt = async (req, res) => {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    // Verify course exists and is active
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (!course.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot upload VTT files to inactive course",
      });
    }

    const globalRecords = [];
    const fileReports = [];
    let totalVectorCount = 0;

    // Process each file
    for (const file of req.files) {
      try {
        const content = fs.readFileSync(file.path, "utf-8");
        fs.unlinkSync(file.path); // cleanup early

        const segments = parseVTT(content);
        const chunks = chunkSegments(segments, { windowSeconds: 45 });

        // Embed all chunks in parallel
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
                course_id: courseId,
                topic: course.topic,
                title: course.title,
                file_name: file.originalname,
                section: parseSectionName(file.originalname) || "Unknown",
                start_time: chunks[idx].start,
                end_time: chunks[idx].end,
                difficulty: course.difficulty,
              },
            });
          }
        });

        if (records.length > 0) {
          const courseInfo = {
            courseId: courseId,
            topic: course.topic,
            title: course.title,
          };
          
          const vectorCount = await upsertMany(records, courseInfo);
          totalVectorCount += vectorCount;
          globalRecords.push(...records);
        }

        fileReports.push({
          file: file.originalname,
          chunks: records.length,
          status: "success",
        });
      } catch (err) {
        console.error(`Error processing file ${file.originalname}:`, err);
        fileReports.push({
          file: file.originalname,
          error: err.message,
          status: "error",
        });
      }
    }

    // Update course statistics
    await course.increment("vttFileCount", { by: req.files.length });
    await course.increment("vectorCount", { by: totalVectorCount });

    return res.json({
      success: true,
      message: "VTT files uploaded and processed successfully",
      data: {
        courseId: courseId,
        courseTopic: course.topic,
        totalVectorsInserted: totalVectorCount,
        filesProcessed: req.files.length,
        files: fileReports,
      },
    });
  } catch (err) {
    console.error("/upload-vtt error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to upload VTT files",
      error: err.message,
    });
  }
};

export const askQuestion = async (req, res) => {
  try {
    const { question, section, conversationId } = req.body;
    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    // Use authenticated user ID from middleware
    const currentUserId = req.user.id;

    // Get user's accessible course IDs
    const userCourseIds = await UserCourse.findActiveCourseIds(currentUserId);
    
    if (userCourseIds.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to any courses. Please contact admin to get course access.",
      });
    }

    let targetConversationId = conversationId;

    // If no conversationId provided, create a new conversation
    if (!targetConversationId) {
      const newConversation = await Conversation.create({
        userId: currentUserId,
        title:
          question.length > 50 ? question.substring(0, 50) + "..." : question,
        lastMessageAt: new Date(),
        metadata: {
          section: section || "general",
          ragEnabled: true,
          courseIds: userCourseIds,
        },
      });
      targetConversationId = newConversation.id;
    } else {
      // Verify conversation belongs to user and update lastMessageAt
      const conversation = await Conversation.findOne({
        where: {
          id: targetConversationId,
          userId: currentUserId,
          isActive: true,
        },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found or access denied",
        });
      }

      await conversation.update({ lastMessageAt: new Date() });
    }

    // Store user question in database for RAG context
    const userChat = await Chat.create({
      conversationId: targetConversationId,
      userId: currentUserId,
      message: question,
      role: "user",
      metadata: {
        section: section || "general",
        ragQuery: true,
        courseIds: userCourseIds,
      },
    });

    // Increment user message count (only for regular users, not admins)
    if (req.user.role !== "admin") {
      await User.increment("messageCount", { where: { id: currentUserId } });
    }

    // Get previous questions from this user for better context
    const previousQuestions = await Chat.findAll({
      where: {
        userId: currentUserId,
        role: "user",
      },
      order: [["timestamp", "DESC"]],
      limit: 3,
    });

    // Embed query
    const qEmbedding = await embedText(question);

    // Retrieve from vector DB with course filtering
    const hits = await query(qEmbedding, {
      topK: 5,
      courseIds: userCourseIds, // Filter by user's accessible courses
      filter: section ? { section } : {},
    });

    if (hits.length === 0) {
      return res.json({
        success: true,
        data: {
          answer: "I couldn't find relevant information in your accessible courses to answer this question. Please try rephrasing your question or contact support if you need access to additional courses.",
          userId: currentUserId,
          conversationId: targetConversationId,
          messageId: userChat.id,
          references: [],
          usage: {
            tokensUsed: 0,
            previousQuestions: previousQuestions.length,
            accessibleCourses: userCourseIds.length,
          },
        },
      });
    }

    const contextBlocks = hits
      .map(
        (h, idx) =>
          `[#${idx + 1}] [Course: ${h.metadata.course_id}] [Section: ${h.metadata.section}] [File: ${
            h.metadata.file_name
          }] [Time: ${h.metadata.start_time} → ${h.metadata.end_time}]\n${h.text}`
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

    // Store AI response in database with references
    const referencesData = hits.map((h) => ({
      course_id: h.metadata.course_id,
      section: h.metadata.section,
      file: h.metadata.file_name,
      start: h.metadata.start_time,
      end: h.metadata.end_time,
      score: h.score,
    }));

    await Chat.create({
      conversationId: targetConversationId,
      userId: currentUserId,
      message: answer,
      role: "assistant",
      metadata: {
        section: section || "general",
        ragResponse: true,
        tokensUsed: completion.usage?.total_tokens || 0,
        model: CHAT_MODEL,
        referencesCount: hits.length,
        references: referencesData,
        courseIds: userCourseIds,
      },
      vectorId: hits.length > 0 ? hits[0].id : null,
    });

    return res.json({
      success: true,
      data: {
        answer,
        userId: currentUserId,
        conversationId: targetConversationId,
        messageId: userChat.id,
        references: hits.map((h) => ({
          course_id: h.metadata.course_id,
          section: h.metadata.section,
          file: h.metadata.file_name,
          start: h.metadata.start_time,
          end: h.metadata.end_time,
          score: h.score,
        })),
        usage: {
          tokensUsed: completion.usage?.total_tokens || 0,
          previousQuestions: previousQuestions.length,
          accessibleCourses: userCourseIds.length,
        },
      },
    });
  } catch (err) {
    console.error("/ask error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to process question",
      error: err.message,
    });
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
          role: user.role,
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
          role: user.role,
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

// Get all courses (with pagination and filtering)
export const getCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10, topic, difficulty, isActive } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (topic) whereClause.topic = topic;
    if (difficulty) whereClause.difficulty = difficulty;
    if (isActive !== undefined) whereClause.isActive = isActive === 'true';

    const { count, rows: courses } = await Course.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "username"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalCourses: count,
          hasNextPage: offset + courses.length < count,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get courses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch courses",
      error: error.message,
    });
  }
};

// Grant course access to a user (admin only)
export const grantCourseAccess = async (req, res) => {
  try {
    const { userId, courseId, accessType = "granted", expiryDate } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "User ID and Course ID are required",
      });
    }

    // Verify user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Grant access
    const [userCourse, created] = await UserCourse.upsert({
      userId,
      courseId,
      accessType,
      purchaseDate: new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      isActive: true,
    });

    res.json({
      success: true,
      message: created ? "Course access granted successfully" : "Course access updated successfully",
      data: {
        userId,
        courseId,
        accessType,
        expiryDate,
        isActive: true,
      },
    });
  } catch (error) {
    console.error("Grant course access error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to grant course access",
      error: error.message,
    });
  }
};

// Get user's courses
export const getUserCourses = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    
    // Check if user is requesting their own courses or if admin
    if (userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const userCourses = await UserCourse.findUserCourses(userId, {
      include: [
        {
          model: Course,
          as: "course",
          include: [
            {
              model: User,
              as: "creator",
              attributes: ["id", "username"],
            },
          ],
        },
      ],
    });

    res.json({
      success: true,
      data: {
        courses: userCourses.map(uc => ({
          ...uc.course.toJSON(),
          access: {
            accessType: uc.accessType,
            purchaseDate: uc.purchaseDate,
            expiryDate: uc.expiryDate,
            progress: uc.progress,
            lastAccessedAt: uc.lastAccessedAt,
            isActive: uc.isActive,
            hasValidAccess: uc.hasValidAccess(),
          },
        })),
      },
    });
  } catch (error) {
    console.error("Get user courses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user courses",
      error: error.message,
    });
  }
};

// Update course (admin only)
export const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, difficulty, duration, price, isActive } = req.body;

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (duration !== undefined) updateData.duration = duration ? parseInt(duration) : null;
    if (price !== undefined) updateData.price = price ? parseFloat(price) : 0.0;
    if (isActive !== undefined) updateData.isActive = isActive;

    await course.update(updateData);

    res.json({
      success: true,
      message: "Course updated successfully",
      data: {
        course: course.toJSON(),
      },
    });
  } catch (error) {
    console.error("Update course error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update course",
      error: error.message,
    });
  }
};

// Delete course (admin only)
export const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Soft delete by setting isActive to false
    await course.update({ isActive: false });

    res.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Delete course error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete course",
      error: error.message,
    });
  }
};

// Revoke course access (admin only)
export const revokeCourseAccess = async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "User ID and Course ID are required",
      });
    }

    const userCourse = await UserCourse.findOne({
      where: { userId, courseId },
    });

    if (!userCourse) {
      return res.status(404).json({
        success: false,
        message: "User course access not found",
      });
    }

    await userCourse.update({ isActive: false });

    res.json({
      success: true,
      message: "Course access revoked successfully",
    });
  } catch (error) {
    console.error("Revoke course access error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to revoke course access",
      error: error.message,
    });
  }
};
