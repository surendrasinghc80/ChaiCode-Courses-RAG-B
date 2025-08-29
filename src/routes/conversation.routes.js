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

// Get specific conversation with messages
router.get("/:conversationId", getConversation);

// Update conversation (title, etc.)
router.post("/:conversationId", updateConversation);

// Delete conversation (soft delete)
router.delete("/:conversationId", deleteConversation);

// Archive Routes
// Archive a conversation
router.post("/:conversationId/archive", archiveConversation);

// Get all user archives
router.get("/archives", getUserArchives);

// Get archive statistics
router.get("/archives/stats", getArchiveStats);

// Get specific archived conversation
router.get("/archives/:archiveId", getArchivedConversation);

// Update archived conversation
router.put("/archives/:archiveId", updateArchivedConversation);

// Delete archived conversation
router.delete("/archives/:archiveId", deleteArchivedConversation);

// Unarchive conversation
router.post("/archives/:archiveId/unarchive", unarchiveConversation);

export default router;
