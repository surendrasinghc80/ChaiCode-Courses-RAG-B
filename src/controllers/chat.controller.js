import Chat from '../models/Chat.js';
import { Op } from 'sequelize';

// Create a new chat message
export const createChat = async (req, res) => {
  try {
    const { conversationId, userId, message, role, metadata, vectorId } = req.body;

    if (!message || !role) {
      return res.status(400).json({
        success: false,
        message: 'Message and role are required'
      });
    }

    if (!['user', 'assistant'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "user" or "assistant"'
      });
    }

    const chat = await Chat.create({
      conversationId,
      userId,
      message,
      role,
      metadata,
      vectorId
    });

    res.status(201).json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create chat message',
      error: error.message
    });
  }
};

// Get chat history by conversation ID
export const getChatHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required'
      });
    }

    const chats = await Chat.findAll({
      where: { conversationId },
      order: [['timestamp', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalCount = await Chat.count({
      where: { conversationId }
    });

    res.json({
      success: true,
      data: {
        chats,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < totalCount
        }
      }
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat history',
      error: error.message
    });
  }
};

// Get all conversations for a user
export const getUserConversations = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const conversations = await Chat.findAll({
      where: { userId },
      attributes: [
        'conversationId',
        [Chat.sequelize.fn('MAX', Chat.sequelize.col('timestamp')), 'lastMessageTime'],
        [Chat.sequelize.fn('COUNT', Chat.sequelize.col('id')), 'messageCount']
      ],
      group: ['conversationId'],
      order: [[Chat.sequelize.fn('MAX', Chat.sequelize.col('timestamp')), 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error('Error fetching user conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user conversations',
      error: error.message
    });
  }
};

// Search chats by message content
export const searchChats = async (req, res) => {
  try {
    const { query, userId, conversationId, limit = 20, offset = 0 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const whereClause = {
      message: {
        [Op.like]: `%${query}%`
      }
    };

    if (userId) whereClause.userId = userId;
    if (conversationId) whereClause.conversationId = conversationId;

    const chats = await Chat.findAll({
      where: whereClause,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalCount = await Chat.count({ where: whereClause });

    res.json({
      success: true,
      data: {
        chats,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < totalCount
        }
      }
    });
  } catch (error) {
    console.error('Error searching chats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search chats',
      error: error.message
    });
  }
};

// Delete a conversation
export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required'
      });
    }

    const deletedCount = await Chat.destroy({
      where: { conversationId }
    });

    if (deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      message: `Deleted ${deletedCount} messages from conversation`,
      data: { deletedCount }
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete conversation',
      error: error.message
    });
  }
};

// Get chat statistics
export const getChatStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const whereClause = userId ? { userId } : {};

    const stats = await Chat.findAll({
      where: whereClause,
      attributes: [
        [Chat.sequelize.fn('COUNT', Chat.sequelize.col('id')), 'totalMessages'],
        [Chat.sequelize.fn('COUNT', Chat.sequelize.fn('DISTINCT', Chat.sequelize.col('conversationId'))), 'totalConversations'],
        [Chat.sequelize.fn('COUNT', Chat.sequelize.literal("CASE WHEN role = 'user' THEN 1 END")), 'userMessages'],
        [Chat.sequelize.fn('COUNT', Chat.sequelize.literal("CASE WHEN role = 'assistant' THEN 1 END")), 'assistantMessages']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Error fetching chat stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat statistics',
      error: error.message
    });
  }
};
