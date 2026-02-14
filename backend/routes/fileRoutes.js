const express = require('express');
const router = express.Router();
const {
  getWorkspaceFiles,
  getFile,
  createFileOrFolder,
  updateFile,
  renameFileOrFolder,
  deleteFileOrFolder
} = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Get all files and folders for a workspace
router.get('/:workspaceId/files', getWorkspaceFiles);

// Get a specific file
router.get('/:workspaceId/files/:fileId', getFile);

// Create a new file or folder
router.post('/:workspaceId/files', createFileOrFolder);

// Update a file's content
router.patch('/:workspaceId/files/:fileId', updateFile);

// Rename a file or folder
router.patch('/:workspaceId/files/:fileId/rename', renameFileOrFolder);

// Delete a file or folder
router.delete('/:workspaceId/files/:fileId', deleteFileOrFolder);

module.exports = router;
