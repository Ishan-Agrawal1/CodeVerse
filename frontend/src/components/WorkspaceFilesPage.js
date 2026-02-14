import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Navbar from './Navbar';
import { useAuth } from '../contexts/AuthContext';
import './WorkspaceFilesPage.css';

function WorkspaceFilesPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workspaceInfo, setWorkspaceInfo] = useState(null);
  const [files, setFiles] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileModal, setShowFileModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('file');
  const [newItemParent, setNewItemParent] = useState(null);
  const [showMembersSidebar, setShowMembersSidebar] = useState(true);

  useEffect(() => {
    fetchWorkspaceInfo();
    fetchFiles();
  }, [workspaceId]);

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

  const fetchWorkspaceInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/workspaces/${workspaceId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setWorkspaceInfo(response.data.workspace);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching workspace info:', error);
      toast.error('Failed to load workspace');
      navigate('/');
    }
  };

  const handleFileSelect = (file) => {
    if (file.type === 'file') {
      setSelectedFile(file);
      setShowFileModal(true);
    } else {
      toggleFolder(file.id);
    }
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

  const flattenFileTree = (nodes, level = 0, result = []) => {
    nodes.forEach(node => {
      result.push({ ...node, level });
      if (node.type === 'folder' && expandedFolders.has(node.id) && node.children.length > 0) {
        flattenFileTree(node.children, level + 1, result);
      }
    });
    return result;
  };

  const handleNewItem = (type, parentId = null) => {
    setNewItemType(type);
    setNewItemParent(parentId);
    setNewItemName('');
    setShowNewItemModal(true);
  };

  const createNewItem = async () => {
    if (!newItemName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/workspaces/${workspaceId}/files`,
        {
          name: newItemName,
          type: newItemType,
          parentId: newItemParent,
          content: newItemType === 'file' ? '' : null,
          language: newItemType === 'file' ? 'javascript' : null
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      toast.success(`${newItemType === 'file' ? 'File' : 'Folder'} created successfully`);
      setShowNewItemModal(false);
      setNewItemName('');
      fetchFiles();
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error(error.response?.data?.error || 'Failed to create item');
    }
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
  };

  const handleOpenEditor = () => {
    navigate(`/editor/${workspaceId}`, {
      state: {
        username: user?.username,
      }
    });
  };

  const handleDeleteWorkspace = async () => {
    const confirmDelete = window.confirm(
      `Are you sure you want to DELETE this workspace?\n\nThis will PERMANENTLY DELETE the workspace for ALL users including all files and collaborators.\n\nThis action cannot be undone!`
    );
    
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/workspaces/${workspaceId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Workspace deleted permanently for all users');
      navigate('/');
    } catch (error) {
      console.error('Error deleting workspace:', error);
      toast.error(error.response?.data?.error || 'Failed to delete workspace');
    }
  };

  const handleLeaveWorkspace = async () => {
    const confirmLeave = window.confirm(
      'Are you sure you want to leave this workspace?\n\nThis will remove the workspace from your list only. Other collaborators will not be affected.\n\nYou can rejoin later if invited again.'
    );
    
    if (!confirmLeave) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/workspaces/${workspaceId}/leave`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('You have left the workspace');
      navigate('/');
    } catch (error) {
      console.error('Error leaving workspace:', error);
      toast.error(error.response?.data?.error || 'Failed to leave workspace');
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'owner':
        return 'badge bg-primary';
      case 'collaborator':
        return 'badge bg-success';
      case 'viewer':
        return 'badge bg-secondary';
      default:
        return 'badge bg-info';
    }
  };

  const getLanguageForSyntax = (language) => {
    const languageMap = {
      'javascript': 'javascript',
      'python': 'python',
      'python3': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'html': 'html',
      'css': 'css',
      'json': 'json',
    };
    return languageMap[language] || 'plaintext';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (content) => {
    if (!content) return '0 KB';
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="d-flex justify-content-center align-items-center min-vh-100">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  const fileTree = buildFileTree(files);
  const flatFiles = flattenFileTree(fileTree);

  return (
    <div className="workspace-files-page">
      <Navbar />
      
      <div className="workspace-header">
        <div className="container-fluid py-3">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="d-flex align-items-center">
                <button 
                  className="btn btn-outline-secondary me-3"
                  onClick={() => navigate('/')}
                  title="Back to Workspaces"
                >
                  <i className="bi bi-arrow-left me-1"></i>
                  Back
                </button>
                <div>
                  <h3 className="mb-1">{workspaceInfo?.name}</h3>
                  <div>
                    <span className={getRoleBadgeClass(workspaceInfo?.userRole)}>
                      {workspaceInfo?.userRole}
                    </span>
                    <span className="badge bg-light text-dark ms-2">
                      {workspaceInfo?.language}
                    </span>
                    <span className="text-muted ms-2">
                      <i className="bi bi-person me-1"></i>
                      {workspaceInfo?.owner_name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6 text-end">
              <button 
                className="btn btn-primary btn-lg me-2"
                onClick={handleOpenEditor}
                title="Open collaborative code editor for real-time editing"
              >
                <i className="bi bi-code-slash me-2"></i>
                Open Editor
              </button>
              {workspaceInfo?.userRole === 'owner' ? (
                <button 
                  className="btn btn-outline-danger"
                  onClick={handleDeleteWorkspace}
                >
                  <i className="bi bi-trash"></i>
                </button>
              ) : (
                <button 
                  className="btn btn-outline-warning"
                  onClick={handleLeaveWorkspace}
                >
                  <i className="bi bi-box-arrow-left"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="workspace-main-content">
        {/* Members Sidebar */}
        {showMembersSidebar && (
          <div className="members-sidebar">
            <div className="members-sidebar-header">
              <h6>
                <i className="bi bi-people-fill me-2"></i>
                Members ({workspaceInfo?.collaborators?.length || 0})
              </h6>
              <button 
                className="btn btn-sm btn-link p-0"
                onClick={() => setShowMembersSidebar(false)}
                title="Hide sidebar"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="members-list">
              {workspaceInfo?.collaborators?.map(member => (
                <div key={member.id} className="member-item">
                  <div className="member-info">
                    <div className="member-avatar">
                      <i className="bi bi-person-circle"></i>
                    </div>
                    <div className="member-details">
                      <div className="member-name">{member.username}</div>
                      <div className="member-joined">
                        Joined {formatDate(member.joined_at)}
                      </div>
                    </div>
                  </div>
                  <span className={`badge member-role-badge ${member.role}`}>
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files Content Area */}
        <div className="workspace-content-table">
          <div className="container-fluid">
            <div className="files-toolbar">
              <div>
                <h5>
                  <i className="bi bi-folder2-open me-2"></i>
                  Files & Folders
                </h5>
              </div>
              <div>
                {!showMembersSidebar && (
                  <button 
                    className="btn btn-sm btn-outline-secondary me-2"
                    onClick={() => setShowMembersSidebar(true)}
                  >
                    <i className="bi bi-people me-1"></i>
                    Show Members
                  </button>
                )}
                <button 
                  className="btn btn-sm btn-success me-2"
                  onClick={() => handleNewItem('file')}
                >
                  <i className="bi bi-file-earmark-plus me-1"></i>
                  New File
                </button>
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => handleNewItem('folder')}
                >
                  <i className="bi bi-folder-plus me-1"></i>
                  New Folder
                </button>
              </div>
            </div>

          {flatFiles.length === 0 ? (
            <div className="empty-files-state">
              <i className="bi bi-folder2-open" style={{ fontSize: '4rem', color: '#ccc' }}></i>
              <h4 className="mt-3 text-muted">No files yet</h4>
              <p className="text-muted">Create a file or folder to get started</p>
              <button 
                className="btn btn-primary mt-2"
                onClick={() => handleNewItem('file')}
              >
                <i className="bi bi-file-earmark-plus me-2"></i>
                Create Your First File
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover files-table">
                <thead>
                  <tr>
                    <th style={{ width: '50%' }}>Name</th>
                    <th style={{ width: '15%' }}>Type</th>
                    <th style={{ width: '15%' }}>Size</th>
                    <th style={{ width: '15%' }}>Modified</th>
                    <th style={{ width: '5%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flatFiles.map(file => (
                    <tr 
                      key={file.id}
                      className="file-row"
                      onClick={() => handleFileSelect(file)}
                    >
                      <td>
                        <div style={{ paddingLeft: `${file.level * 30}px` }} className="d-flex align-items-center">
                          {file.type === 'folder' ? (
                            <>
                              <i className={`bi ${expandedFolders.has(file.id) ? 'bi-folder2-open' : 'bi-folder2'} me-2 text-warning`}></i>
                              <strong>{file.name}</strong>
                            </>
                          ) : (
                            <>
                              <i className="bi bi-file-earmark-text me-2 text-primary"></i>
                              {file.name}
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        {file.type === 'folder' ? (
                          <span className="badge bg-secondary">Folder</span>
                        ) : (
                          <span className="badge bg-info">{file.language || 'File'}</span>
                        )}
                      </td>
                      <td>
                        {file.type === 'file' ? formatFileSize(file.content) : '-'}
                      </td>
                      <td className="text-muted small">
                        {formatDate(file.updated_at)}
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm" onClick={(e) => e.stopPropagation()}>
                          {file.type === 'folder' && (
                            <>
                              <button 
                                className="btn btn-outline-secondary"
                                onClick={() => handleNewItem('file', file.id)}
                                title="New file in folder"
                              >
                                <i className="bi bi-file-earmark-plus"></i>
                              </button>
                              <button 
                                className="btn btn-outline-secondary"
                                onClick={() => handleNewItem('folder', file.id)}
                                title="New folder"
                              >
                                <i className="bi bi-folder-plus"></i>
                              </button>
                            </>
                          )}
                          <button 
                            className="btn btn-outline-primary"
                            onClick={() => handleRename(file)}
                            title="Rename"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button 
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(file)}
                            title="Delete"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </div> {/* End workspace-main-content */}

      {/* File View Modal */}
      {showFileModal && selectedFile && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-file-earmark-code me-2"></i>
                  {selectedFile.name}
                  <span className="badge bg-secondary ms-2">Read Only</span>
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowFileModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <pre className="file-content-modal">
                  <code className={`language-${getLanguageForSyntax(selectedFile.language)}`}>
                    {selectedFile.content || '// Empty file'}
                  </code>
                </pre>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowFileModal(false)}
                >
                  Close
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleOpenEditor}
                >
                  <i className="bi bi-pencil-square me-2"></i>
                  Edit in Editor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showFileModal && <div className="modal-backdrop show"></div>}

      {/* New Item Modal */}
      {showNewItemModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Create New {newItemType === 'file' ? 'File' : 'Folder'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowNewItemModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createNewItem()}
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowNewItemModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={createNewItem}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showNewItemModal && <div className="modal-backdrop show"></div>}
    </div>
  );
}

export default WorkspaceFilesPage;
