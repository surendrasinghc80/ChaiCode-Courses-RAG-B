# Role-Based Access Control API Documentation

## Overview

This document outlines the role-based access control (RBAC) system implemented in the ChaiCode RAG backend.

## User Roles

- **user**: Default role for regular users (20 message limit)
- **admin**: Administrative role (unlimited messages, can upload VTT files, manage users)

## User Status

- **isActive**: `true` (active) or `false` (blocked)
- **messageCount**: Current number of messages sent (max 20 for users)

## Default Admin Account

```
Email: admin@chaicode.com
Password: admin123
Role: admin
```

## Authentication Headers

All protected endpoints require:

```
Authorization: Bearer <jwt_token>
```

## API Endpoints

### Admin Routes (Admin Only)

Base URL: `/api/admin`

#### Get All Users

```
GET /api/admin/users
Query Parameters:
- page: Page number (default: 1)
- limit: Users per page (default: 10)
- search: Search by username, email, or city
- role: Filter by role (user/admin)

Response:
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {...}
  }
}
```

#### Get User Details

```
GET /api/admin/users/:userId

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "username": "user1",
    "email": "user1@example.com",
    "role": "user",
    "isActive": true,
    "messageCount": 5,
    "statistics": {
      "totalConversations": 3,
      "activeConversations": 2,
      "remainingMessages": 15
    }
  }
}
```

#### Block/Unblock User

```
PATCH /api/admin/users/:userId/access
Body:
{
  "isActive": false
}

Response:
{
  "success": true,
  "message": "User blocked successfully"
}
```

#### Reset User Message Count

```
PATCH /api/admin/users/:userId/reset-messages

Response:
{
  "success": true,
  "message": "User message count reset successfully"
}
```

#### Get Platform Statistics

```
GET /api/admin/stats

Response:
{
  "success": true,
  "data": {
    "users": {
      "total": 10,
      "active": 8,
      "blocked": 2,
      "admins": 1,
      "regular": 9,
      "atMessageLimit": 3
    },
    "conversations": {...},
    "messages": {...}
  }
}
```

### Course Routes (Updated with RBAC)

#### Upload VTT Files (Admin Only)

```
POST /api/course/upload-vtt
Headers: Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Body: files (VTT files)

Response:
{
  "section": "Node Introduction",
  "totalInserted": 25,
  "files": [...]
}
```

#### Ask Question (With Message Limit)

```
POST /api/course/ask
Headers: Authorization: Bearer <token>

Body:
{
  "question": "What is Node.js?",
  "section": "Normal Node",
  "conversationId": "optional"
}

Response:
{
  "success": true,
  "data": {
    "answer": "...",
    "conversationId": "conv-123",
    "references": [...]
  }
}

Error (Message Limit Reached):
{
  "success": false,
  "message": "Message limit reached. You can send maximum 20 messages.",
  "messageCount": 20,
  "maxMessages": 20
}
```

## Error Responses

### Blocked User

```
Status: 403
{
  "success": false,
  "message": "Your account has been blocked. Please contact administrator."
}
```

### Admin Access Required

```
Status: 403
{
  "success": false,
  "message": "Admin access required"
}
```

### Message Limit Reached

```
Status: 429
{
  "success": false,
  "message": "Message limit reached. You can send maximum 20 messages.",
  "messageCount": 20,
  "maxMessages": 20
}
```

## Middleware Chain

### VTT Upload Route

1. `authenticateToken` - Verify JWT and user status
2. `requireAdmin` - Check admin role
3. `uploadVtt` - Process file upload

### Ask Question Route

1. `authenticateToken` - Verify JWT and user status
2. `checkMessageLimit` - Validate message count (skip for admins)
3. `askQuestion` - Process question and increment count

### Admin Routes

1. `authenticateToken` - Verify JWT and user status
2. `requireAdmin` - Check admin role
3. Controller function

## Security Features

- JWT-based authentication
- Role-based authorization
- User status validation (active/blocked)
- Message count limits for regular users
- Admin-only VTT upload permissions
- Protection against self-blocking for admins
- Secure password hashing with bcrypt
