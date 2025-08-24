"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table exists
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('chats')
    );

    if (!tableExists) {
      await queryInterface.createTable("chats", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        conversationId: {
          type: Sequelize.UUID,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: true,
          defaultValue: Sequelize.UUIDV4,
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        role: {
          type: Sequelize.ENUM("user", "assistant"),
          allowNull: false,
        },
        metadata: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: "Store additional data like tokens, model used, etc.",
        },
        vectorId: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Reference to vector store for RAG context",
        },
        timestamp: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      });

      // Add indexes only if table was created
      try {
        await queryInterface.addIndex("chats", ["conversationId"], {
          name: "chats_conversation_id_index"
        });
        await queryInterface.addIndex("chats", ["userId"], {
          name: "chats_user_id_index"
        });
        await queryInterface.addIndex("chats", ["timestamp"], {
          name: "chats_timestamp_index"
        });
      } catch (error) {
        // Indexes might already exist, ignore error
        console.log('Some indexes already exist, skipping...');
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("chats");
  },
};
