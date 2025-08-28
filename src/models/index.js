import { sequelize } from '../config/database.js';
import User from './User.js';
import Conversation from './Conversation.js';
import Chat from './Chat.js';

// Initialize models object
const models = {
  User,
  Conversation,
  Chat,
  sequelize
};

// Set up associations
User.associate(models);
Conversation.associate(models);
Chat.associate(models);

export { User, Conversation, Chat, sequelize };
export default models;
