import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const Archive = sequelize.define(
  "Archive",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "ID of the user who archived the conversation",
    },
    conversationId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "ID of the archived conversation",
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Title of the archived conversation",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Optional description for the archived conversation",
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Tags for organizing archived conversations",
    },
    messageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Number of messages in the archived conversation",
    },
    archivedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: "When the conversation was archived",
    },
    lastAccessedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the archived conversation was last accessed",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Whether the archive is active (soft delete)",
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Additional metadata for the archived conversation",
    },
  },
  {
    tableName: "archives",
    timestamps: true,
    indexes: [
      {
        fields: ["userId"],
      },
      {
        fields: ["conversationId"],
      },
      {
        fields: ["userId", "isActive"],
      },
      {
        fields: ["archivedAt"],
      },
      {
        unique: true,
        fields: ["userId", "conversationId"],
        name: "unique_user_conversation_archive",
      },
    ],
  }
);

// Instance method to update last accessed time
Archive.prototype.updateLastAccessed = function () {
  return this.update({ lastAccessedAt: new Date() });
};

// Static method to find by user and conversation
Archive.findByUserIdAndConversationId = function (userId, conversationId) {
  return this.findOne({
    where: {
      userId,
      conversationId,
      isActive: true,
    },
  });
};

export default Archive;
