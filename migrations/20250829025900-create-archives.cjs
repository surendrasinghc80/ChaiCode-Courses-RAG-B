'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Archives', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'ID of the user who archived the conversation'
      },
      conversationId: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'ID of the archived conversation'
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Title of the archived conversation'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Optional description for the archived conversation'
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Tags for organizing archived conversations'
      },
      messageCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of messages in the archived conversation'
      },
      archivedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the conversation was archived'
      },
      lastAccessedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the archived conversation was last accessed'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether the archive is active (soft delete)'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata for the archived conversation'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('Archives', ['userId']);
    await queryInterface.addIndex('Archives', ['conversationId']);
    await queryInterface.addIndex('Archives', ['userId', 'isActive']);
    await queryInterface.addIndex('Archives', ['archivedAt']);
    
    // Add unique constraint to prevent duplicate archives
    await queryInterface.addIndex('Archives', ['userId', 'conversationId'], {
      unique: true,
      name: 'unique_user_conversation_archive'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Archives');
  }
};
