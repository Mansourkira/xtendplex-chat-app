# Xtendplex Chat App - Backend API

A real-time chat application backend API built with Express.js and Supabase.

## Features

- 🔐 **Authentication**: Secure user registration and login using Supabase Auth
- 👥 **User Management**: Profile management, user search, and status updates
- 💬 **Chat Groups**: Create, join, and manage chat groups
- 📝 **Messaging**: Real-time messaging with threading and editing capabilities
- 📎 **Attachments**: File uploads and sharing
- 🔔 **Reactions**: Add reactions to messages

## Setup

### Prerequisites

- Node.js (v14+)
- npm or yarn
- [Supabase](https://supabase.io) account

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/xtendplex-chat-app.git
   cd xtendplex-chat-app/backend
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file in the root directory:

   ```
   PORT=3000
   JWT_SECRET=your_jwt_secret_key
   CLIENT_URL=http://localhost:5173

   # These Supabase credentials are essential for the app to work
   SUPABASE_URL=https://your-supabase-project-url.supabase.co
   SUPABASE_KEY=your-supabase-service-role-key
   ```

   > ⚠️ **Important for Recruiters/Reviewers**: You must create a `.env` file with valid Supabase credentials before proceeding. The application will not work without these environment variables.

4. Set up the database and populate with test data:

   ```
   # Initialize the database with tables and sample data
   node create-tables-simple.js
   ```

   This script will:

   - Create all necessary database tables in your Supabase project
   - Populate the database with sample users and chat groups
   - Set up relationships between users, groups, and messages

   > 📝 **Note**: If you encounter any errors during this process, check that your Supabase credentials are correct and that your account has the appropriate permissions.

5. Start the development server:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `GET /api/users/:id/status` - Get user status
- `PUT /api/users/status` - Update user status
- `GET /api/users/search/:query` - Search users by username

### Groups

- `GET /api/groups` - Get all groups for current user
- `GET /api/groups/:id` - Get group by ID
- `POST /api/groups` - Create new group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `POST /api/groups/:id/members` - Add member to group
- `DELETE /api/groups/:id/members/:userId` - Remove member from group
- `PUT /api/groups/:id/members/:userId` - Update member role
- `POST /api/groups/direct` - Create direct message group

### Messages

- `GET /api/messages/group/:groupId` - Get messages for a group
- `POST /api/messages` - Create a new message
- `PUT /api/messages/:id` - Update a message
- `DELETE /api/messages/:id` - Delete a message
- `POST /api/messages/:id/reactions` - Add/remove a reaction to a message
- `GET /api/messages/:id/reactions` - Get reactions for a message

### Attachments

- `POST /api/attachments/:messageId` - Upload a file attachment to a message
- `GET /api/attachments/message/:messageId` - Get all attachments for a message
- `GET /api/attachments/group/:groupId` - Get all attachments for a group
- `DELETE /api/attachments/:id` - Delete an attachment

## Authentication

All endpoints except for register and login require authentication. To authenticate requests, include the JWT token in the request header:

```
x-auth-token: your_jwt_token
```

## Database Schema

The application uses the following Supabase tables:

- `users` - User profiles
- `user_status` - User online status
- `groups` - Chat groups
- `group_members` - Group membership
- `messages` - Chat messages
- `message_attachments` - File attachments
- `message_reactions` - Message reactions

## Security

- JWT authentication for API endpoints
- Row-level security (RLS) policies in Supabase
- Password hashing with Supabase Auth
- Role-based access control for group management

## License

MIT
