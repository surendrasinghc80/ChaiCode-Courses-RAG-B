import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const Chat = sequelize.define('Chat', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'conversations',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER, // Match User model's ID type
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('user', 'assistant'),
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Store additional data like tokens, model used, etc.'
  },
  vectorId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Reference to vector store for RAG context'
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'chats',
  timestamps: true,
  indexes: [
    {
      fields: ['conversationId'],
      name: 'idx_chat_conversation_id'
    },
    {
      fields: ['userId'],
      name: 'idx_chat_user_id'
    }
  ]
});

// Define associations
Chat.associate = (models) => {
  Chat.belongsTo(models.User, { 
    foreignKey: 'userId',
    as: 'user'
  });
  Chat.belongsTo(models.Conversation, { 
    foreignKey: 'conversationId',
    as: 'conversation'
  });
};

export default Chat;
