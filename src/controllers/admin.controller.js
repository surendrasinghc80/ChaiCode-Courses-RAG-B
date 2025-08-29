import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Chat from "../models/Chat.js";
import { Op } from "sequelize";

// Get all users with pagination and search
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", role = "" } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
      ];
    }

    if (role && ["user", "admin"].includes(role)) {
      whereClause.role = role;
    }

    const users = await User.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "username",
        "email",
        "age",
        "city",
        "role",
        "isActive",
        "messageCount",
        "createdAt",
        "updatedAt",
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Conversation,
          as: "conversations",
          attributes: ["id"],
          required: false,
        },
      ],
    });

    // Add conversation count to each user
    const usersWithStats = users.rows.map((user) => {
      const userData = user.toJSON();
      userData.conversationCount = userData.conversations
        ? userData.conversations.length
        : 0;
      delete userData.conversations;
      return userData;
    });

    res.json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(users.count / limit),
          totalUsers: users.count,
          hasNext: offset + users.rows.length < users.count,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

// Get user details with full statistics
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "username",
        "email",
        "age",
        "city",
        "role",
        "isActive",
        "messageCount",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: Conversation,
          as: "conversations",
          attributes: ["id", "title", "lastMessageAt", "isActive", "createdAt"],
          include: [
            {
              model: Chat,
              as: "messages",
              attributes: ["id", "role", "timestamp"],
            },
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userData = user.toJSON();

    // Calculate statistics
    const totalConversations = userData.conversations.length;
    const activeConversations = userData.conversations.filter(
      (conv) => conv.isActive
    ).length;
    const totalMessages = userData.conversations.reduce(
      (total, conv) => total + conv.messages.length,
      0
    );
    const userMessages = userData.conversations.reduce(
      (total, conv) =>
        total + conv.messages.filter((msg) => msg.role === "user").length,
      0
    );

    userData.statistics = {
      totalConversations,
      activeConversations,
      totalMessages,
      userMessages,
      remainingMessages:
        userData.role === "admin"
          ? "unlimited"
          : Math.max(0, 20 - userData.messageCount),
    };

    // Remove detailed conversations from response
    delete userData.conversations;

    res.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user details",
      error: error.message,
    });
  }
};

// Block/Unblock user
export const toggleUserAccess = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive field is required and must be a boolean",
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent admin from blocking themselves
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot block/unblock yourself",
      });
    }

    // Prevent blocking other admins
    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Cannot block/unblock admin users",
      });
    }

    await user.update({ isActive });

    res.json({
      success: true,
      message: `User ${isActive ? "unblocked" : "blocked"} successfully`,
      data: {
        userId: user.id,
        username: user.username,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Toggle user access error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user access",
      error: error.message,
    });
  }
};

// Reset user message count
export const resetUserMessageCount = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await user.update({ messageCount: 0 });

    res.json({
      success: true,
      message: "User message count reset successfully",
      data: {
        userId: user.id,
        username: user.username,
        messageCount: user.messageCount,
      },
    });
  } catch (error) {
    console.error("Reset message count error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset message count",
      error: error.message,
    });
  }
};

// Get platform statistics
export const getPlatformStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true } });
    const blockedUsers = await User.count({ where: { isActive: false } });
    const adminUsers = await User.count({ where: { role: "admin" } });
    const regularUsers = await User.count({ where: { role: "user" } });

    const totalConversations = await Conversation.count();
    const activeConversations = await Conversation.count({
      where: { isActive: true },
    });

    const totalMessages = await Chat.count();
    const userMessages = await Chat.count({ where: { role: "user" } });
    const assistantMessages = await Chat.count({
      where: { role: "assistant" },
    });

    // Get users who reached message limit
    const usersAtLimit = await User.count({
      where: {
        messageCount: { [Op.gte]: 20 },
        role: "user",
      },
    });

    // Get recent user registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentRegistrations = await User.count({
      where: {
        createdAt: { [Op.gte]: sevenDaysAgo },
      },
    });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          blocked: blockedUsers,
          admins: adminUsers,
          regular: regularUsers,
          atMessageLimit: usersAtLimit,
          recentRegistrations,
        },
        conversations: {
          total: totalConversations,
          active: activeConversations,
        },
        messages: {
          total: totalMessages,
          user: userMessages,
          assistant: assistantMessages,
        },
      },
    });
  } catch (error) {
    console.error("Get platform stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch platform statistics",
      error: error.message,
    });
  }
};
