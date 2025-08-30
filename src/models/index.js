import { sequelize } from "../config/database.js";
import User from "./User.js";
import Conversation from "./Conversation.js";
import Chat from "./Chat.js";
import Archive from "./Archive.js";
import Course from "./Course.js";
import UserCourse from "./UserCourse.js";

// Initialize models
const UserModel = User;
const ConversationModel = Conversation;
const ChatModel = Chat;
const ArchiveModel = Archive;
const CourseModel = Course(sequelize);
const UserCourseModel = UserCourse(sequelize);

// Initialize models object
const models = {
  User: UserModel,
  Conversation: ConversationModel,
  Chat: ChatModel,
  Archive: ArchiveModel,
  Course: CourseModel,
  UserCourse: UserCourseModel,
  sequelize,
};

// Set up associations
// User associations
UserModel.hasMany(ConversationModel, { foreignKey: "userId", as: "conversations" });
UserModel.hasMany(ChatModel, { foreignKey: "userId", as: "chats" });
UserModel.hasMany(ArchiveModel, { foreignKey: "userId", as: "archives" });
UserModel.hasMany(CourseModel, { foreignKey: "createdBy", as: "createdCourses" });
UserModel.belongsToMany(CourseModel, { 
  through: UserCourseModel, 
  foreignKey: "userId", 
  otherKey: "courseId",
  as: "enrolledCourses" 
});

// Course associations
CourseModel.belongsToMany(UserModel, { 
  through: UserCourseModel, 
  foreignKey: "courseId", 
  otherKey: "userId",
  as: "enrolledUsers" 
});
CourseModel.belongsTo(UserModel, { foreignKey: "createdBy", as: "creator" });

// UserCourse associations
UserCourseModel.belongsTo(UserModel, { foreignKey: "userId", as: "user" });
UserCourseModel.belongsTo(CourseModel, { foreignKey: "courseId", as: "course" });

// Conversation associations
ConversationModel.belongsTo(UserModel, { foreignKey: "userId", as: "user" });
ConversationModel.hasMany(ChatModel, { foreignKey: "conversationId", as: "messages" });

// Chat associations
ChatModel.belongsTo(UserModel, { foreignKey: "userId", as: "user" });
ChatModel.belongsTo(ConversationModel, { foreignKey: "conversationId", as: "conversation" });

// Archive associations
ArchiveModel.belongsTo(UserModel, { foreignKey: "userId", as: "user" });

export { 
  UserModel as User, 
  ConversationModel as Conversation, 
  ChatModel as Chat, 
  ArchiveModel as Archive,
  CourseModel as Course,
  UserCourseModel as UserCourse,
  sequelize 
};
export default models;
