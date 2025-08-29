import { DataTypes } from "sequelize";

const Archive = (sequelize) => {
  const ArchiveModel = sequelize.define(
    "Archive",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
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
      tableName: "Archives",
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

  // Instance methods
  ArchiveModel.prototype.updateLastAccessed = function () {
    return this.update({ lastAccessedAt: new Date() });
  };

  ArchiveModel.prototype.addTags = function (newTags) {
    const currentTags = this.tags || [];
    const updatedTags = [...new Set([...currentTags, ...newTags])];
    return this.update({ tags: updatedTags });
  };

  ArchiveModel.prototype.removeTags = function (tagsToRemove) {
    const currentTags = this.tags || [];
    const updatedTags = currentTags.filter(
      (tag) => !tagsToRemove.includes(tag)
    );
    return this.update({ tags: updatedTags });
  };

  // Class methods
  ArchiveModel.findByUserId = function (userId, options = {}) {
    return this.findAll({
      where: {
        userId,
        isActive: true,
      },
      order: [["archivedAt", "DESC"]],
      ...options,
    });
  };

  ArchiveModel.findByUserIdAndConversationId = function (
    userId,
    conversationId
  ) {
    return this.findOne({
      where: {
        userId,
        conversationId,
        isActive: true,
      },
    });
  };

  ArchiveModel.searchByTags = function (userId, tags, options = {}) {
    return this.findAll({
      where: {
        userId,
        isActive: true,
        tags: {
          [DataTypes.Op?.overlap || sequelize.Sequelize.Op.overlap]: tags,
        },
      },
      order: [["archivedAt", "DESC"]],
      ...options,
    });
  };

  return ArchiveModel;
};

export default Archive;
