import { Chat, Archive } from "../models/index.js";
import { Op } from "sequelize";
import { sequelize } from "../config/database.js";

// Archive a conversation
export const archiveConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { title, description, tags } = req.body;
    const userId = req.user.id;

    console.log("Archive request:", {
      conversationId,
      userId,
      title,
      description,
      tags,
    });

    // Check if conversation exists and belongs to user
    const conversationExists = await Chat.findOne({
      where: {
        conversationId,
        userId,
      },
    });

    console.log("Conversation exists:", conversationExists ? "Yes" : "No");

    // Get message count for the conversation
    const messageCount = await Chat.count({
      where: {
        conversationId,
        userId,
      },
    });

    console.log("Message count:", messageCount);

    // If no messages exist, we can't archive an empty conversation
    if (messageCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot archive conversation with no messages",
      });
    }

    // Check if already archived
    const existingArchive = await Archive.findByUserIdAndConversationId(
      userId,
      conversationId
    );
    if (existingArchive) {
      return res.status(400).json({
        success: false,
        message: "Conversation is already archived",
      });
    }

    // Create archive entry
    console.log("Creating archive with data:", {
      userId: String(userId),
      conversationId: String(conversationId),
      title: title || `Conversation ${conversationId}`,
      description: description || null,
      tags: Array.isArray(tags) ? tags : [],
      messageCount,
      archivedAt: new Date(),
    });

    const archive = await Archive.create({
      userId: String(userId),
      conversationId: String(conversationId),
      title: title || `Conversation ${conversationId}`,
      description: description || null,
      tags: Array.isArray(tags) ? tags : [],
      messageCount,
      archivedAt: new Date(),
      metadata: {
        originalConversationId: conversationId,
        archivedBy: userId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Conversation archived successfully",
      data: {
        archive: {
          id: archive.id,
          conversationId: archive.conversationId,
          title: archive.title,
          description: archive.description,
          tags: archive.tags,
          messageCount: archive.messageCount,
          archivedAt: archive.archivedAt,
        },
      },
    });
  } catch (error) {
    console.error("Archive conversation error:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      errors: error.errors, // Sequelize validation errors
    });

    // Handle Sequelize validation errors specifically
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error:
          error.errors?.map((e) => `${e.path}: ${e.message}`).join(", ") ||
          error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to archive conversation",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// Get all archived conversations for a user
