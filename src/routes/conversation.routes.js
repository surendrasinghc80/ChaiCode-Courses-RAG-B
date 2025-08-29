import { Router } from "express";
import {
  createConversation,
  getUserConversations,
  getConversation,
  updateConversation,
  deleteConversation,
  getConversationStats,
} from "../controllers/conversation.controller.js";
import {
  archiveConversation,
  getUserArchives,
  getArchivedConversation,
  updateArchivedConversation,
  deleteArchivedConversation,
  unarchiveConversation,
  getArchiveStats,
} from "../controllers/archive.controller.js";
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

// Archive Routes (must come before /:conversationId to avoid conflicts)
// Get all user archives
router.get("/archives", getUserArchives); // Fixed - moved before /:conversationId

// Get archive statistics
router.get("/archives/stats", getArchiveStats); // Working

// Archive a conversation
router.post("/:conversationId/archive", archiveConversation); // working

// Get specific conversation with messages
router.get("/:conversationId", getConversation);

// Update conversation (title, etc.)
router.post("/:conversationId", updateConversation);

// Delete conversation (soft delete)
router.delete("/:conversationId", deleteConversation);

// Get specific archived conversation
router.get("/archives/:archiveId", getArchivedConversation); // working

// Update archived conversation
router.post("/archives/:archiveId", updateArchivedConversation); // Working

// Delete archived conversation
router.delete("/archives/:archiveId", deleteArchivedConversation); // Working

// Unarchive conversation
router.post("/archives/:archiveId/unarchive", unarchiveConversation); //Working

export default router;
