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
    // Force update the editor with file content
    if (socketRef.current) {
      // Emit to self to update the editor
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

  // const toggleFileExplorer = () => {
  //   setShowFileExplorer(!showFileExplorer);
  // };

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
    try {
      const response = await axios.post("http://localhost:5000/compile", {
        code: codeRef.current,
        language: selectedLanguage,
      });
      console.log("Backend response:", response.data);
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
    <div className="container-fluid vh-100 d-flex flex-column">
      <div className="row flex-grow-1">
        {/* Sidebar with tabs */}
        <div className="col-md-2 bg-dark text-light d-flex flex-column">
          <img
            src="/images/codeverse.png"
            alt="Logo"
            className="img-fluid mx-auto"
            style={{ maxWidth: "200px", marginTop: "-10px" }}
          />
          <hr style={{ marginTop: "-1.5rem" }} />

          {/* Tab buttons */}
          <div className="d-flex border-bottom border-secondary">
            <button
              className={`btn btn-sm flex-grow-1 ${showFileExplorer ? 'btn-primary' : 'btn-dark'}`}
              onClick={() => setShowFileExplorer(true)}
            >
              Files
            </button>
            <button
              className={`btn btn-sm flex-grow-1 ${!showFileExplorer ? 'btn-primary' : 'btn-dark'}`}
              onClick={() => setShowFileExplorer(false)}
            >
              Members
            </button>
          </div>

          <div className="d-flex flex-column flex-grow-1 overflow-hidden">
            {showFileExplorer ? (
              <FileExplorer
                workspaceId={roomId}
                onFileSelect={handleFileSelect}
                onOpenInEditor={handleOpenInEditor}
              />
            ) : (
              <div className="overflow-auto p-2">
                <span className="mb-2">Members</span>
                {clients.map((client) => (
                  <Client key={client.socketId} username={client.username} />
                ))}
              </div>
            )}
          </div>

          <hr />
          <div className="mt-auto mb-3">
            <button className="btn btn-success w-100 mb-2" onClick={copyRoomId}>
              Copy Room ID
            </button>
            {workspaceInfo && workspaceInfo.userRole === 'owner' ? (
              <button className="btn btn-danger w-100 mb-2" onClick={handleDeleteWorkspace}>
                Delete Workspace
              </button>
            ) : workspaceInfo && workspaceInfo.userRole !== 'owner' && (
              <button className="btn btn-warning w-100 mb-2" onClick={handleLeaveWorkspace}>
                Leave Workspace
              </button>
            )}
            <button className="btn btn-secondary w-100" onClick={leaveRoom}>
              Exit Editor
            </button>
          </div>
        </div>

        <div className="col-md-10 text-light d-flex flex-column">
          <div className="bg-dark p-2 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              {currentFile && (
                <span className="me-3 text-info">
                  📄 {currentFile.name}
                </span>
              )}
              {currentFile && (
                <button
                  className="btn btn-sm btn-success me-2"
                  onClick={handleSaveFile}
                >
                  💾 Save
                </button>
              )}
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                className={`btn btn-sm ${showCursors ? 'btn-info' : 'btn-outline-secondary'}`}
                onClick={() => setShowCursors(!showCursors)}
                title={showCursors ? 'Hide collaborative cursors' : 'Show collaborative cursors'}
              >
                <i className={`bi ${showCursors ? 'bi-cursor-fill' : 'bi-cursor'} me-1`}></i>
                {showCursors ? 'Cursors On' : 'Cursors Off'}
              </button>
              <select
                className="form-select w-auto"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Editor
            socketRef={socketRef}
            roomId={roomId}
            onCodeChange={(code) => {
              codeRef.current = code;
            }}
            showCursors={showCursors}
          />
        </div>
      </div>

      <button
        className="btn btn-primary position-fixed bottom-0 end-0 m-3"
        onClick={toggleCompileWindow}
        style={{ zIndex: 1050 }}
      >
        {isCompileWindowOpen ? "Close Compiler" : "Open Compiler"}
      </button>

      {/* Chat toggle button */}
      <button
        className="btn btn-info position-fixed m-3"
        onClick={() => setIsChatOpen(!isChatOpen)}
        style={{ 
          bottom: '70px', 
          right: '0',
          zIndex: 1050,
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          padding: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}
        title="Team Chat"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* User Chat Component */}
      <UserChat 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        workspaceId={roomId}
        socketRef={socketRef}
        workspaceInfo={workspaceInfo}
      />

      <div
        className={`bg-dark text-light p-3 ${
          isCompileWindowOpen ? "d-block" : "d-none"
        }`}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: isCompileWindowOpen ? "30vh" : "0",
          transition: "height 0.3s ease-in-out",
          overflowY: "auto",
          zIndex: 1040,
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="m-0">Compiler Output ({selectedLanguage})</h5>
          <div>
            <button
              className="btn btn-success me-2"
              onClick={runCode}
              disabled={isCompiling}
            >
              {isCompiling ? "Compiling..." : "Run Code"}
            </button>
            <button className="btn btn-secondary" onClick={toggleCompileWindow}>
              Close
            </button>
          </div>
        </div>
        <pre className="bg-secondary p-3 rounded">
          {output || "Output will appear here after compilation"}
        </pre>
      </div>
    </div>
  );
}

export default EditorPage;
