import express from 'express';
import {
  createChat,
  getChatHistory,
  getUserConversations,
  searchChats,
  deleteConversation,
  getChatStats
} from '../controllers/chat.controller.js';

const router = express.Router();

// Create a new chat message
router.post('/', createChat);

// Get chat history by conversation ID
router.get('/conversation/:conversationId', getChatHistory);

// Get all conversations for a user
router.get('/user/:userId/conversations', getUserConversations);

// Search chats by message content
router.get('/search', searchChats);

// Delete a conversation
router.delete('/conversation/:conversationId', deleteConversation);

// Get chat statistics
router.get('/stats/:userId', getChatStats);
router.get('/stats', getChatStats);

export default router;
