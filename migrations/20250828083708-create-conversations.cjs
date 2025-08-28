"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table exists
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('conversations')
    );

    if (!tableExists) {
      await queryInterface.createTable("conversations", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'New Chat',
        },
        lastMessageAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
        },
        metadata: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: "Store additional conversation data like settings, context, etc.",
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

      // Add indexes
      try {
        await queryInterface.addIndex("conversations", ["userId"], {
          name: "conversations_user_id_index"
        });
        await queryInterface.addIndex("conversations", ["lastMessageAt"], {
          name: "conversations_last_message_at_index"
        });
        await queryInterface.addIndex("conversations", ["isActive"], {
          name: "conversations_is_active_index"
        });
      } catch (error) {
        console.log('Some indexes already exist, skipping...');
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("conversations");
  },
};
