import React, { useEffect, useRef, useState } from "react";
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
import {
  Terminal, Play, Save, Users, Folder, MessageSquare,
  Settings, Bell, LogOut, Copy, Trash2, Code2, Bug, Share2
} from "lucide-react";

const LANGUAGES = [
  "python3",
  "java",
  "cpp",
  "c"
];

function EditorPage() {
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [isCompileWindowOpen, setIsCompileWindowOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("python3");
  const [currentFile, setCurrentFile] = useState(null);
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [workspaceInfo, setWorkspaceInfo] = useState(null);
  const [showCursors, setShowCursors] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const codeRef = useRef(null);

  const Location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const socketRef = useRef(null);

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
        </div>
        <div className="mt-auto flex flex-col gap-2 w-full px-2">
           <button className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all" title="Settings">
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
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2 mt-2">Online ({clients.length})</span>
              {clients.map((client) => (
                <div key={client.socketId} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800/50 cursor-default">
                  <div className="relative">
                    <Avatar className="w-6 h-6 border border-slate-700">
                      <AvatarFallback className="bg-slate-700 text-[10px]">{client.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#12151E]"></div>
                  </div>
                  <span className="text-sm text-slate-300 truncate">{client.username}</span>
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
          />
        </div>

        {/* Bottom Panel Component (Terminal/Compiler Output) */}
        {isCompileWindowOpen && (
          <div className="h-64 border-t border-slate-800 bg-[#12151E] flex flex-col z-20">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/50 bg-[#161B26]">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Terminal className="w-4 h-4 text-cyan-400" />
                Terminal
                <select
                  className="ml-4 bg-transparent border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-400 outline-none focus:border-cyan-500"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang} className="bg-slate-900">
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
              <Button size="sm" variant="ghost" onClick={toggleCompileWindow} className="h-6 px-2 text-slate-500 hover:text-white">
                ✕
              </Button>
            </div>
            <div className="flex-1 p-4 font-mono text-sm text-slate-300 overflow-auto whitespace-pre-wrap bg-[#0A0D14]">
              <div className="text-emerald-400 mb-2">$ run script.sh</div>
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
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-full px-2 py-0.5 border border-slate-700">
              <span className="text-[10px] font-semibold text-slate-400">Cursors</span>
              <button
                onClick={() => setShowCursors(!showCursors)}
                className={`w-6 h-3 rounded-full relative transition-colors ${showCursors ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all ${showCursors ? 'left-3.5' : 'left-0.5'}`} style={{ transform: showCursors ? 'translateX(100%)' : 'translateX(0)' }}></div>
              </button>
            </div>
            <Bell className="w-4 h-4 text-slate-400 hover:text-white cursor-pointer transition-colors" />
          </div>
        </div>

        {/* Collaborators Context Box */}
        <div className="p-3 border-b border-slate-800 shrink-0 bg-slate-900/20">
          <span className="text-[10px] font-bold tracking-wider text-slate-500 mb-2 block uppercase">Team ({clients.length})</span>
          <div className="flex flex-wrap gap-1.5">
            {clients.map((client) => (
              <Avatar key={client.socketId} className="w-6 h-6 border border-[#12151E] ring-1 ring-slate-800 hover:ring-cyan-500 transition-all cursor-pointer" title={client.username}>
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

      {/* Legacy User Chat Component Overlay */}
      <UserChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        workspaceId={roomId}
        socketRef={socketRef}
        workspaceInfo={workspaceInfo}
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
