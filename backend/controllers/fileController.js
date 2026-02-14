const { pool } = require('../config/db');

// Get all files and folders for a workspace
const getWorkspaceFiles = async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user.id;

  try {
    // Check if user has access to the workspace
    const [access] = await pool.query(
      'SELECT role FROM user_workspaces WHERE user_id = ? AND workspace_id = ?',
      [userId, workspaceId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    // Get all files and folders
    const [files] = await pool.query(
      `SELECT id, workspace_id, name, type, content, language, parent_id, path, created_at, updated_at
       FROM workspace_files
       WHERE workspace_id = ?
       ORDER BY type DESC, name ASC`,
      [workspaceId]
    );

    res.json({ files });
  } catch (error) {
    console.error('Get workspace files error:', error);
    res.status(500).json({ error: 'Server error fetching files' });
  }
};

// Get a specific file
const getFile = async (req, res) => {
  const { workspaceId, fileId } = req.params;
  const userId = req.user.id;

  try {
    // Check if user has access to the workspace
    const [access] = await pool.query(
      'SELECT role FROM user_workspaces WHERE user_id = ? AND workspace_id = ?',
      [userId, workspaceId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    // Get the file
    const [files] = await pool.query(
      `SELECT id, workspace_id, name, type, content, language, parent_id, path, created_at, updated_at
       FROM workspace_files
       WHERE id = ? AND workspace_id = ?`,
      [fileId, workspaceId]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ file: files[0] });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Server error fetching file' });
  }
};

// Create a new file or folder
const createFileOrFolder = async (req, res) => {
  const { workspaceId } = req.params;
  const { name, type, parentId, content, language } = req.body;
  const userId = req.user.id;

  try {
    // Check if user has access to the workspace and has permission to edit
    const [access] = await pool.query(
      'SELECT role FROM user_workspaces WHERE user_id = ? AND workspace_id = ?',
      [userId, workspaceId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    if (access[0].role === 'viewer') {
      return res.status(403).json({ error: 'You do not have permission to create files' });
    }

    // Validate required fields
    if (!name || !type || (type !== 'file' && type !== 'folder')) {
      return res.status(400).json({ error: 'Invalid request. Name and type are required' });
    }

    // Build the path
    let path = name;
    if (parentId) {
      const [parent] = await pool.query(
        'SELECT path FROM workspace_files WHERE id = ? AND workspace_id = ?',
        [parentId, workspaceId]
      );
      
      if (parent.length === 0) {
        return res.status(404).json({ error: 'Parent folder not found' });
      }
      
      path = `${parent[0].path}/${name}`;
    }

    // Create the file or folder
    const [result] = await pool.query(
      `INSERT INTO workspace_files (workspace_id, name, type, content, language, parent_id, path)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [workspaceId, name, type, content || null, language || null, parentId || null, path]
    );

    res.status(201).json({
      message: `${type === 'file' ? 'File' : 'Folder'} created successfully`,
      file: {
        id: result.insertId,
        workspace_id: workspaceId,
        name,
        type,
        content: content || null,
        language: language || null,
        parent_id: parentId || null,
        path
      }
    });
  } catch (error) {
    console.error('Create file/folder error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A file or folder with this name already exists in this location' });
    }
    res.status(500).json({ error: 'Server error creating file/folder' });
  }
};

// Update a file's content
const updateFile = async (req, res) => {
  const { workspaceId, fileId } = req.params;
  const { content, language } = req.body;
  const userId = req.user.id;

  try {
    // Check if user has access to the workspace and has permission to edit
    const [access] = await pool.query(
      'SELECT role FROM user_workspaces WHERE user_id = ? AND workspace_id = ?',
      [userId, workspaceId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    if (access[0].role === 'viewer') {
      return res.status(403).json({ error: 'You do not have permission to edit files' });
    }

    // Update the file
    const [result] = await pool.query(
      `UPDATE workspace_files 
       SET content = ?, language = ?
       WHERE id = ? AND workspace_id = ? AND type = 'file'`,
      [content, language || null, fileId, workspaceId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ message: 'File updated successfully' });
  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({ error: 'Server error updating file' });
  }
};

// Rename a file or folder
const renameFileOrFolder = async (req, res) => {
  const { workspaceId, fileId } = req.params;
  const { name } = req.body;
  const userId = req.user.id;

  try {
    // Check if user has access to the workspace and has permission to edit
    const [access] = await pool.query(
      'SELECT role FROM user_workspaces WHERE user_id = ? AND workspace_id = ?',
      [userId, workspaceId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    if (access[0].role === 'viewer') {
      return res.status(403).json({ error: 'You do not have permission to rename files' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Get current file info
    const [files] = await pool.query(
      'SELECT parent_id, path, type FROM workspace_files WHERE id = ? AND workspace_id = ?',
      [fileId, workspaceId]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: 'File or folder not found' });
    }

    const file = files[0];
    const oldPath = file.path;

    // Build new path
    let newPath = name;
    if (file.parent_id) {
      const [parent] = await pool.query(
        'SELECT path FROM workspace_files WHERE id = ?',
        [file.parent_id]
      );
      newPath = `${parent[0].path}/${name}`;
    }

    // Update the file/folder name and path
    await pool.query(
      'UPDATE workspace_files SET name = ?, path = ? WHERE id = ?',
      [name, newPath, fileId]
    );

    // If it's a folder, update all children paths
    if (file.type === 'folder') {
      const [children] = await pool.query(
        'SELECT id, path FROM workspace_files WHERE path LIKE ? AND workspace_id = ?',
        [`${oldPath}/%`, workspaceId]
      );

      for (const child of children) {
        const updatedPath = child.path.replace(oldPath, newPath);
        await pool.query(
          'UPDATE workspace_files SET path = ? WHERE id = ?',
          [updatedPath, child.id]
        );
      }
    }

    res.json({ message: 'Renamed successfully' });
  } catch (error) {
    console.error('Rename file/folder error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A file or folder with this name already exists in this location' });
    }
    res.status(500).json({ error: 'Server error renaming file/folder' });
  }
};

// Delete a file or folder
const deleteFileOrFolder = async (req, res) => {
  const { workspaceId, fileId } = req.params;
  const userId = req.user.id;

  try {
    // Check if user has access to the workspace and has permission to delete
    const [access] = await pool.query(
      'SELECT role FROM user_workspaces WHERE user_id = ? AND workspace_id = ?',
      [userId, workspaceId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    if (access[0].role === 'viewer') {
      return res.status(403).json({ error: 'You do not have permission to delete files' });
    }

    // Delete the file/folder (CASCADE will handle children)
    const [result] = await pool.query(
      'DELETE FROM workspace_files WHERE id = ? AND workspace_id = ?',
      [fileId, workspaceId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'File or folder not found' });
    }

    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Delete file/folder error:', error);
    res.status(500).json({ error: 'Server error deleting file/folder' });
  }
};

module.exports = {
  getWorkspaceFiles,
  getFile,
  createFileOrFolder,
  updateFile,
  renameFileOrFolder,
  deleteFileOrFolder
};
