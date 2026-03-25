import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { History, X, RotateCcw, Tag, Eye, GitCompare, Clock, User } from 'lucide-react';
import './VersionHistory.css';

const API = 'http://localhost:5000/api/workspaces';

function computeDiff(oldText, newText) {
  const oldLines = (oldText || '').split('\n');
  const newLines = (newText || '').split('\n');
  const result = [];
  let oi = 0, ni = 0;

  // Simple LCS-based diff
  const lcs = [];
  const m = oldLines.length, n = newLines.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      lcs.unshift({ oi: i - 1, ni: j - 1 });
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  let lineNum = 0;
  let li = 0;
  oi = 0; ni = 0;
  while (li < lcs.length) {
    const match = lcs[li];
    while (oi < match.oi) {
      lineNum++;
      result.push({ type: 'removed', content: oldLines[oi], num: lineNum });
      oi++;
    }
    while (ni < match.ni) {
      lineNum++;
      result.push({ type: 'added', content: newLines[ni], num: lineNum });
      ni++;
    }
    lineNum++;
    result.push({ type: 'unchanged', content: oldLines[oi], num: lineNum });
    oi++; ni++; li++;
  }
  while (oi < m) {
    lineNum++;
    result.push({ type: 'removed', content: oldLines[oi], num: lineNum });
    oi++;
  }
  while (ni < n) {
    lineNum++;
    result.push({ type: 'added', content: newLines[ni], num: lineNum });
    ni++;
  }
  return result;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function VersionHistory({ isOpen, onClose, workspaceId, currentFile, currentContent }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'diff'
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [labelInput, setLabelInput] = useState({});
  const [showLabelInput, setShowLabelInput] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchVersions = useCallback(async () => {
    if (!currentFile || !workspaceId) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${API}/${workspaceId}/files/${currentFile.id}/versions`,
        { headers }
      );
      setVersions(res.data.versions || []);
    } catch (err) {
      console.error('Failed to fetch versions:', err);
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, currentFile?.id]);

  useEffect(() => {
    if (isOpen && currentFile) {
      fetchVersions();
      setSelectedVersion(null);
      setPreviewContent(null);
      setActiveTab('list');
      setRestoreTarget(null);
    }
  }, [isOpen, currentFile, fetchVersions]);

  const handleSelectVersion = async (version) => {
    setSelectedVersion(version);
    try {
      const res = await axios.get(
        `${API}/${workspaceId}/files/${currentFile.id}/versions/${version.id}`,
        { headers }
      );
      setPreviewContent(res.data.version?.content || '');
    } catch (err) {
      console.error('Failed to fetch version content:', err);
      toast.error('Failed to load version content');
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    try {
      await axios.post(
        `${API}/${workspaceId}/files/${currentFile.id}/versions/${restoreTarget.id}/restore`,
        {},
        { headers }
      );
      toast.success(`Restored to version ${restoreTarget.version_number}`);
      setRestoreTarget(null);
      fetchVersions();
      onClose('restored');
    } catch (err) {
      console.error('Failed to restore version:', err);
      toast.error('Failed to restore version');
    }
  };

  const handleAddLabel = async (versionId) => {
    const label = labelInput[versionId]?.trim();
    if (!label) return;
    try {
      await axios.post(
        `${API}/${workspaceId}/files/${currentFile.id}/versions/${versionId}/label`,
        { label },
        { headers }
      );
      toast.success('Label added');
      setLabelInput(prev => ({ ...prev, [versionId]: '' }));
      setShowLabelInput(null);
      fetchVersions();
    } catch (err) {
      console.error('Failed to add label:', err);
      toast.error(err.response?.data?.message || 'Failed to add label');
    }
  };

  const handleRemoveLabel = async (labelId) => {
    try {
      await axios.delete(
        `${API}/${workspaceId}/files/${currentFile.id}/versions/labels/${labelId}`,
        { headers }
      );
      toast.success('Label removed');
      fetchVersions();
    } catch (err) {
      console.error('Failed to remove label:', err);
      toast.error('Failed to remove label');
    }
  };

  if (!isOpen) return null;

  const diffLines = selectedVersion && previewContent !== null
    ? computeDiff(previewContent, currentContent || '')
    : [];

  return (
    <div className="version-history-overlay">
      <div className="version-history-backdrop" onClick={onClose} />
      <div className="version-history-panel">

        {/* Header */}
        <div className="vh-header">
          <div className="vh-header-left">
            <History className="vh-icon" />
            <div>
              <h3>Version History</h3>
              <p className="vh-file-name">{currentFile?.name || 'No file selected'}</p>
            </div>
          </div>
          <button className="vh-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="vh-tabs">
          <button
            className={`vh-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            History
          </button>
          <button
            className={`vh-tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => selectedVersion && setActiveTab('preview')}
            style={{ opacity: selectedVersion ? 1 : 0.4, cursor: selectedVersion ? 'pointer' : 'default' }}
          >
            Preview
          </button>
          <button
            className={`vh-tab ${activeTab === 'diff' ? 'active' : ''}`}
            onClick={() => selectedVersion && setActiveTab('diff')}
            style={{ opacity: selectedVersion ? 1 : 0.4, cursor: selectedVersion ? 'pointer' : 'default' }}
          >
            Diff
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="vh-loading"><div className="vh-spinner" /></div>
        ) : activeTab === 'list' ? (
          <div className="vh-list">
            {versions.length === 0 ? (
              <div className="vh-empty">
                <History />
                <span>No versions yet — save the file to create the first version</span>
              </div>
            ) : (
              versions.map((v) => (
                <div
                  key={v.id}
                  className={`vh-version-item ${selectedVersion?.id === v.id ? 'selected' : ''}`}
                  onClick={() => handleSelectVersion(v)}
                >
                  <div className="vh-version-dot" />
                  <div className="vh-version-info">
                    <div className="vh-version-top">
                      <span className="vh-version-number">v{v.version_number}</span>
                      <span className="vh-version-author">
                        <User size={10} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                        {v.author}
                      </span>
                    </div>
                    <div className="vh-version-time">
                      <Clock size={10} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                      {timeAgo(v.created_at)}
                    </div>

                    {/* Labels */}
                    {v.labels?.length > 0 && (
                      <div className="vh-labels">
                        {v.labels.map((l) => (
                          <span key={l.id} className="vh-label-badge">
                            {l.label}
                            <button
                              className="vh-label-remove"
                              onClick={(e) => { e.stopPropagation(); handleRemoveLabel(l.id); }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Inline label input */}
                    {showLabelInput === v.id && (
                      <div className="vh-label-input-row" onClick={(e) => e.stopPropagation()}>
                        <input
                          className="vh-label-input"
                          placeholder="e.g. v1.0, stable"
                          value={labelInput[v.id] || ''}
                          onChange={(e) => setLabelInput(prev => ({ ...prev, [v.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddLabel(v.id)}
                          autoFocus
                        />
                        <button className="vh-label-submit" onClick={() => handleAddLabel(v.id)}>
                          Add
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div className="vh-version-actions">
                    <button
                      className="vh-action-btn"
                      title="Preview"
                      onClick={(e) => { e.stopPropagation(); handleSelectVersion(v); setActiveTab('preview'); }}
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      className="vh-action-btn"
                      title="Diff with current"
                      onClick={(e) => { e.stopPropagation(); handleSelectVersion(v); setActiveTab('diff'); }}
                    >
                      <GitCompare size={13} />
                    </button>
                    <button
                      className="vh-action-btn restore"
                      title="Restore this version"
                      onClick={(e) => { e.stopPropagation(); setRestoreTarget(v); }}
                    >
                      <RotateCcw size={13} />
                    </button>
                    <button
                      className="vh-action-btn label"
                      title="Add label"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowLabelInput(showLabelInput === v.id ? null : v.id);
                      }}
                    >
                      <Tag size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'preview' ? (
          <div className="vh-preview-pane">
            {selectedVersion && previewContent !== null ? (
              <>
                <div className="vh-preview-header">
                  <span>v{selectedVersion.version_number} — {selectedVersion.author} — {timeAgo(selectedVersion.created_at)}</span>
                </div>
                <pre className="vh-preview-content">{previewContent}</pre>
              </>
            ) : (
              <div className="vh-empty">
                <Eye />
                <span>Select a version to preview its content</span>
              </div>
            )}
          </div>
        ) : (
          /* Diff tab */
          <div className="vh-preview-pane">
            {selectedVersion && previewContent !== null ? (
              <>
                <div className="vh-preview-header">
                  <span>v{selectedVersion.version_number} → Current</span>
                  <span style={{ fontSize: 10, color: '#64748b' }}>
                    {diffLines.filter(l => l.type === 'added').length} additions,{' '}
                    {diffLines.filter(l => l.type === 'removed').length} deletions
                  </span>
                </div>
                <div className="vh-preview-content" style={{ padding: 0 }}>
                  {diffLines.map((line, idx) => (
                    <div key={idx} className={`vh-diff-line ${line.type}`}>
                      <span className="vh-diff-line-number">{line.num}</span>
                      <span className="vh-diff-indicator">
                        {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
                      </span>
                      <span className="vh-diff-line-content">{line.content}</span>
                    </div>
                  ))}
                  {diffLines.length === 0 && (
                    <div className="vh-empty" style={{ padding: 40 }}>
                      <span>No differences — this version matches the current file</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="vh-empty">
                <GitCompare />
                <span>Select a version to compare with the current file</span>
              </div>
            )}
          </div>
        )}

        {/* Restore confirmation bar */}
        {restoreTarget && (
          <div className="vh-restore-bar">
            <span>Restore to v{restoreTarget.version_number}?</span>
            <div className="vh-restore-actions">
              <button className="vh-restore-cancel" onClick={() => setRestoreTarget(null)}>Cancel</button>
              <button className="vh-restore-confirm" onClick={handleRestore}>Restore</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
