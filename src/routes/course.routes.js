import { Router } from "express";
import multer from "multer";
import os from "os";
import path from "path";
import { askQuestion, uploadVtt } from "../controllers/course.controller.js";

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

// Upload VTT route
router.post(
  "/upload-vtt",
  upload.array("files", 50), // frontend must send field name as `files`
  uploadVtt
);

// Ask a question route
router.post("/ask", askQuestion);

export default router;
