# File Management System

## Overview
The CodeVerse workspace now includes a complete file and folder management system that allows users to organize their code in a hierarchical structure.

## Features

### 1. File Explorer
- **Location**: Left sidebar in the Editor Page (toggle between "Files" and "Members" tabs)
- **Tree Structure**: Displays files and folders in a hierarchical tree view
- **Icons**: 
  - 📁 Collapsed folder
  - 📂 Expanded folder
  - 📄 File

### 2. File Operations

#### Creating Files and Folders
- Click the **📄+** button to create a new file in the root
- Click the **📁+** button to create a new folder in the root
- Right-click on a folder to create files/folders inside it

#### Opening Files
- Click on a file to select it
- Click the **✏️** button next to a file to open it in the editor
- Or right-click and select "Open in Editor"

#### Editing Files
1. Open a file in the editor
2. Make your changes
3. Click the **💾 Save** button to save changes

#### Renaming
- Right-click on a file or folder
- Select "Rename"
- Enter the new name

#### Deleting
- Right-click on a file or folder
- Select "Delete"
- Confirm the deletion

### 3. Backend API Endpoints

All endpoints require authentication (Bearer token).

#### Get All Files
```
GET /api/workspaces/:workspaceId/files
```

#### Get Specific File
```
GET /api/workspaces/:workspaceId/files/:fileId
```

#### Create File or Folder
```
POST /api/workspaces/:workspaceId/files
Body: {
  name: string,
  type: 'file' | 'folder',
  parentId?: number,
  content?: string,
  language?: string
}
```

#### Update File Content
```
PATCH /api/workspaces/:workspaceId/files/:fileId
Body: {
  content: string,
  language?: string
}
```

#### Rename File or Folder
```
PATCH /api/workspaces/:workspaceId/files/:fileId/rename
Body: {
  name: string
}
```

#### Delete File or Folder
```
DELETE /api/workspaces/:workspaceId/files/:fileId
```

### 4. Database Schema

The `workspace_files` table stores all files and folders:

```sql
CREATE TABLE workspace_files (
  id INT PRIMARY KEY AUTO_INCREMENT,
  workspace_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('file', 'folder') NOT NULL,
  content LONGTEXT,
  language VARCHAR(50),
  parent_id INT NULL,
  path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES workspace_files(id) ON DELETE CASCADE
)
```

**Key Features**:
- Self-referencing: `parent_id` references the same table for folder hierarchy
- Cascade delete: Deleting a folder automatically deletes all its contents
- Unique constraint: No duplicate paths within a workspace

### 5. Permissions

Based on workspace role:
- **Owner**: Full access (create, read, update, delete)
- **Collaborator**: Full access (create, read, update, delete)
- **Viewer**: Read-only access

## Usage Flow

1. User enters a workspace
2. Navigate to the Editor Page
3. Click on "Files" tab to see the file explorer
4. Create folders and files as needed
5. Click on a file to open it in the editor
6. Edit the file
7. Save changes using the Save button
8. Files are stored in the database and persist across sessions

## Technical Details

### Frontend Components
- **FileExplorer.js**: Main component for displaying and managing files
- **FileExplorer.css**: Styling for the file explorer
- **EditorPage.js**: Integrated with file explorer for seamless editing

### Backend Controllers
- **fileController.js**: Handles all file operations
- **fileRoutes.js**: Defines API routes
- **setupDatabase.js**: Creates the database table

## Setup

1. Run database setup to create the new table:
   ```bash
   cd backend
   node setupDatabase.js
   ```

2. Restart the backend server:
   ```bash
   npm start
   ```

3. The file explorer will be available in the workspace editor page

## Future Enhancements

Potential improvements:
- Drag and drop files/folders
- Copy/paste functionality
- File search
- Syntax highlighting based on file extension
- File upload/download
- File history/versioning
- Real-time collaboration on file tree changes
