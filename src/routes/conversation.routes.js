import { Router } from "express";
import {
  createConversation,
  getUserConversations,
  getConversation,
  updateConversation,
  deleteConversation,
  getConversationStats
} from "../controllers/conversation.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// All conversation routes require authentication
router.use(authenticateToken);

// Create new conversation
router.post("/", createConversation);

// Get all user conversations with pagination and search
router.get("/", getUserConversations);

// Get conversation statistics
router.get("/stats", getConversationStats);

// Get specific conversation with messages
router.get("/:conversationId", getConversation);

// Update conversation (title, etc.)
router.put("/:conversationId", updateConversation);

// Delete conversation (soft delete)
router.delete("/:conversationId", deleteConversation);

export default router;