export const getUserArchives = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 20,
      search = "",
      tags = "",
      sortBy = "archivedAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions
    const whereConditions = {
      userId,
      isActive: true,
    };

    // Add search functionality
    if (search) {
      whereConditions[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    // Add tag filtering
    if (tags) {
      const tagArray = tags.split(",").map((tag) => tag.trim());
      whereConditions.tags = {
        [Op.regexp]: tagArray.map((tag) => `"${tag}"`).join("|"),
      };
    }

    // Get archives with pagination
    const { count, rows: archives } = await Archive.findAndCountAll({
      where: whereConditions,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset,
    });

    // Calculate pagination info
    const totalPages = Math.ceil(count / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      success: true,
      data: {
        archives: archives.map((archive) => ({
          id: archive.id,
          conversationId: archive.conversationId,
          title: archive.title,
          description: archive.description,
          tags: archive.tags,
          messageCount: archive.messageCount,
          archivedAt: archive.archivedAt,
          lastAccessedAt: archive.lastAccessedAt,
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount: count,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get user archives error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch archived conversations",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get specific archived conversation
export const getArchivedConversation = async (req, res) => {
  try {
    const { archiveId } = req.params;
    const userId = req.user.id;

    // Find the archive
    const archive = await Archive.findOne({
      where: {
        id: archiveId,
        userId,
        isActive: true,
      },
    });

    if (!archive) {
      return res.status(404).json({
        success: false,
        message: "Archived conversation not found",
      });
    }

    // Get the conversation messages
    const messages = await Chat.findAll({
      where: {
        conversationId: archive.conversationId,
        userId,
      },
      order: [["timestamp", "ASC"]],
    });

    // Update last accessed time
    await archive.updateLastAccessed();

    res.json({
      success: true,
      data: {
        archive: {
          id: archive.id,
          conversationId: archive.conversationId,
          title: archive.title,
          description: archive.description,
          tags: archive.tags,
          messageCount: archive.messageCount,
          archivedAt: archive.archivedAt,
          lastAccessedAt: new Date(),
        },
        messages: messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          message: msg.message,
          timestamp: msg.timestamp,
          metadata: msg.metadata,
        })),
      },
    });
  } catch (error) {
    console.error("Get archived conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch archived conversation",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Update archived conversation (title, description, tags)
export const updateArchivedConversation = async (req, res) => {
  try {
    const { archiveId } = req.params;
    const { title, description, tags } = req.body;
    const userId = req.user.id;

    // Find the archive
    const archive = await Archive.findOne({
      where: {
        id: archiveId,
        userId,
        isActive: true,
      },
    });

    if (!archive) {
      return res.status(404).json({
        success: false,
        message: "Archived conversation not found",
      });
    }

    // Update the archive
    const updatedData = {};
    if (title !== undefined) updatedData.title = title;
    if (description !== undefined) updatedData.description = description;
    if (tags !== undefined) updatedData.tags = tags;

    await archive.update(updatedData);

    res.json({
      success: true,
      message: "Archived conversation updated successfully",
      data: {
        archive: {
          id: archive.id,
          conversationId: archive.conversationId,
          title: archive.title,
          description: archive.description,
          tags: archive.tags,
          messageCount: archive.messageCount,
          archivedAt: archive.archivedAt,
          lastAccessedAt: archive.lastAccessedAt,
        },
      },
    });
  } catch (error) {
    console.error("Update archived conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update archived conversation",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Delete archived conversation (soft delete)
export const deleteArchivedConversation = async (req, res) => {
  try {
    const { archiveId } = req.params;
    const userId = req.user.id;

    // Find the archive
    const archive = await Archive.findOne({
      where: {
        id: archiveId,
        userId,
        isActive: true,
      },
    });

    if (!archive) {
      return res.status(404).json({
        success: false,
        message: "Archived conversation not found",
      });
    }

    // Soft delete the archive
    await archive.update({ isActive: false });

    res.json({
      success: true,
      message: "Archived conversation deleted successfully",
    });
  } catch (error) {
    console.error("Delete archived conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete archived conversation",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Unarchive conversation (remove from archives)
export const unarchiveConversation = async (req, res) => {
  try {
    const { archiveId } = req.params;
    const userId = req.user.id;

    // Find the archive
    const archive = await Archive.findOne({
      where: {
        id: archiveId,
        userId,
        isActive: true,
      },
    });

    if (!archive) {
      return res.status(404).json({
        success: false,
        message: "Archived conversation not found",
      });
    }

    // Remove from archives (soft delete)
    await archive.update({ isActive: false });

    res.json({
      success: true,
      message: "Conversation unarchived successfully",
      data: {
        conversationId: archive.conversationId,
      },
    });
  } catch (error) {
    console.error("Unarchive conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unarchive conversation",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get archive statistics
export const getArchiveStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total archives count
    const totalArchives = await Archive.count({
      where: {
        userId,
        isActive: true,
      },
    });

    // Get archives by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const archivesByMonth = await Archive.findAll({
      where: {
        userId,
        isActive: true,
        archivedAt: {
          [Op.gte]: sixMonthsAgo,
        },
      },
      attributes: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("archivedAt"), "%Y-%m-01"),
          "month",
        ],
        [sequelize.fn("COUNT", "*"), "count"],
      ],
      group: [
        sequelize.fn("DATE_FORMAT", sequelize.col("archivedAt"), "%Y-%m-01"),
      ],
      order: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("archivedAt"), "%Y-%m-01"),
          "ASC",
        ],
      ],
    });

    // Get most used tags
    const allArchives = await Archive.findAll({
      where: {
        userId,
        isActive: true,
        tags: {
          [Op.not]: null,
        },
      },
      attributes: ["tags"],
    });

    const tagCounts = {};
    allArchives.forEach((archive) => {
      if (archive.tags && Array.isArray(archive.tags)) {
        archive.tags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    const topTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    res.json({
      success: true,
      data: {
        totalArchives,
        archivesByMonth: archivesByMonth.map((item) => ({
          month: item.getDataValue("month"),
          count: parseInt(item.getDataValue("count")),
        })),
        topTags,
      },
    });
  } catch (error) {
    console.error("Get archive stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch archive statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
