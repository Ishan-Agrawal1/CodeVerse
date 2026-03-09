import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import './FileExplorer.css';

const FileExplorer = ({ workspaceId, onFileSelect, onOpenInEditor }) => {
  const [files, setFiles] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [selectedFile, setSelectedFile] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  // Inline input state (VS Code style) - null when not active
  // { type: 'file'|'folder', parentId: null|number }
  const [inlineInput, setInlineInput] = useState(null);
  const [inlineInputValue, setInlineInputValue] = useState('');
  const inlineInputRef = useRef(null);

  useEffect(() => {
    fetchFiles();
  }, [workspaceId]);

  // Auto-focus the inline input when it appears
  useEffect(() => {
    if (inlineInput && inlineInputRef.current) {
      inlineInputRef.current.focus();
    }
  }, [inlineInput]);

  const fetchFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/workspaces/${workspaceId}/files`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setFiles(response.data.files);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    }
  };

  const buildFileTree = (files) => {
    const fileMap = new Map();
    const roots = [];

    files.forEach(file => {
      fileMap.set(file.id, { ...file, children: [] });
    });

    files.forEach(file => {
      const node = fileMap.get(file.id);
      if (file.parent_id === null) {
        roots.push(node);
      } else {
        const parent = fileMap.get(file.parent_id);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    return roots;
  };

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileClick = async (file) => {
    if (file.type === 'folder') {
      toggleFolder(file.id);
    } else {
      setSelectedFile(file.id);
      if (onFileSelect) {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(
            `http://localhost:5000/api/workspaces/${workspaceId}/files/${file.id}`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          onFileSelect(response.data.file);
        } catch (error) {
          console.error('Error fetching file:', error);
          toast.error('Failed to load file content');
        }
      }
    }
  };

  const handleContextMenu = (e, file) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleNewItem = (type, parentId = null) => {
    // Auto-expand folder so the inline input is visible inside it
    if (parentId !== null) {
      setExpandedFolders(prev => new Set([...prev, parentId]));
    }
    setInlineInput({ type, parentId });
    setInlineInputValue('');
    closeContextMenu();
  };

  const commitInlineInput = async () => {
    const name = inlineInputValue.trim();
    if (!name) {
      setInlineInput(null);
      setInlineInputValue('');
      return;
    }

    const { type, parentId } = inlineInput;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/workspaces/${workspaceId}/files`,
        {
          name,
          type,
          parentId,
          content: type === 'file' ? '' : null,
          language: type === 'file' ? 'javascript' : null
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(`${type === 'file' ? 'File' : 'Folder'} created successfully`);
      fetchFiles();
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error(error.response?.data?.error || 'Failed to create item');
    }

    setInlineInput(null);
    setInlineInputValue('');
  };

  const cancelInlineInput = () => {
    setInlineInput(null);
    setInlineInputValue('');
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Are you sure you want to delete ${file.name}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/workspaces/${workspaceId}/files/${file.id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success('Deleted successfully');
      fetchFiles();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete');
    }
    closeContextMenu();
  };

  const handleRename = async (file) => {
    const newName = prompt('Enter new name:', file.name);
    if (!newName || newName === file.name) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:5000/api/workspaces/${workspaceId}/files/${file.id}/rename`,
        { name: newName },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success('Renamed successfully');
      fetchFiles();
    } catch (error) {
      console.error('Error renaming:', error);
      toast.error(error.response?.data?.error || 'Failed to rename');
    }
    closeContextMenu();
  };

  const handleOpenInEditor = (file) => {
    if (file.type === 'file' && onOpenInEditor) {
      onOpenInEditor(file);
    }
    closeContextMenu();
  };

  // Renders the inline input row (VS Code style)
  const renderInlineInput = (level) => {
    if (!inlineInput) return null;
    return (
      <div style={{ marginLeft: `${level * 20}px` }}>
        <div className="file-item inline-input-row">
          <span className="file-icon">
            {inlineInput.type === 'folder' ? '📁' : '📄'}
          </span>
          <input
            ref={inlineInputRef}
            className="inline-file-input"
            type="text"
            value={inlineInputValue}
            onChange={(e) => setInlineInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitInlineInput();
              } else if (e.key === 'Escape') {
                cancelInlineInput();
              }
            }}
            onBlur={commitInlineInput}
            placeholder={inlineInput.type === 'folder' ? 'Folder name' : 'File name'}
          />
        </div>
      </div>
    );
  };

  const renderFileTree = (nodes, level = 0, parentId = null) => {
    return (
      <>
        {nodes.map(node => (
          <div key={node.id} style={{ marginLeft: `${level * 20}px` }}>
            <div
              className={`file-item ${selectedFile === node.id ? 'selected' : ''} ${node.type === 'folder' ? 'folder' : 'file'}`}
              onClick={() => handleFileClick(node)}
              onContextMenu={(e) => handleContextMenu(e, node)}
            >
              <span className="file-icon">
                {node.type === 'folder' ? (
                  expandedFolders.has(node.id) ? '📂' : '📁'
                ) : (
                  '📄'
                )}
              </span>
              <span className="file-name">{node.name}</span>
              {node.type === 'file' && onOpenInEditor && (
                <button
                  className="btn-open-editor"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenInEditor(node);
                  }}
                  title="Open in Editor"
                >
                  ✏️
                </button>
              )}
            </div>
            {node.type === 'folder' && expandedFolders.has(node.id) && (
              <div className="folder-contents">
                {/* Show inline input inside this folder if it's the target parent */}
                {inlineInput && inlineInput.parentId === node.id && renderInlineInput(level + 1)}
                {node.children.length > 0 && renderFileTree(node.children, level + 1, node.id)}
              </div>
            )}
          </div>
        ))}
        {/* Show inline input at root level after all root nodes */}
        {parentId === null && inlineInput && inlineInput.parentId === null && renderInlineInput(level)}
      </>
    );
  };

  const fileTree = buildFileTree(files);

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <h4>Files</h4>
        <div className="file-explorer-actions">
          <button
            className="btn btn-sm btn-success me-1"
            onClick={() => handleNewItem('file')}
            title="New File"
          >
            📄+
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => handleNewItem('folder')}
            title="New Folder"
          >
            📁+
          </button>
        </div>
      </div>

      <div className="file-tree">
        {fileTree.length === 0 && !inlineInput ? (
          <div className="empty-state">
            <p>No files yet</p>
            <p className="text-muted">Create a file or folder to get started</p>
          </div>
        ) : (
          renderFileTree(fileTree)
        )}
      </div>

      {contextMenu && (
        <>
          <div className="context-menu-backdrop" onClick={closeContextMenu} />
          <div
            className="context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            {contextMenu.file.type === 'file' && onOpenInEditor && (
              <div
                className="context-menu-item"
                onClick={() => handleOpenInEditor(contextMenu.file)}
              >
                Open in Editor
              </div>
            )}
            {contextMenu.file.type === 'folder' && (
              <>
                <div
                  className="context-menu-item"
                  onClick={() => handleNewItem('file', contextMenu.file.id)}
                >
                  New File
                </div>
                <div
                  className="context-menu-item"
                  onClick={() => handleNewItem('folder', contextMenu.file.id)}
                >
                  New Folder
                </div>
              </>
            )}
            <div
              className="context-menu-item"
              onClick={() => handleRename(contextMenu.file)}
            >
              Rename
            </div>
            <div
              className="context-menu-item danger"
              onClick={() => handleDelete(contextMenu.file)}
            >
              Delete
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FileExplorer;
