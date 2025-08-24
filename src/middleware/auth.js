import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user in database
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token - user not found",
      });
    }

    // Add user info to request object
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      age: user.age,
      city: user.city,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed",
      error: error.message,
    });
  }
};

// Optional authentication - doesn't fail if no token provided
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    
    if (user) {
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        age: user.age,
        city: user.city,
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user
    req.user = null;
    next();
  }
};
