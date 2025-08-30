# ChaiCode Courses RAG Backend

A sophisticated **Retrieval-Augmented Generation (RAG)** system built for course-based learning with advanced access control, conversation management, and vector search capabilities. This backend powers an intelligent Q&A system that provides contextual answers from course materials using OpenAI's GPT models and Qdrant vector database.

## 🚀 Key Features

### 🎓 **Course-Based RAG System**
- **Course Management**: Create, update, and manage courses with metadata (difficulty, duration, price)
- **VTT File Processing**: Upload and process WebVTT subtitle files for video courses
- **Intelligent Chunking**: Automatic segmentation of course content with time-based chunking (45-second windows)
- **Vector Embeddings**: Generate and store embeddings using OpenAI's text-embedding-3-small model
- **Contextual Search**: Retrieve relevant course content based on user queries with course filtering

### 🔐 **Advanced Access Control (RBAC)**
- **Role-Based Authentication**: Admin and user roles with JWT-based authentication
- **Course Access Management**: Granular control over user access to specific courses
- **Message Limits**: Rate limiting for regular users (20 messages max, unlimited for admins)
- **User Status Management**: Block/unblock users, reset message counts
- **Admin Dashboard**: Comprehensive user and platform statistics

### 💬 **Conversation Management**
- **Persistent Conversations**: Create and manage conversation threads
- **Message History**: Store and retrieve conversation history with metadata
- **Archive System**: Archive and unarchive conversations for organization
- **Context Awareness**: Maintain conversation context for better responses

### 🗄️ **Database Architecture**
- **MySQL Integration**: Robust relational database with Sequelize ORM
- **Model Associations**: Complex relationships between users, courses, conversations, and chats
- **Migration System**: Database versioning and schema management
- **Soft Deletes**: Safe deletion with data preservation

### 🔍 **Vector Database Integration**
- **Qdrant Integration**: High-performance vector similarity search
- **Course Filtering**: Filter search results by user's accessible courses
- **Metadata Storage**: Rich metadata including timestamps, sections, and file information
- **Scalable Architecture**: Efficient vector storage and retrieval

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Databases     │
│                 │    │                 │    │                 │
│ • Next.js UI    │◄──►│ • Express.js    │◄──►│ • MySQL         │
│ • React Comp.   │    │ • JWT Auth      │    │ • Qdrant Vector │
│ • TailwindCSS   │    │ • OpenAI API    │    │ • File Storage  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 API Endpoints

### Authentication & User Management
```
POST   /api/course/signup              # User registration
POST   /api/course/login               # User login
```

### Course Management (Admin Only)
```
POST   /api/course/courses             # Create new course
GET    /api/course/courses             # List all courses (with pagination)
PUT    /api/course/courses/:id         # Update course details
DELETE /api/course/courses/:id         # Soft delete course
```

### Course Access Management (Admin Only)
```
POST   /api/course/grant-access        # Grant course access to user
POST   /api/course/revoke-access       # Revoke course access from user
GET    /api/course/user-courses        # Get user's accessible courses
GET    /api/course/user-courses/:id    # Get specific user's courses
```

### VTT Upload & RAG (Admin Only for Upload)
```
POST   /api/course/upload-vtt          # Upload VTT files to course
POST   /api/course/ask                 # Ask questions (filtered by course access)
GET    /api/course/rag-stats           # Get RAG usage statistics
```

### Conversation Management
```
POST   /api/conversations              # Create new conversation
GET    /api/conversations              # Get user conversations (paginated)
GET    /api/conversations/:id          # Get specific conversation with messages
POST   /api/conversations/:id          # Update conversation (title, etc.)
DELETE /api/conversations/:id          # Delete conversation (soft delete)
GET    /api/conversations/stats        # Get conversation statistics
```

### Archive Management
```
POST   /api/conversations/:id/archive  # Archive a conversation
GET    /api/conversations/archives     # Get user's archived conversations
GET    /api/conversations/archives/:id # Get specific archived conversation
POST   /api/conversations/archives/:id # Update archived conversation
DELETE /api/conversations/archives/:id # Delete archived conversation
POST   /api/conversations/archives/:id/unarchive # Unarchive conversation
GET    /api/conversations/archives/stats # Get archive statistics
```

