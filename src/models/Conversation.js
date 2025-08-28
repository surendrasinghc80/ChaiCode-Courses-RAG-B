import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER, // Match User model's ID type
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'New Chat',
    validate: {
      len: [1, 200]
    }
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Store additional conversation data like settings, context, etc.'
  }
}, {
  tableName: 'conversations',
  timestamps: true,
  indexes: [
    {
      fields: ['userId'],
      name: 'idx_conversation_user_id'
    },
    {
      fields: ['isActive'],
      name: 'idx_conversation_is_active'
    }
  ]
});

// Define associations
Conversation.associate = (models) => {
  Conversation.belongsTo(models.User, { 
    foreignKey: 'userId',
    as: 'user'
  });
  Conversation.hasMany(models.Chat, { 
    foreignKey: 'conversationId',
    as: 'messages'
  });
};

export default Conversation;
