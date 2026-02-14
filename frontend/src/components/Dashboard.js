import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from './Navbar';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import JoinWorkspaceModal from './JoinWorkspaceModal';
import { useAuth } from '../contexts/AuthContext';

function Dashboard() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const API_URL = 'http://localhost:5000/api/workspaces';

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setWorkspaces(response.data.workspaces);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      toast.error('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceClick = (workspaceId) => {
    navigate(`/editor/${workspaceId}`, {
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
        <Navbar onCreateRoom={() => setShowCreateModal(true)} onJoinRoom={() => setShowJoinModal(true)} />
        <div className="d-flex justify-content-center align-items-center min-vh-100">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      <Navbar onCreateRoom={() => setShowCreateModal(true)} onJoinRoom={() => setShowJoinModal(true)} />

      <div className="container py-5">
        <div className="row mb-4">
          <div className="col">
            <h2 className="mb-1">My Workspaces</h2>
            <p className="text-muted">Collaborate on code in real-time</p>
          </div>
        </div>

        {workspaces.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-folder2-open" style={{ fontSize: '4rem', color: '#6c757d' }}></i>
            <h4 className="mt-3 text-muted">No workspaces yet</h4>
            <p className="text-muted">Create a new workspace or join an existing one to get started</p>
            <div className="mt-4">
              <button className="btn btn-primary me-2" onClick={() => setShowCreateModal(true)}>
                <i className="bi bi-plus-circle me-2"></i>
                Create Workspace
              </button>
              <button className="btn btn-outline-primary" onClick={() => setShowJoinModal(true)}>
                <i className="bi bi-box-arrow-in-right me-2"></i>
                Join Workspace
              </button>
            </div>
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            {workspaces.map((workspace) => (
              <div key={workspace.id} className="col">
                <div
                  className="card h-100 shadow-sm hover-shadow"
                  style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                  onClick={() => handleWorkspaceClick(workspace.id)}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h5 className="card-title mb-0">{workspace.name}</h5>
                      <span className={`badge ${getRoleBadgeClass(workspace.role)}`}>
                        {workspace.role}
                      </span>
                    </div>
                    {workspace.description && (
                      <p className="card-text text-muted small mb-3">{workspace.description}</p>
                    )}
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-code-slash me-2 text-primary"></i>
                      <span className="badge bg-light text-dark">{workspace.language}</span>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-person me-2 text-muted"></i>
                      <small className="text-muted">Owner: {workspace.owner_name}</small>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                      <small className="text-muted">
                        <i className="bi bi-clock me-1"></i>
                        {formatDate(workspace.last_accessed)}
                      </small>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWorkspaceClick(workspace.id);
                        }}
                      >
                        Open
                        <i className="bi bi-arrow-right ms-1"></i>
                      </button>
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

      <style jsx>{`
        .hover-shadow:hover {
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
