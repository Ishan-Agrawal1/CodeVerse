import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

function JoinWorkspaceModal({ show, onHide, onSuccess }) {
  const [workspaceId, setWorkspaceId] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const API_URL = 'http://localhost:5000/api/workspaces';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!workspaceId.trim()) {
      toast.error('Workspace ID is required');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/${workspaceId.trim()}/join`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success('Successfully joined workspace!');
      setWorkspaceId('');
      onSuccess();
    } catch (error) {
      console.error('Error joining workspace:', error);
      const errorMsg = error.response?.data?.error || 'Failed to join workspace';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setWorkspaceId('');
    onHide();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setWorkspaceId(text.trim());
      toast.success('Workspace ID pasted!');
    } catch (error) {
      toast.error('Failed to read clipboard');
    }
  };

  if (!show) return null;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-box-arrow-in-right me-2"></i>
              Join Workspace
            </h5>
            <button type="button" className="btn-close" onClick={handleClose} disabled={loading}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="alert alert-info d-flex align-items-start" role="alert">
                <i className="bi bi-info-circle me-2 mt-1"></i>
                <small>
                  Enter the workspace ID shared by the owner to join and collaborate in real-time.
                </small>
              </div>

              <div className="mb-3">
                <label htmlFor="workspaceId" className="form-label">
                  Workspace ID <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    id="workspaceId"
                    placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
                    value={workspaceId}
                    onChange={(e) => setWorkspaceId(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={handlePaste}
                    disabled={loading}
                    title="Paste from clipboard"
                  >
                    <i className="bi bi-clipboard"></i>
                  </button>
                </div>
                <small className="text-muted">
                  The workspace ID can be found in the URL when inside a workspace
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Joining...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Join Workspace
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default JoinWorkspaceModal;
