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
    defaultValue: () => uuidv4()
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true, // Can be null for anonymous users
    defaultValue: () => uuidv4()
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
      fields: ['conversationId']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['timestamp']
    }
  ]
});

// Define associations if needed
Chat.associate = (models) => {
  // Add associations here when you have User model
  // Chat.belongsTo(models.User, { foreignKey: 'userId' });
};

export default Chat;