### Admin Management (Admin Only)
```
GET    /api/admin/users               # Get all users (paginated, searchable)
GET    /api/admin/users/:id           # Get user details with statistics
PATCH  /api/admin/users/:id/access    # Block/unblock user
PATCH  /api/admin/users/:id/reset-messages # Reset user message count
GET    /api/admin/stats               # Get platform statistics
```

## 🛠️ Technology Stack

### Backend Technologies
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **Sequelize** - ORM for MySQL database
- **MySQL** - Primary relational database
- **Qdrant** - Vector database for similarity search
- **OpenAI API** - GPT models and embeddings
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **Multer** - File upload handling

### Key Dependencies
```json
{
  "@qdrant/js-client-rest": "^1.15.1",
  "bcryptjs": "^3.0.2",
  "cors": "^2.8.5",
  "dotenv": "^17.2.1",
  "express": "^5.1.0",
  "jsonwebtoken": "^9.0.2",
  "multer": "^2.0.2",
  "mysql2": "^3.14.3",
  "openai": "^5.15.0",
  "sequelize": "^6.37.7",
  "uuid": "^11.1.0"
}
```

## 🚀 Quick Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **MySQL** (v8.0 or higher)
- **Qdrant** vector database
- **OpenAI API Key**

### 1. Clone and Install
```bash
git clone <repository-url>
cd ChaiCode-Courses-RAG-B
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
EMBEDDING_MODEL=text-embedding-3-small
CHAT_MODEL=gpt-4o-mini

# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_NAME=chaicode_rag
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
DB_PORT=3306

# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key

# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# Video Configuration (Optional)
VIDEO_BASE_URL=https://example.com/course/video?time=
```

### 3. Database Setup
```bash
# Create database and run migrations
npm run db:create
npm run db:migrate

# Seed initial data (creates admin user)
npm run db:seed

# Or run complete setup
npm run dev-setup
```

### 4. Start Services

#### Start Qdrant (using Docker)
```bash
docker run -p 6333:6333 qdrant/qdrant
```

#### Start the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start at `http://localhost:5000`

## 🔧 Database Schema

### Core Models

#### Users Table
```sql
- id (Primary Key)
- username (Unique)
- email (Unique)
- password (Hashed)
- age
- city
- role (user/admin)
- isActive (Boolean)
- messageCount (Integer)
- createdAt, updatedAt
```

#### Courses Table
```sql
- id (Primary Key, String)
- title
- description
- topic
- difficulty (beginner/intermediate/advanced)
- duration (minutes)
- price (Decimal)
- isActive (Boolean)
- vttFileCount (Integer)
- vectorCount (Integer)
- createdBy (Foreign Key to Users)
- metadata (JSON)
- createdAt, updatedAt
```

#### UserCourses Table (Junction)
```sql
- userId (Foreign Key)
- courseId (Foreign Key)
- accessType (granted/purchased)
- purchaseDate
- expiryDate
- progress (0-100)
- lastAccessedAt
- isActive (Boolean)
```

#### Conversations Table
```sql
- id (UUID Primary Key)
- userId (Foreign Key)
- title
- lastMessageAt
- isActive (Boolean)
- metadata (JSON)
- createdAt, updatedAt
```

#### Chats Table
```sql
- id (Primary Key)
- conversationId (Foreign Key)
- userId (Foreign Key)
- message (Text)
- role (user/assistant)
- vectorId (Optional)
- metadata (JSON)
- timestamp
```

#### Archives Table
```sql
- id (UUID Primary Key)
- userId (Foreign Key)
- originalConversationId
- title
- messageCount
- archivedAt
- conversationData (JSON)
- metadata (JSON)
```

## 🔐 Authentication & Authorization

### Default Admin Account
```
Email: admin@chaicode.com
Password: admin123
Role: admin
```

