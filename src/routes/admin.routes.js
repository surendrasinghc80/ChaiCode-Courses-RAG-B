import express from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import {
  getAllUsers,
  getUserDetails,
  toggleUserAccess,
  resetUserMessageCount,
  getPlatformStats,
} from "../controllers/admin.controller.js";

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Get all users with pagination and search
router.get("/users", getAllUsers);

// Get specific user details
router.get("/users/:userId", getUserDetails);

// Block/unblock user
router.patch("/users/:userId/access", toggleUserAccess);

// Reset user message count
router.patch("/users/:userId/reset-messages", resetUserMessageCount);

// Get platform statistics
router.get("/stats", getPlatformStats);

export default router;
