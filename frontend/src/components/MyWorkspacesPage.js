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
import './Dashboard.css';

function MyWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const API_URL = 'http://localhost:5000/api/workspaces';

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

  return (
    <div className="dashboard-page min-vh-100">
      <Navbar />

      <div className="container py-4 py-md-5">
        <section className="dashboard-hero mb-4 mb-lg-5">
          <div className="dashboard-hero__content">
            <p className="dashboard-kicker">Workspace Hub</p>
            <h1 className="dashboard-title">My Workspaces</h1>
            <p className="dashboard-subtitle">
              Open, manage, and collaborate on your coding spaces in one place.
            </p>
          </div>
          <div className="dashboard-hero__actions">
            <Button className="dashboard-cta dashboard-cta-primary" onClick={() => setShowCreateModal(true)}>
              <PlusCircle size={18} />
              Create Workspace
            </Button>
            <Button className="dashboard-cta dashboard-cta-secondary" variant="ghost" onClick={() => setShowJoinModal(true)}>
              <UserPlus size={18} />
              Join Workspace
            </Button>
          </div>
        </section>

        {workspaces.length === 0 ? (
          <div className="workspace-empty-state text-center py-5">
            <FolderKanban size={56} />
            <h4 className="mt-3">No workspaces yet</h4>
            <p>Create a new workspace or join an existing one to get started</p>
            <div className="mt-4 d-flex flex-column flex-sm-row justify-content-center gap-3">
              <Button className="dashboard-cta dashboard-cta-primary" onClick={() => setShowCreateModal(true)}>
                <PlusCircle size={18} />
                Create Workspace
              </Button>
              <Button className="dashboard-cta dashboard-cta-secondary" variant="ghost" onClick={() => setShowJoinModal(true)}>
                <UserPlus size={18} />
                Join Workspace
              </Button>
            </div>
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
            {workspaces.map((workspace) => (
              <div key={workspace.id} className="col">
                <div className="workspace-card" onClick={() => handleWorkspaceClick(workspace.id)}>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="card-title mb-0">{workspace.name}</h5>
                    <span className={`badge ${getRoleBadgeClass(workspace.role)}`}>
                      {workspace.role}
                    </span>
                  </div>
                  {workspace.description && (
                    <p className="card-text text-muted small mb-3">{workspace.description}</p>
                  )}
                  <div className="workspace-meta-row mb-2">
                    <Code size={16} />
                    <span className="badge bg-light text-dark">{workspace.language}</span>
                  </div>
                  <div className="workspace-meta-row mb-2">
                    <Users size={16} />
                    <small className="text-muted">Owner: {workspace.owner_name}</small>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                    <small className="text-muted d-flex align-items-center gap-1">
                      <Clock3 size={14} />
                      {formatDate(workspace.last_accessed)}
                    </small>
                    <div className="d-flex gap-2">
                      {workspace.role === 'owner' ? (
                        <Button
                          className="btn-sm"
                          variant="destructive"
                          size="sm"
                          onClick={(e) => handleDeleteWorkspace(workspace.id, workspace.name, e)}
                          title="Delete workspace permanently"
                        >
                          <Trash2 size={14} />
                        </Button>
                      ) : (
                        <Button
                          className="btn-sm"
                          variant="secondary"
                          size="sm"
                          onClick={(e) => handleLeaveWorkspace(workspace.id, workspace.name, e)}
                          title="Leave this workspace"
                        >
                          <UserX size={14} />
                        </Button>
                      )}
                      <Button
                        className="d-flex align-items-center gap-1"
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWorkspaceClick(workspace.id);
                        }}
                      >
                        Open
                        <ArrowRight size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateWorkspaceModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
      <JoinWorkspaceModal
        show={showJoinModal}
        onHide={() => setShowJoinModal(false)}
        onSuccess={handleJoinSuccess}
      />
    </div>
  );
}

export default MyWorkspacesPage;
