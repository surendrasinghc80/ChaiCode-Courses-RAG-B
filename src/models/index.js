import { sequelize } from "../config/database.js";
import User from "./User.js";
import Conversation from "./Conversation.js";
import Chat from "./Chat.js";
import ArchiveFactory from "../../models/Archive.js";

// Initialize Archive model
const Archive = ArchiveFactory(sequelize);

// Initialize models object
const models = {
  User,
  Conversation,
  Chat,
  Archive,
  sequelize,
};

// Set up associations
User.associate(models);
Conversation.associate(models);
Chat.associate(models);

export { User, Conversation, Chat, Archive, sequelize };
export default models;
