import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { FolderPlus, X, CheckCircle, Code } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

function CreateWorkspaceModal({ show, onHide, onSuccess }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const API_URL = API_ENDPOINTS.workspaces;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Workspace name is required');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div 
        className="w-full max-w-[440px] bg-[#12151E] border border-slate-700/50 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] p-8 animate-in fade-in zoom-in-95 duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <FolderPlus className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Create Workspace</h3>
          </div>
          <button 
            onClick={handleClose} 
            disabled={loading}
            className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="workspaceName" className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
              Workspace Name <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              id="workspaceName"
              placeholder="e.g. My Awesome Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
              className="w-full bg-[#0A0D14] border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="workspaceDescription" className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
              Description <span className="text-slate-600 normal-case tracking-normal font-normal ml-1">(Optional)</span>
            </label>
            <textarea
              id="workspaceDescription"
              rows="3"
              placeholder="What's this workspace about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              className="w-full bg-[#0A0D14] border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="workspaceLanguage" className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
              Primary Language
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Code className="w-4 h-4 text-slate-500" />
              </div>
              <select
                id="workspaceLanguage"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={loading}
                className="w-full bg-[#0A0D14] border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all appearance-none cursor-pointer"
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
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
               type="button"
               onClick={handleClose}
               disabled={loading}
               className="flex-1 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl py-3 text-sm font-semibold transition-colors"
            >
               Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#384b64] hover:bg-[#435976] text-white rounded-xl py-3 font-semibold text-sm transition-colors flex items-center justify-center gap-2 border border-[#485f7d]/50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Creating...
                </>
              ) : (
                <>
                  Create Workspace
                  <CheckCircle size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateWorkspaceModal;
