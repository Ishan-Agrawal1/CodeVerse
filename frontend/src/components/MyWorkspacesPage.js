import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  Clock3,
  Code,
  FolderKanban,
  PlusCircle,
  Trash2,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import Navbar from './Navbar';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import JoinWorkspaceModal from './JoinWorkspaceModal';
import Button from './ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../config/api';

function MyWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const API_URL = API_ENDPOINTS.workspaces;

  const fetchWorkspaces = useCallback(async () => {
    try {
      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setWorkspaces(response.data.workspaces || []);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      toast.error('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleWorkspaceClick = (workspaceId) => {
    navigate(`/workspace/${workspaceId}`, {
      state: {
        username: user?.username,
      },
    });
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchWorkspaces();
  };

  const handleJoinSuccess = () => {
    setShowJoinModal(false);
    fetchWorkspaces();
  };

  const handleDeleteWorkspace = async (workspaceId, workspaceName, e) => {
    e.stopPropagation();

    const confirmDelete = window.confirm(
      `Are you sure you want to DELETE "${workspaceName}"?\n\nThis will PERMANENTLY DELETE the workspace for ALL users including all files and collaborators.\n\nThis action cannot be undone!`
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_URL}/${workspaceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success('Workspace deleted permanently for all users');
      fetchWorkspaces();
    } catch (error) {
      console.error('Error deleting workspace:', error);
      toast.error(error.response?.data?.error || 'Failed to delete workspace');
    }
  };

  const handleLeaveWorkspace = async (workspaceId, workspaceName, e) => {
    e.stopPropagation();

    const confirmLeave = window.confirm(
      `Are you sure you want to leave "${workspaceName}"?\n\nThis will remove the workspace from your list only. Other collaborators will not be affected.\n\nYou can rejoin later if invited again.`
    );

    if (!confirmLeave) return;

    try {
      await axios.post(`${API_URL}/${workspaceId}/leave`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success('You have left the workspace');
      fetchWorkspaces();
    } catch (error) {
      console.error('Error leaving workspace:', error);
      toast.error(error.response?.data?.error || 'Failed to leave workspace');
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-primary';
      case 'collaborator':
        return 'bg-success';
      case 'viewer':
        return 'bg-secondary';
      default:
        return 'bg-info';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1118]">
        <Navbar />
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1118]">
      <Navbar />

      <main className="mx-auto max-w-[1600px] px-4 py-8 md:px-8 md:py-12">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              My Workspaces
            </h1>
            <p className="text-base text-slate-400">
              Welcome back, <span className="font-semibold text-slate-300">{user?.username}</span>. System analysis complete. All services operational.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button
              onClick={() => setShowCreateModal(true)}
              className="group flex items-center justify-center gap-2 rounded-md bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white sm:w-auto"
            >
              <PlusCircle size={18} className="text-slate-400 group-hover:text-white" />
              CREATE WORKSPACE
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="group flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white sm:w-auto"
            >
              <Users size={18} className="text-slate-400 group-hover:text-white" />
              JOIN WORKSPACE
            </button>
          </div>
        </div>

        {workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800/60 bg-[#0D1B2A]/40 py-24 backdrop-blur-sm">
            <div className="mb-4 rounded-xl bg-slate-800/50 p-4">
              <FolderKanban size={48} className="text-slate-400" />
            </div>
            <h3 className="mb-2 text-xl font-semibold uppercase tracking-widest text-slate-200">
              Need a new environment?
            </h3>
            <p className="mb-8 text-center text-slate-400 max-w-md">
              Create a fresh containerized workspace in seconds.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-md border border-slate-700 px-6 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              >
                VIEW TEMPLATES
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                onClick={() => handleWorkspaceClick(workspace.id)}
                className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-slate-800/60 bg-[#111C28] p-6 transition-all hover:border-slate-700 hover:bg-[#162436]"
              >
                <div className="absolute top-4 right-4 h-2 w-2 rounded-sm bg-slate-600"></div>
                
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white transition-colors group-hover:text-cyan-400">
                      {workspace.name}
                    </h3>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {workspace.role === 'owner' ? 'Owner' : 'Collaborator'}
                    </span>
                  </div>

                  <p className="mb-6 line-clamp-2 text-sm text-slate-400">
                    {workspace.description || 'No description provided.'}
                  </p>

                  <div className="mb-8 flex flex-wrap gap-2">
                    <span className="rounded bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-medium uppercase text-slate-400">
                      {workspace.language || 'Code'}
                    </span>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-slate-800/60 pt-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium tracking-wide">
                    <Clock3 size={14} />
                    MODIFIED {formatDate(workspace.last_accessed || workspace.createdAt).toUpperCase()}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium tracking-wide">
                    {workspace.role !== 'owner' && (
                        <>
                           OWNER: {workspace.owner_name?.toUpperCase() || '-'}
                        </>
                    )}
                  </div>


                  <div className="flex items-center gap-2">
                    {workspace.role === 'owner' ? (
                      <button
                        onClick={(e) => handleDeleteWorkspace(workspace.id, workspace.name, e)}
                        className="rounded-md p-2 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        title="Delete Workspace (Owner Only)"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleLeaveWorkspace(workspace.id, workspace.name, e)}
                        className="rounded-md p-2 text-slate-500 transition-colors hover:bg-amber-500/10 hover:text-amber-400"
                        title="Leave Workspace"
                      >
                        <UserX size={16} />
                      </button>
                    )}
                    <button
                      className="flex items-center gap-2 rounded bg-slate-200/90 px-4 py-2 text-sm font-bold text-slate-900 transition-colors hover:bg-white"
                    >
                      OPEN <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modals */}
        {showCreateModal && (
          <CreateWorkspaceModal
            show={showCreateModal}
            onHide={() => setShowCreateModal(false)}
            onSuccess={handleCreateSuccess}
          />
        )}

        {showJoinModal && (
          <JoinWorkspaceModal
            show={showJoinModal}
            onHide={() => setShowJoinModal(false)}
            onSuccess={handleJoinSuccess}
          />
        )}
      </main>
      
      <footer className="mt-auto border-t border-slate-800/50 bg-[#0A1118]/80 py-6 text-center backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-4 px-4 text-xs font-medium tracking-widest text-slate-500 sm:flex-row md:px-8">
          <span>© 2024 CODEVERSE ARCHITECTURAL UI. SYSTEM BUILD V4.2.0</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-300 transition-colors">DOCUMENTATION</a>
            <a href="#" className="hover:text-slate-300 transition-colors">API STATUS</a>
            <a href="#" className="hover:text-slate-300 transition-colors">PRIVACY</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MyWorkspacesPage;