### JWT Token Structure
```json
{
  "userId": "user_id",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Role-Based Access Control

#### Admin Permissions
- ✅ Create, update, delete courses
- ✅ Upload VTT files
- ✅ Grant/revoke course access
- ✅ Manage users (block/unblock, reset message counts)
- ✅ View platform statistics
- ✅ Unlimited messages

#### User Permissions
- ✅ View accessible courses
- ✅ Ask questions (limited to 20 messages)
- ✅ Manage own conversations
- ✅ Archive/unarchive conversations
- ❌ Course management
- ❌ User management

## 📊 Vector Database Structure

### Qdrant Collection: `course_vectors`

#### Vector Payload Structure
```json
{
  "text": "Course content chunk",
  "course_id": "course_identifier",
  "topic": "course_topic",
  "title": "course_title",
  "file_name": "subtitle_file.vtt",
  "section": "Node Introduction",
  "start_time": "00:00:30",
  "end_time": "00:01:15",
  "difficulty": "beginner"
}
```

#### Search Filtering
- **Course Access**: Automatically filters by user's accessible courses
- **Section Filtering**: Optional filtering by course sections
- **Similarity Search**: Cosine similarity with configurable top-K results

## 🎯 Advanced Features

### 1. **Intelligent Content Processing**
- **VTT Parser**: Extracts timestamps and text from WebVTT files
- **Smart Chunking**: 45-second overlapping windows for context preservation
- **Section Detection**: Automatic section naming from file names
- **Metadata Enrichment**: Adds course context to each vector

### 2. **Context-Aware Responses**
- **Previous Questions**: Considers user's recent questions for better context
- **Course Filtering**: Only searches within user's accessible courses
- **Reference Tracking**: Provides source references with timestamps
- **Token Usage Tracking**: Monitors OpenAI API usage per query

### 3. **Conversation Management**
- **Thread Continuity**: Maintains conversation context across messages
- **Auto-titling**: Generates conversation titles from first question
- **Archive System**: Organize conversations with archiving functionality
- **Search & Filter**: Find conversations by title or content

### 4. **Admin Dashboard Features**
- **User Analytics**: Track user activity, message counts, and engagement
- **Platform Statistics**: Monitor system usage and performance
- **Course Analytics**: Track course popularity and access patterns
- **Message Limits**: Manage user quotas and reset capabilities

## 🔄 Database Migrations

### Available Migrations
```bash
# Run all pending migrations
npm run db:migrate

# Rollback last migration
npm run db:migrate:undo

# Create new migration
npx sequelize-cli migration:generate --name migration-name
```

### Migration Files
- `20250824111902-create-chats.cjs` - Chat messages table
- `20250828083708-create-conversations.cjs` - Conversations table
- `20250829025900-create-archives.cjs` - Archives table
- `20250829030000-add-user-role-fields.cjs` - User role and status fields

## 🧪 Testing

### Test Files Available
- `test-archive-apis.js` - Archive functionality tests
- `test-course-apis.js` - Course management tests
- `test-rbac.js` - Role-based access control tests
- `test-simple-course.js` - Basic course operations

### Running Tests
```bash
# Run specific test file
node test-course-apis.js
node test-rbac.js
```

## 🚦 Health Check

### Server Health
```bash
GET /health
```

Response:
```json
{
  "ok": true
}
```

## 📈 Performance Considerations

### Database Optimization
- **Indexed Columns**: Primary keys, foreign keys, and frequently queried fields
- **Connection Pooling**: Configured for optimal performance
- **Query Optimization**: Efficient joins and pagination

### Vector Search Optimization
- **Batch Processing**: Efficient bulk vector insertions
- **Filtered Search**: Reduces search space with course filtering
- **Caching**: Metadata caching for repeated queries

### API Performance
- **Pagination**: All list endpoints support pagination
- **Rate Limiting**: Message limits prevent abuse
- **Error Handling**: Comprehensive error responses

## 🔍 Monitoring & Logging

### Available Statistics
- **User Statistics**: Registration trends, activity levels
- **Course Analytics**: Access patterns, popular content
- **Message Analytics**: Usage patterns, token consumption
- **System Health**: Database connections, API response times

### Logging Features
- **Request Logging**: All API requests logged in development
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Query timing and optimization insights

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
DB_HOST=your_production_db_host
QDRANT_URL=your_production_qdrant_url
JWT_SECRET=your_secure_jwt_secret
```

### Docker Support
The project includes `docker.compose.yml` for containerized deployment.

```bash
docker-compose up -d
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make changes with proper testing
4. Submit a pull request

### Code Standards
- **ES6+ Modules**: Use import/export syntax
- **Error Handling**: Comprehensive try-catch blocks
- **Documentation**: Comment complex logic
- **Security**: Never commit sensitive data

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Check the API documentation in `RBAC-API-DOCS.md`
- Review implementation status in `IMPLEMENTATION-STATUS.md`
- Contact the development team

---

**Built with ❤️ for ChaiCode Learning Platform**