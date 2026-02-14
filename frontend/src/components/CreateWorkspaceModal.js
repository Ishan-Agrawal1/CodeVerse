import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

function CreateWorkspaceModal({ show, onHide, onSuccess }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const API_URL = 'http://localhost:5000/api/workspaces';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Workspace name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        API_URL,
        {
          name: name.trim(),
          description: description.trim(),
          language,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      toast.success('Workspace created successfully!');
      setName('');
      setDescription('');
      setLanguage('javascript');
      onSuccess();
    } catch (error) {
      console.error('Error creating workspace:', error);
      const errorMsg = error.response?.data?.error || 'Failed to create workspace';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setLanguage('javascript');
    onHide();
  };

  if (!show) return null;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-plus-circle me-2"></i>
              Create New Workspace
            </h5>
            <button type="button" className="btn-close" onClick={handleClose} disabled={loading}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label htmlFor="workspaceName" className="form-label">
                  Workspace Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="workspaceName"
                  placeholder="My Awesome Project"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="workspaceDescription" className="form-label">
                  Description (Optional)
                </label>
                <textarea
                  className="form-control"
                  id="workspaceDescription"
                  rows="3"
                  placeholder="What's this workspace about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                ></textarea>
              </div>

              <div className="mb-3">
                <label htmlFor="workspaceLanguage" className="form-label">
                  Primary Language
                </label>
                <select
                  className="form-select"
                  id="workspaceLanguage"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={loading}
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                  <option value="typescript">TypeScript</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                </select>
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
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Create Workspace
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

export default CreateWorkspaceModal;
