import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Client from "./Client";
import Editor from "./Editor";
import FileExplorer from "./FileExplorer";
import UserChat from "./UserChat";
import { initSocket } from "../Socket";
import { ACTIONS } from "../Actions";
import {
  useNavigate,
  useLocation,
  Navigate,
  useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import { Button } from "./ui/Button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/Avatar";
import AIChatPanel from "./AIChatPanel";
import VersionHistory from "./VersionHistory";
import { useAuth } from "../contexts/AuthContext";
import {
  Terminal, Play, Save, Users, Folder, MessageSquare,
  Settings, Bell, LogOut, Copy, Trash2, Code2, Bug, Share2,
  X, User, Monitor, Type, WrapText, Eye, ChevronDown,
  Home, LayoutDashboard, History
} from "lucide-react";

// File extension → JDoodle language mapping
const EXT_TO_LANGUAGE = {
  'py': 'python3',
  'java': 'java',
  'cpp': 'cpp', 'cc': 'cpp', 'cxx': 'cpp',
  'c': 'c', 'h': 'c',
  'js': 'nodejs', 'mjs': 'nodejs',
  'rb': 'ruby',
  'go': 'go',
  'rs': 'rust',
  'php': 'php',
  'swift': 'swift',
  'kt': 'kotlin',
  'scala': 'scala',
  'r': 'r',
  'sql': 'sql',
};

// All supported languages for the override dropdown
const LANGUAGES = [
  "python3", "java", "cpp", "c", "nodejs",
  "ruby", "go", "rust", "php", "swift",
  "kotlin", "scala", "r", "sql"
];

// Display-friendly names
const LANGUAGE_LABELS = {
  python3: 'Python', java: 'Java', cpp: 'C++', c: 'C',
  nodejs: 'JavaScript', ruby: 'Ruby', go: 'Go', rust: 'Rust',
  php: 'PHP', swift: 'Swift', kotlin: 'Kotlin', scala: 'Scala',
  r: 'R', sql: 'SQL'
};

function getLanguageFromFilename(filename) {
  if (!filename) return null;
  const ext = filename.split('.').pop().toLowerCase();
  return EXT_TO_LANGUAGE[ext] || null;
}

function EditorPage() {
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [isCompileWindowOpen, setIsCompileWindowOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("python3");
  const [autoDetectedLanguage, setAutoDetectedLanguage] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [workspaceInfo, setWorkspaceInfo] = useState(null);
  const [showCursors, setShowCursors] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    return parseInt(localStorage.getItem('cv_fontSize') || '14', 10);
  });
  const [wordWrap, setWordWrap] = useState(() => {
    return localStorage.getItem('cv_wordWrap') !== 'false';
  });
  const [showLanguageOverride, setShowLanguageOverride] = useState(false);
  const { user, logout } = useAuth();
  const codeRef = useRef(null);

  const Location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const socketRef = useRef(null);

  const uniqueWorkspaceMembers = useMemo(() => {
    const members = workspaceInfo?.collaborators || [];
    const seen = new Set();
    return members.filter((member) => {
      const key = (member?.username || "").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [workspaceInfo]);

  const uniqueOnlineMembers = useMemo(() => {
    const seen = new Set();
    return clients.filter((client) => {
      const key = (client?.username || "").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [clients]);

  const fetchWorkspaceInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/workspaces/${roomId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setWorkspaceInfo(response.data.workspace);
    } catch (error) {
      console.error('Error fetching workspace info:', error);
    }
  };

  useEffect(() => {
    fetchWorkspaceInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();
      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));

      const handleErrors = (err) => {
        console.log("Error", err);
        toast.error("Socket connection failed, Try again later");
        navigate("/");
      };

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: Location.state?.username,
      });

      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          if (username !== Location.state?.username) {
            toast.success(`${username} joined the room.`);
          }
          setClients(clients);
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        }
      );

      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room`);
        setClients((prev) => {
          return prev.filter((client) => client.socketId !== socketId);
        });
      });
    };
    init();

    return () => {
      socketRef.current && socketRef.current.disconnect();
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!Location.state) {
    return <Navigate to="/" />;
  }

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success(`Room ID is copied`);
    } catch (error) {
      console.log(error);
      toast.error("Unable to copy the room ID");
    }
  };

  const leaveRoom = async () => {
    navigate("/");
  };

  const handleFileSelect = (file) => {
    setCurrentFile(file);
    codeRef.current = file.content || '';

    // Auto-detect language from file extension
    const detected = getLanguageFromFilename(file.name);
    if (detected) {
      setSelectedLanguage(detected);
      setAutoDetectedLanguage(detected);
    } else {
      setAutoDetectedLanguage(null);
      toast('Language not auto-detected for this file type. Using: ' + LANGUAGE_LABELS[selectedLanguage], { icon: '⚠️' });
    }

    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.SYNC_CODE, {
        code: file.content || '',
        socketId: socketRef.current.id
      });
    }
  };

  const handleOpenInEditor = (file) => {
    handleFileSelect(file);
    toast.success(`Opened ${file.name} in editor`);
  };

  const handleSaveFile = async () => {
    if (!currentFile) {
      toast.error('No file is currently open');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:5000/api/workspaces/${roomId}/files/${currentFile.id}`,
        {
          content: codeRef.current,
          language: selectedLanguage
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('File saved successfully');
    } catch (error) {
      console.error('Error saving file:', error);
      toast.error('Failed to save file');
    }
  };

  const handleDeleteWorkspace = async () => {
    const confirmDelete = window.confirm(
      `Are you sure you want to DELETE this workspace?\n\nThis will PERMANENTLY DELETE the workspace for ALL users including all files and collaborators.\n\nThis action cannot be undone!`
    );

    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/workspaces/${roomId}`,
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
        `http://localhost:5000/api/workspaces/${roomId}/leave`,
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

  const runCode = async () => {
    if (!currentFile) {
      toast.error('Open a file first to run code');
      return;
    }
    setIsCompiling(true);
    setIsCompileWindowOpen(true);
    try {
      const response = await axios.post("http://localhost:5000/compile", {
        code: codeRef.current,
        language: selectedLanguage,
      });
      setOutput(response.data.output || JSON.stringify(response.data));
    } catch (error) {
      console.error("Error compiling code:", error);
      setOutput(error.response?.data?.error || "An error occurred");
    } finally {
      setIsCompiling(false);
    }
  };

  const toggleCompileWindow = () => {
    setIsCompileWindowOpen(!isCompileWindowOpen);
  };

  const handleFontSizeChange = (delta) => {
    setFontSize(prev => {
      const next = Math.min(28, Math.max(10, prev + delta));
      localStorage.setItem('cv_fontSize', String(next));
      return next;
    });
  };

  const handleWordWrapToggle = () => {
    setWordWrap(prev => {
      const next = !prev;
      localStorage.setItem('cv_wordWrap', String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen w-full bg-[#0E1117] text-slate-300 font-sans overflow-hidden">

      {/* Activity Bar (Far Left) */}
      <div className="w-14 shrink-0 bg-[#0A0D14] border-r border-slate-800 flex flex-col items-center py-3 z-20">
        <div className="w-8 h-8 mb-4">
          <img src="/images/codeverse.png" alt="CV" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col gap-2 w-full px-2">
          <button 
            onClick={() => setShowFileExplorer(true)} 
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${showFileExplorer ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
            title="Files"
          >
            <Folder className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowFileExplorer(false)} 
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${!showFileExplorer ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
            title="Members"
          >
            <Users className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isChatOpen ? 'bg-slate-800 text-purple-400 border border-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
            title="Team Chat"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsVersionHistoryOpen(!isVersionHistoryOpen)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isVersionHistoryOpen ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
            title="Version History"
          >
            <History className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-auto flex flex-col gap-2 w-full px-2">
           <button
             onClick={() => navigate('/')}
             className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800/50 transition-all"
             title="Home / Dashboard"
           >
             <LayoutDashboard className="w-5 h-5" />
           </button>
           <button
             onClick={() => setIsSettingsOpen(!isSettingsOpen)}
             className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isSettingsOpen ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
             title="Settings"
           >
             <Settings className="w-5 h-5" />
           </button>
           <div className="w-10 h-10 rounded-lg flex items-center justify-center">
             <Avatar className="w-8 h-8 border border-slate-700 cursor-pointer">
               <AvatarFallback className="bg-purple-600 text-white font-semibold text-xs">
                 {Location.state?.username?.charAt(0) || "U"}
               </AvatarFallback>
             </Avatar>
           </div>
        </div>
      </div>

      {/* Secondary Sidebar (Left) */}
      <div className="w-60 shrink-0 bg-[#12151E] border-r border-slate-800 flex flex-col z-10 transition-all">
        {/* Project Context */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/20">
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-300 tracking-wide uppercase">{showFileExplorer ? 'Explorer' : 'Members'}</span>
              <span className="text-[10px] text-slate-500 truncate mt-0.5">{workspaceInfo?.name || "Workspace"}</span>
            </div>
          </div>
        </div>

        {/* Main Content Area of Sidebar */}
        <div className="flex-1 overflow-auto p-2">
          {showFileExplorer ? (
            <FileExplorer
              workspaceId={roomId}
              onFileSelect={handleFileSelect}
              onOpenInEditor={handleOpenInEditor}
            />
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2 mt-2">Members ({uniqueWorkspaceMembers.length})</span>
              {uniqueWorkspaceMembers.map((member) => (
                <div key={member.id || member.username} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800/50 cursor-default">
                  <div className="relative">
                    <Avatar className="w-6 h-6 border border-slate-700">
                      <AvatarFallback className="bg-slate-700 text-[10px]">{(member.username || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-300 truncate">{member.username}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">{member.role || 'member'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-slate-800 flex flex-col gap-2 bg-slate-900/20">
          <Button variant="outline" className="w-full justify-start text-xs border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:text-white h-8 px-2" onClick={copyRoomId}>
            <Share2 className="w-3 h-3 mr-2 text-cyan-400" />
            Invite
          </Button>
          
          {workspaceInfo && workspaceInfo.userRole === 'owner' ? (
            <Button variant="destructive" className="w-full text-xs shadow-none h-8 px-2" onClick={handleDeleteWorkspace}>
              <Trash2 className="w-3 h-3 mr-2" />
              Delete
            </Button>
          ) : workspaceInfo && workspaceInfo.userRole !== 'owner' && (
            <Button variant="outline" className="w-full text-xs border-amber-900/50 text-amber-500 hover:bg-amber-900/20 hover:text-amber-400 h-8 px-2" onClick={handleLeaveWorkspace}>
              <LogOut className="w-3 h-3 mr-2" />
              Leave
            </Button>
          )}
        </div>
      </div>

      {/* Center Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0A0D14] border-r border-slate-800 relative z-0">

        {/* Top Editor Bar */}
        <div className="h-14 border-b border-slate-800 bg-[#12151E] flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {currentFile ? (
                <div className="flex items-center gap-2 bg-[#0A0D14] border-t-2 border-cyan-400 px-4 py-2 text-sm text-white transition-all rounded-t-md">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  {currentFile.name}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500">
                  Select a file
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentFile && (
              <Button size="sm" variant="ghost" onClick={handleSaveFile} className="h-8 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            )}
            <Button size="sm" variant="default" onClick={runCode} disabled={isCompiling} className="h-8 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Play className="w-4 h-4 mr-2" />
              {isCompiling ? "Running..." : "Run"}
            </Button>
          </div>
        </div>

        {/* Editor Container */}
        <div className="flex-1 relative bg-[#0A0D14] overflow-hidden">
          <Editor
            socketRef={socketRef}
            roomId={roomId}
            onCodeChange={(code) => {
              codeRef.current = code;
            }}
            showCursors={showCursors}
            language={selectedLanguage}
            fontSize={fontSize}
            wordWrap={wordWrap}
          />
        </div>

        {/* Bottom Panel Component (Terminal/Compiler Output) */}
        {isCompileWindowOpen && (
          <div className="h-64 border-t border-slate-800 bg-[#12151E] flex flex-col z-20">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/50 bg-[#161B26]">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Terminal className="w-4 h-4 text-cyan-400" />
                Terminal
                {/* Auto-detected language badge */}
                <div className="ml-3 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {LANGUAGE_LABELS[selectedLanguage] || selectedLanguage}
                  </span>
                  {autoDetectedLanguage && (
                    <span className="text-[9px] text-slate-500">auto</span>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setShowLanguageOverride(!showLanguageOverride)}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-all"
                      title="Override language"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showLanguageOverride && (
                      <div className="absolute top-full left-0 mt-1 bg-[#1A1F2E] border border-slate-700 rounded-lg shadow-xl py-1 z-50 min-w-[140px] max-h-48 overflow-auto">
                        {LANGUAGES.map((lang) => (
                          <button
                            key={lang}
                            onClick={() => { setSelectedLanguage(lang); setShowLanguageOverride(false); }}
                            className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                              selectedLanguage === lang
                                ? 'bg-cyan-500/10 text-cyan-400'
                                : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                            }`}
                          >
                            {LANGUAGE_LABELS[lang] || lang}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={toggleCompileWindow} className="h-6 px-2 text-slate-500 hover:text-white">
                ✕
              </Button>
            </div>
            <div className="flex-1 p-4 font-mono text-sm text-slate-300 overflow-auto whitespace-pre-wrap bg-[#0A0D14]">
              <div className="text-emerald-400 mb-2">$ {LANGUAGE_LABELS[selectedLanguage] || selectedLanguage} {currentFile?.name || 'script'}</div>
              {output || "Output will appear here after compilation"}
            </div>
          </div>
        )}

      </div>

      {/* Right Sidebar */}
      <div className="w-[340px] bg-[#12151E] border-l border-slate-800 flex flex-col z-10 shrink-0">

        {/* Right Header */}
        <div className="h-12 shrink-0 border-b border-slate-800 flex items-center justify-between px-3 bg-[#0A0D14]">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest hidden sm:block flex-1">Workspace</span>
          <div className="flex items-center gap-3 ml-auto">
            <Bell className="w-4 h-4 text-slate-400 hover:text-white cursor-pointer transition-colors" />
          </div>
        </div>

        {/* Collaborators Context Box */}
        <div className="p-3 border-b border-slate-800 shrink-0 bg-slate-900/20">
          <span className="text-[10px] font-bold tracking-wider text-slate-500 mb-2 block uppercase">Online ({uniqueOnlineMembers.length})</span>
          <div className="flex flex-wrap gap-1.5">
            {uniqueOnlineMembers.map((client) => (
              <Avatar key={client.socketId || client.username} className="w-6 h-6 border border-[#12151E] ring-1 ring-slate-800 hover:ring-cyan-500 transition-all cursor-pointer" title={client.username}>
                <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-900 text-cyan-200 text-[10px]">
                  {client.username.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>

        {/* Full AI Chatbot */}
        <div className="flex-1 overflow-hidden p-4">
          <AIChatPanel workspaceId={roomId} />
        </div>

      </div>

      {/* Settings Panel Overlay */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)} />
          {/* Panel */}
          <div className="relative w-[420px] max-h-[80vh] bg-[#12151E]/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden" style={{ animation: 'settingsFadeIn 0.2s ease-out' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                <span className="text-base font-semibold text-white">Settings</span>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-auto max-h-[calc(80vh-60px)] p-5 space-y-5">
              {/* User Profile */}
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profile</span>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border-2 border-purple-500/30">
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold text-sm">
                      {(user?.username || Location.state?.username || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-semibold text-white">{user?.username || Location.state?.username || 'User'}</div>
                    <div className="text-xs text-slate-500">{user?.email || 'No email'}</div>
                  </div>
                </div>
              </div>

              {/* Editor Preferences */}
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Editor</span>
                </div>
                <div className="space-y-3">
                  {/* Font Size */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Type className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-sm text-slate-300">Font Size</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleFontSizeChange(-1)} className="w-7 h-7 rounded-md bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-all">−</button>
                      <span className="text-sm font-mono text-cyan-400 w-8 text-center">{fontSize}</span>
                      <button onClick={() => handleFontSizeChange(1)} className="w-7 h-7 rounded-md bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-all">+</button>
                    </div>
                  </div>
                  {/* Word Wrap */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <WrapText className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-sm text-slate-300">Word Wrap</span>
                    </div>
                    <button onClick={handleWordWrapToggle}
                      className={`w-9 h-5 rounded-full relative transition-all ${wordWrap ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-slate-600'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${wordWrap ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {/* Cursor Visibility */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-sm text-slate-300">Remote Cursors</span>
                    </div>
                    <button onClick={() => setShowCursors(!showCursors)}
                      className={`w-9 h-5 rounded-full relative transition-all ${showCursors ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-slate-600'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${showCursors ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Workspace Info */}
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-3">
                  <Folder className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Workspace</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Name</span>
                    <span className="text-sm text-white font-medium truncate max-w-[220px]">{workspaceInfo?.name || 'Workspace'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Room ID</span>
                    <div className="flex items-center gap-1.5">
                      <code className="text-[11px] text-slate-400 font-mono bg-slate-900/50 px-2 py-0.5 rounded max-w-[160px] truncate">{roomId}</code>
                      <button onClick={() => { copyRoomId(); }} className="text-slate-500 hover:text-cyan-400 transition-colors">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Role</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      workspaceInfo?.userRole === 'owner'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                    }`}>{workspaceInfo?.userRole || 'member'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Online</span>
                    <span className="text-sm text-emerald-400 font-medium">{uniqueOnlineMembers.length} member{uniqueOnlineMembers.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/8 hover:bg-red-500/15 border border-red-500/20 text-red-400 hover:text-red-300 transition-all group"
              >
                <LogOut className="w-4 h-4 group-hover:translate-x-[-2px] transition-transform" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legacy User Chat Component Overlay */}
      <UserChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        workspaceId={roomId}
        socketRef={socketRef}
        workspaceInfo={workspaceInfo}
      />

      {/* Version History Panel */}
      <VersionHistory
        isOpen={isVersionHistoryOpen}
        onClose={(reason) => {
          setIsVersionHistoryOpen(false);
          if (reason === 'restored' && currentFile) {
            // Re-fetch file content after restore
            const token = localStorage.getItem('token');
            axios.get(
              `http://localhost:5000/api/workspaces/${roomId}/files/${currentFile.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            ).then(res => {
              const file = res.data.file;
              if (file) {
                setCurrentFile(file);
                codeRef.current = file.content || '';
                if (socketRef.current) {
                  socketRef.current.emit(ACTIONS.SYNC_CODE, {
                    code: file.content || '',
                    socketId: socketRef.current.id
                  });
                }
              }
            }).catch(err => console.error('Error refreshing file after restore:', err));
          }
        }}
        workspaceId={roomId}
        currentFile={currentFile}
        currentContent={codeRef.current || ''}
      />
    </div>
  );
}

// Minimal missing icons
function Bot(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
  )
}

export default EditorPage;
