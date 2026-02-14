# Workspace & Session Management Documentation

## Overview
This document describes the workspace (project rooms) schema and session token management system implemented in CodeVerse.

## Database Schema

### 1. Workspaces Table
Stores collaborative coding workspaces/rooms.

```sql
CREATE TABLE workspaces (
  id VARCHAR(36) PRIMARY KEY,              -- UUID
  name VARCHAR(100) NOT NULL,              -- Workspace name
  description TEXT,                         -- Optional description
  owner_id INT NOT NULL,                   -- User who created it
  code TEXT,                               -- Stored code content
  language VARCHAR(20) DEFAULT 'javascript', -- Programming language
  is_active BOOLEAN DEFAULT true,          -- Soft delete flag
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 2. User Workspaces Table (Junction Table)
Tracks which users have joined which workspaces with their roles.

```sql
CREATE TABLE user_workspaces (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,                    -- User ID
  workspace_id VARCHAR(36) NOT NULL,       -- Workspace ID
  role ENUM('owner', 'collaborator', 'viewer') DEFAULT 'collaborator',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_workspace (user_id, workspace_id)
);
```

### 3. Sessions Table
Manages session tokens for authenticated users.

```sql
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,             -- Session ID
  user_id INT NOT NULL,                    -- User ID
  token TEXT NOT NULL,                     -- JWT token
  ip_address VARCHAR(45),                  -- User's IP address
  user_agent TEXT,                         -- Browser/client info
  expires_at TIMESTAMP NOT NULL,           -- Expiration time
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## API Endpoints

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "sessionId": "a1b2c3d4e5f6...",
  "expiresAt": "2026-02-17T12:00:00.000Z",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "sessionId": "a1b2c3d4e5f6...",
  "expiresAt": "2026-02-17T12:00:00.000Z",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Logout successful"
}
```

#### Logout from All Devices
```http
POST /api/auth/logout-all
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Logged out from all devices successfully"
}
```

#### Get Active Sessions
```http
GET /api/auth/sessions
Authorization: Bearer <token>
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "session123",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2026-02-10T10:00:00.000Z",
      "last_activity": "2026-02-10T12:30:00.000Z",
      "expires_at": "2026-02-17T10:00:00.000Z"
    }
  ]
}
```

### Workspace Endpoints

All workspace endpoints require authentication (Bearer token).

#### Create Workspace
```http
POST /api/workspaces
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My React Project",
  "description": "Learning React hooks",
  "language": "javascript"
}
```

**Response:**
```json
{
  "message": "Workspace created successfully",
  "workspace": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My React Project",
    "description": "Learning React hooks",
    "language": "javascript",
    "owner_id": 1
  }
}
```

#### Get All User Workspaces
```http
GET /api/workspaces
Authorization: Bearer <token>
```

**Response:**
```json
{
  "workspaces": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "My React Project",
      "description": "Learning React hooks",
      "language": "javascript",
      "owner_id": 1,
      "owner_name": "john_doe",
      "role": "owner",
      "joined_at": "2026-02-10T10:00:00.000Z",
      "last_accessed": "2026-02-10T12:30:00.000Z",
      "created_at": "2026-02-10T10:00:00.000Z"
    }
  ]
}
```

#### Get Specific Workspace
```http
GET /api/workspaces/:workspaceId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "workspace": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My React Project",
    "description": "Learning React hooks",
    "code": "console.log('Hello');",
    "language": "javascript",
    "owner_id": 1,
    "owner_name": "john_doe",
    "created_at": "2026-02-10T10:00:00.000Z",
    "updated_at": "2026-02-10T12:30:00.000Z",
    "userRole": "owner",
    "collaborators": [
      {
        "id": 1,
        "username": "john_doe",
        "role": "owner",
        "joined_at": "2026-02-10T10:00:00.000Z"
      },
      {
        "id": 2,
        "username": "jane_smith",
        "role": "collaborator",
        "joined_at": "2026-02-10T11:00:00.000Z"
      }
    ]
  }
}
```

#### Join Workspace
```http
POST /api/workspaces/:workspaceId/join
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Successfully joined workspace",
  "workspaceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Leave Workspace
```http
POST /api/workspaces/:workspaceId/leave
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Successfully left workspace"
}
```

#### Update Workspace Code
```http
PATCH /api/workspaces/:workspaceId/code
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "const greeting = 'Hello World';\nconsole.log(greeting);"
}
```

**Response:**
```json
{
  "message": "Code updated successfully"
}
```

#### Delete Workspace (Owner Only)
```http
DELETE /api/workspaces/:workspaceId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Workspace deleted successfully"
}
```

## User Roles

### Owner
- Creates the workspace
- Full access to workspace
- Can delete workspace
- Cannot leave workspace (must delete instead)

### Collaborator
- Can view and edit code
- Can leave workspace
- Cannot delete workspace

### Viewer
- Can only view code
- Cannot edit code
- Can leave workspace

## Session Management Features

### Automatic Session Cleanup
- Expired sessions are automatically cleaned up every hour
- Sessions expire after 7 days of inactivity

### Multi-Device Support
- Users can have multiple active sessions
- View all active sessions via `/api/auth/sessions`
- Logout from specific device or all devices

### Session Tracking
- Tracks IP address and user agent
- Records last activity timestamp
- Updates on each authenticated request

## Setup Instructions

### 1. Update Database
Run the database setup script to create all necessary tables:

```bash
npm run setup-db
```

Or manually:
```bash
node setupDatabase.js
```

### 2. Environment Variables
Ensure your `.env` file includes:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=codeverse
DB_PORT=3306
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
```

### 3. Start Server
```bash
npm start
```

## Integration with Socket.io

The existing Socket.io real-time collaboration can be enhanced to work with workspaces:

```javascript
// When a user joins a room, verify they have access to the workspace
socket.on(ACTIONS.JOIN, async ({ roomId, username }) => {
  // Verify user has access to this workspace
  // roomId should be the workspace ID
  // Add user to socket room if they have access
});
```

## Security Considerations

1. **Session Tokens**: Sessions are stored in the database and verified on each request
2. **JWT Expiration**: Tokens expire after 7 days
3. **Password Hashing**: bcrypt with salt rounds
4. **SQL Injection**: Using parameterized queries
5. **Authorization**: Role-based access control for workspaces
6. **Soft Deletes**: Workspaces are marked inactive rather than deleted

## Future Enhancements

- Add workspace invitations via email
- Implement workspace permissions (read-only links)
- Add workspace templates
- Implement version history for code
- Add real-time presence indicators
- Implement workspace search and filtering
