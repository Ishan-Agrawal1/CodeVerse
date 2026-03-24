import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Globe, X, ClipboardPaste, ArrowRight } from 'lucide-react';

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div 
        className="w-full max-w-[440px] bg-[#12151E] border border-slate-700/50 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] p-8 animate-in fade-in zoom-in-95 duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
               <Globe className="w-5 h-5 text-purple-400" />
             </div>
             <h3 className="text-xl font-bold text-white tracking-tight">Join Workspace</h3>
          </div>
          <button 
            onClick={handleClose} 
            disabled={loading}
            className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6 p-4 rounded-xl bg-cyan-900/10 border border-cyan-800/30 flex items-start gap-3">
             <div className="mt-0.5 text-cyan-400 flex-shrink-0">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
             </div>
             <p className="text-xs text-cyan-100/70 leading-relaxed">
               Enter the workspace ID shared by the owner to join and collaborate in real-time.
             </p>
          </div>

          <div className="space-y-1.5 mb-8">
            <label htmlFor="workspaceId" className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
              Workspace ID <span className="text-purple-400">*</span>
            </label>
            <div className="relative group flex">
              <input
                type="text"
                id="workspaceId"
                placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                disabled={loading}
                required
                className="w-full bg-[#0A0D14] border border-slate-800 rounded-l-xl py-3 pl-4 pr-10 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-mono"
              />
              <button
                type="button"
                onClick={handlePaste}
                disabled={loading}
                title="Paste from clipboard"
                className="bg-[#161B26] border border-l-0 border-slate-800 rounded-r-xl px-4 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center"
              >
                <ClipboardPaste size={18} />
              </button>
            </div>
          </div>

          <div className="flex gap-3">
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
              className="flex-1 bg-[#4a3b69] hover:bg-[#5b4882] text-white rounded-xl py-3 font-semibold text-sm transition-colors flex items-center justify-center gap-2 border border-[#6b5599]/50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Joining...
                </>
              ) : (
                <>
                  Join Workspace
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default JoinWorkspaceModal;
