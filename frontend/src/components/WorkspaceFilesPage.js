import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Copy,
  MessageSquare,
  Code2,
  Trash2,
  FilePlus,
  FolderPlus,
  Upload,
  RefreshCw,
  Folder,
  FileText,
  UserPlus,
  HelpCircle,
  List,
  Grid,
  Pencil
} from 'lucide-react';
import Navbar from './Navbar';
import UserChat from './UserChat';
import { useAuth } from '../contexts/AuthContext';
import { initSocket } from '../Socket';
import { ACTIONS } from '../Actions';
import { API_ENDPOINTS } from '../config/api';

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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const socketRef = useRef(null);

  const initializeSocket = useCallback(async () => {
    try {
      socketRef.current = await initSocket();
      socketRef.current.emit(ACTIONS.JOIN, {
        roomId: workspaceId,
        username: user?.username,
      });
    } catch (error) {
      console.error('Socket connection error:', error);
    }
  }, [workspaceId, user?.username]);

  const fetchFiles = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_ENDPOINTS.workspaces}/${workspaceId}/files`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setFiles(response.data.files);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    }
  }, [workspaceId]);

  const fetchWorkspaceInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_ENDPOINTS.workspaces}/${workspaceId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setWorkspaceInfo(response.data.workspace);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching workspace info:', error);
      toast.error('Failed to load workspace');
      navigate('/dashboard');
    }
  }, [workspaceId, navigate]);

  useEffect(() => {
    fetchWorkspaceInfo();
    fetchFiles();
    initializeSocket();
  }, [fetchWorkspaceInfo, fetchFiles, initializeSocket]);

  const copyWorkspaceId = () => {
    navigator.clipboard.writeText(workspaceId);
    toast.success('Workspace ID copied to clipboard');
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
        `${API_ENDPOINTS.workspaces}/${workspaceId}/files`,
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

  const handleDelete = async (file, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ${file.name}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_ENDPOINTS.workspaces}/${workspaceId}/files/${file.id}`,
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

  const handleRename = async (file, e) => {
    if (e) e.stopPropagation();
    const newName = prompt('Enter new name:', file.name);
    if (!newName || newName === file.name) return;

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_ENDPOINTS.workspaces}/${workspaceId}/files/${file.id}/rename`,
        { name: newName },
        { headers: { Authorization: `Bearer ${token}` } }
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
        `${API_ENDPOINTS.workspaces}/${workspaceId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Workspace deleted permanently for all users');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting workspace:', error);
      toast.error(error.response?.data?.error || 'Failed to delete workspace');
    }
  };

  const formatFileSize = (content) => {
    if (!content) return '--';
    const bytes = new Blob([content]).size;
    if (bytes === 0) return '--';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const diffMinutes = Math.floor(diff / 60000);
    const diffHours = Math.floor(diff / 3600000);
    const diffDays = Math.floor(diff / 86400000);

    if (diffMinutes < 60) return `${diffMinutes} mins ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0a0c10]">
        <Navbar />
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  const fileTree = buildFileTree(files);
  const flatFiles = flattenFileTree(fileTree);

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0c10]">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-slate-800/60 bg-[#111C28] md:flex">
          <div className="p-6">
            <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-500">
              Workspace Members
            </h2>
            
            <div className="space-y-4">
              {workspaceInfo?.collaborators?.map(member => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-300">
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="truncate text-sm font-medium text-slate-200">{member.username}</div>
                    <div className="text-xs text-slate-500">{member.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto border-t border-slate-800/60 p-4">
            <button className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-800/50 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
              <UserPlus size={16} />
              Invite Member
            </button>
            <button className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-300">
              <HelpCircle size={16} />
              Support
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto max-w-[1200px]">
            {/* Header Section */}
            <div className="mb-8">
              <button 
                onClick={() => navigate('/workspaces')}
                className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-300"
              >
                <ArrowLeft size={16} />
                Back to Workspaces
              </button>
              
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                <div>
                  <h1 className="mb-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
                    Workspace: <span className="text-slate-400">{workspaceInfo?.name}</span>
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-2 rounded-md bg-[#162436] px-3 py-1">
                      <span>ID: {workspaceId.substring(0, 12)}</span>
                      <button onClick={copyWorkspaceId} className="hover:text-white" title="Copy ID">
                        <Copy size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                      Active Instance
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className="flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
                  >
                    <MessageSquare size={16} />
                    Open Chat
                  </button>
                  <button
                    onClick={handleOpenEditor}
                    className="flex items-center gap-2 rounded-md bg-slate-200 px-4 py-2 text-sm font-bold text-slate-900 transition-colors hover:bg-white"
                  >
                    <Code2 size={16} />
                    Open Editor
                  </button>
                  {workspaceInfo?.userRole === 'owner' && (
                    <button
                      onClick={handleDeleteWorkspace}
                      className="ml-auto flex items-center gap-2 rounded-md bg-red-950/40 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/60 lg:ml-2"
                    >
                      Delete Workspace
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* File Explorer Card */}
            <div className="mb-8 min-h-[480px] rounded-xl border border-slate-800/60 bg-[#111C28] overflow-hidden">
              {/* File Explorer Toolbar */}
              <div className="flex items-center justify-between border-b border-slate-800/60 bg-[#162436] p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 border-r border-slate-700/50 pr-4">
                    <button 
                      onClick={() => handleNewItem('file')}
                      className="p-1.5 text-slate-400 transition-colors hover:text-white" 
                      title="New File"
                    >
                      <FilePlus size={18} />
                    </button>
                    <button 
                      onClick={() => handleNewItem('folder')}
                      className="p-1.5 text-slate-400 transition-colors hover:text-white" 
                      title="New Folder"
                    >
                      <FolderPlus size={18} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 border-r border-slate-700/50 pr-4">
                    <button className="p-1.5 text-slate-400 transition-colors hover:text-white" title="Upload">
                      <Upload size={18} />
                    </button>
                    <button 
                      onClick={fetchFiles}
                      className="p-1.5 text-slate-400 transition-colors hover:text-white" 
                      title="Refresh"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                  <div className="hidden items-center gap-2 text-xs font-medium tracking-wide text-slate-500 sm:flex">
                    <span>ROOT</span>
                    <span>/</span>
                    <span className="text-slate-300">{workspaceInfo?.name}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-md bg-slate-900 p-1">
                    <button className="rounded bg-slate-700 p-1 text-white shadow-sm">
                      <List size={14} />
                    </button>
                    <button className="p-1 text-slate-400 hover:text-slate-300">
                      <Grid size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Files Table Empty State / List */}
              {flatFiles.length === 0 ? (
                <div className="flex min-h-[520px] flex-col items-center justify-center p-12 text-center">
                  <div className="mb-4 rounded-xl bg-slate-800/40 p-4">
                    <Folder className="h-12 w-12 text-slate-500" />
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-slate-200">No files yet</h3>
                  <p className="mb-6 text-sm text-slate-400">Create a file or folder to get started with your project.</p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleNewItem('file')}
                      className="flex items-center gap-2 rounded-md border border-slate-700 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                    >
                      <FilePlus size={16} />
                      New File
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-[520px] w-full overflow-x-auto overflow-y-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="border-b border-slate-800/60 bg-[#162436]/50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-6 py-4 font-medium">Name</th>
                        <th className="px-6 py-4 font-medium">Type</th>
                        <th className="px-6 py-4 font-medium">Size</th>
                        <th className="px-6 py-4 font-medium">Modified</th>
                        <th className="px-6 py-4 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {flatFiles.map((file) => (
                        <tr 
                          key={file.id} 
                          className="group transition-colors hover:bg-slate-800/20"
                        >
                          <td className="px-6 py-3">
                            <div 
                              className="flex cursor-pointer items-center gap-3"
                              style={{ paddingLeft: `${file.level * 24}px` }}
                              onClick={() => handleFileSelect(file)}
                            >
                              {file.type === 'folder' ? (
                                <Folder 
                                  size={18} 
                                  className={expandedFolders.has(file.id) ? "fill-current text-slate-400" : "text-slate-400"} 
                                />
                              ) : (
                                <FileText size={18} className="text-slate-500" />
                              )}
                              <span className={`font-medium ${file.type === 'folder' ? 'text-white' : 'text-slate-300 group-hover:text-cyan-400 transition-colors'}`}>
                                {file.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-slate-500">
                            {file.type === 'folder' ? 'Directory' : (file.language || 'File')}
                          </td>
                          <td className="px-6 py-3 text-slate-500">
                            {formatFileSize(file.content)}
                          </td>
                          <td className="px-6 py-3 text-slate-500">
                            {formatDate(file.updated_at)}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                              {file.type === 'folder' && (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleNewItem('file', file.id); }}
                                    className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white"
                                    title="New file inside"
                                  >
                                    <FilePlus size={16} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleNewItem('folder', file.id); }}
                                    className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white"
                                    title="New folder inside"
                                  >
                                    <FolderPlus size={16} />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={(e) => handleRename(file, e)}
                                className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white"
                                title="Rename"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={(e) => handleDelete(file, e)}
                                className="rounded p-1.5 text-slate-500 hover:bg-red-950/50 hover:text-red-400"
                                title="Delete"
                              >
                                <Trash2 size={16} />
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
        </main>
      </div>

      {/* File View Modal */}
      {showFileModal && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#111C28] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#162436] px-6 py-4">
              <div className="flex items-center gap-3">
                <FileText className="text-slate-400" size={20} />
                <h3 className="text-lg font-medium text-white">{selectedFile.name}</h3>
                <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Read Only</span>
              </div>
              <button onClick={() => setShowFileModal(false)} className="text-slate-400 hover:text-white">
                <span aria-hidden="true" className="text-xl leading-none">✕</span>
                <span className="sr-only">Close</span>
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-[#0A1118] p-6 font-mono text-sm text-slate-300">
              <pre className="whitespace-pre-wrap word-break">
                <code>{selectedFile.content || '// Empty file'}</code>
              </pre>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-[#162436] px-6 py-4">
              <button
                onClick={() => setShowFileModal(false)}
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={handleOpenEditor}
                className="flex items-center gap-2 rounded-md bg-slate-200 px-4 py-2 text-sm font-bold text-slate-900 transition-colors hover:bg-white"
              >
                <Code2 size={16} />
                Edit in Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Item Modal */}
      {showNewItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-700 bg-[#111C28] shadow-2xl">
            <div className="border-b border-slate-800 px-6 py-4">
              <h3 className="text-lg font-medium text-white">
                Create New {newItemType === 'file' ? 'File' : 'Folder'}
              </h3>
            </div>
            <div className="px-6 py-6">
              <input
                type="text"
                placeholder="Name"
                className="w-full rounded-md border border-slate-700 bg-[#0A1118] px-4 py-2 text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createNewItem()}
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-[#162436] px-6 py-4">
              <button
                onClick={() => setShowNewItemModal(false)}
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={createNewItem}
                className="rounded-md bg-slate-200 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-white"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <UserChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        workspaceId={workspaceId}
        socketRef={socketRef}
      />
    </div>
  );
}

export default WorkspaceFilesPage;
