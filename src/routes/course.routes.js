import { Router } from "express";
import multer from "multer";
import os from "os";
import path from "path";
import {
  askQuestion,
  uploadVtt,
  getRagStats,
  signup,
  login,
} from "../controllers/course.controller.js";
import { authenticateToken, optionalAuth, requireAdmin, checkMessageLimit } from "../middleware/auth.js";

const router = Router();

// Configure Multer storage
const upload = multer({
  dest: path.join(os.tmpdir(), "uploads"),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file (tweak as needed)
    files: 50, // max 50 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "text/vtt") {
      return cb(new Error("Only .vtt files are allowed!"), false);
    }
    cb(null, true);
  },
});

// Upload VTT route (admin only)
router.post(
  "/upload-vtt",
  authenticateToken,
  requireAdmin,
  upload.array("files", 50), // frontend must send field name as `files`
  uploadVtt
);

// Ask a question route (protected with message limit)
router.post("/ask", authenticateToken, checkMessageLimit, askQuestion);

// Get RAG usage statistics (protected)
router.get("/rag-stats/:userId", authenticateToken, getRagStats);
router.get("/rag-stats", authenticateToken, getRagStats);

// Authentication routes (public)
router.post("/signup", signup);
router.post("/login", login);

export default router;
