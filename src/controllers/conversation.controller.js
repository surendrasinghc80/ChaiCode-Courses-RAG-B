import Conversation from "../models/Conversation.js";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import { Op } from "sequelize";

// Create a new conversation
export const createConversation = async (req, res) => {
  try {
    const { title } = req.body;
    const userId = req.user.id;

    const conversation = await Conversation.create({
      userId,
      title: title || "New Chat",
      lastMessageAt: new Date(),
      metadata: {
        createdBy: "user",
        initialContext: req.body.context || null
      }
    });

    res.status(201).json({
      success: true,
      message: "Conversation created successfully",
      data: {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          lastMessageAt: conversation.lastMessageAt,
          isActive: conversation.isActive,
          createdAt: conversation.createdAt
        }
      }
    });
  } catch (error) {
    console.error("Create conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create conversation",
      error: error.message
    });
  }
};

// Get all conversations for a user
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      userId,
      isActive: true
    };

    // Add search functionality
    if (search) {
      whereClause.title = {
        [Op.like]: `%${search}%`
      };
    }

    const conversations = await Conversation.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Chat,
          as: 'messages',
          attributes: ['id', 'message', 'role', 'timestamp'],
          limit: 1,
          order: [['timestamp', 'DESC']]
        }
      ],
      order: [['lastMessageAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const formattedConversations = conversations.rows.map(conv => ({
      id: conv.id,
      title: conv.title,
      lastMessageAt: conv.lastMessageAt,
      isActive: conv.isActive,
      createdAt: conv.createdAt,
      lastMessage: conv.messages.length > 0 ? {
        message: conv.messages[0].message,
        role: conv.messages[0].role,
        timestamp: conv.messages[0].timestamp
      } : null,
      messageCount: conv.messages.length
    }));

    res.json({
      success: true,
      data: {
        conversations: formattedConversations,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(conversations.count / limit),
          totalItems: conversations.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
      error: error.message
    });
  }
};

// Get a specific conversation with messages
export const getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findOne({
      where: {
        id: conversationId,
        userId,
        isActive: true
      },
      include: [
        {
          model: Chat,
          as: 'messages',
          attributes: ['id', 'message', 'role', 'timestamp', 'metadata'],
          order: [['timestamp', 'ASC']]
        }
      ]
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found"
      });
    }

    res.json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          lastMessageAt: conversation.lastMessageAt,
          isActive: conversation.isActive,
          createdAt: conversation.createdAt,
          messages: conversation.messages
        }
      }
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversation",
      error: error.message
    });
  }
};

// Update conversation title
export const updateConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { title } = req.body;
    const userId = req.user.id;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Title is required"
      });
    }

    const conversation = await Conversation.findOne({
      where: {
        id: conversationId,
        userId,
        isActive: true
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found"
      });
    }

    await conversation.update({
      title: title.trim()
    });

    res.json({
      success: true,
      message: "Conversation updated successfully",
      data: {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          lastMessageAt: conversation.lastMessageAt,
          isActive: conversation.isActive
        }
      }
    });
  } catch (error) {
    console.error("Update conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update conversation",
      error: error.message
    });
  }
};

// Delete conversation (soft delete)
export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findOne({
      where: {
        id: conversationId,
        userId,
        isActive: true
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found"
      });
    }

    await conversation.update({
      isActive: false
    });

    res.json({
      success: true,
      message: "Conversation deleted successfully"
    });
  } catch (error) {
    console.error("Delete conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete conversation",
      error: error.message
    });
  }
};

// Get conversation statistics
export const getConversationStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Conversation.findAll({
      where: { userId, isActive: true },
      attributes: [
        [Conversation.sequelize.fn('COUNT', Conversation.sequelize.col('id')), 'totalConversations'],
        [Conversation.sequelize.fn('COUNT', Conversation.sequelize.literal('CASE WHEN DATE(lastMessageAt) = CURDATE() THEN 1 END')), 'todayConversations'],
        [Conversation.sequelize.fn('COUNT', Conversation.sequelize.literal('CASE WHEN DATE(lastMessageAt) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END')), 'weekConversations']
      ],
      raw: true
    });

    const messageStats = await Chat.findAll({
      where: { userId },
      attributes: [
        [Chat.sequelize.fn('COUNT', Chat.sequelize.col('id')), 'totalMessages'],
        [Chat.sequelize.fn('COUNT', Chat.sequelize.literal('CASE WHEN role = "user" THEN 1 END')), 'userMessages'],
        [Chat.sequelize.fn('COUNT', Chat.sequelize.literal('CASE WHEN role = "assistant" THEN 1 END')), 'assistantMessages']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        conversations: stats[0],
        messages: messageStats[0]
      }
    });
  } catch (error) {
    console.error("Get conversation stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversation statistics",
      error: error.message
    });
  }
};
