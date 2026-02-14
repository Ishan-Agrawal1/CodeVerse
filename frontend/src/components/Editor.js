import React, { useEffect, useRef } from "react";
import "codemirror/mode/javascript/javascript";
import "codemirror/theme/dracula.css";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/lib/codemirror.css";
import CodeMirror from "codemirror";
import { ACTIONS } from "../Actions";
import "./Editor.css";

function Editor({ socketRef, roomId, onCodeChange, showCursors = true }) {
  const editorRef = useRef(null);
  const userCursorsRef = useRef({});

  // Generate a random color for each user
  const getColorForUser = (socketId) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
      '#F8B739', '#52B788', '#E63946', '#06FFA5'
    ];
    const hash = socketId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Create cursor widget
  const createCursorWidget = (username, color) => {
    const cursorElement = document.createElement('div');
    cursorElement.className = 'remote-cursor';
    cursorElement.style.borderLeftColor = color;

    const labelElement = document.createElement('div');
    labelElement.className = 'cursor-label';
    labelElement.style.backgroundColor = color;
    labelElement.textContent = username;

    cursorElement.appendChild(labelElement);
    return cursorElement;
  };

  // Update remote cursor position
  const updateRemoteCursor = (socketId, username, position) => {
    if (!editorRef.current || !showCursors) return;

    const color = getColorForUser(socketId);
    
    // Remove old cursor if exists
    if (userCursorsRef.current[socketId]) {
      userCursorsRef.current[socketId].clear();
    }

    // Create and place new cursor
    const cursorWidget = createCursorWidget(username, color);
    const cursorMarker = editorRef.current.setBookmark(
      { line: position.line, ch: position.ch },
      { widget: cursorWidget, insertLeft: true }
    );

    userCursorsRef.current[socketId] = cursorMarker;
  };

  // Remove remote cursor
  const removeRemoteCursor = (socketId) => {
    if (userCursorsRef.current[socketId]) {
      userCursorsRef.current[socketId].clear();
      delete userCursorsRef.current[socketId];
    }
  };

  useEffect(() => {
    const init = async () => {
      const editor = CodeMirror.fromTextArea(
        document.getElementById("realtimeEditor"),
        {
          mode: { name: "javascript", json: true },
          theme: "dracula",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
        }
      );
      editorRef.current = editor;

      editor.setSize(null, "100%");
      
      // Track code changes
      editorRef.current.on("change", (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        onCodeChange(code);
        if (origin !== "setValue") {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code,
          });
        }
      });

      // Track cursor position changes
      editorRef.current.on("cursorActivity", () => {
        if (showCursors) {
          const cursor = editorRef.current.getCursor();
          socketRef.current.emit(ACTIONS.CURSOR_POSITION, {
            roomId,
            cursorPosition: { line: cursor.line, ch: cursor.ch },
          });
        }
      });
    };

    init();
  }, []);

  // Handle cursor visibility toggle
  useEffect(() => {
    if (!showCursors) {
      // Hide all remote cursors
      Object.keys(userCursorsRef.current).forEach(socketId => {
        if (userCursorsRef.current[socketId]) {
          userCursorsRef.current[socketId].clear();
        }
      });
      userCursorsRef.current = {};
    }
  }, [showCursors]);

  useEffect(() => {
    if (socketRef.current) {
      // Listen for code changes
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        if (code !== null) {
          editorRef.current.setValue(code);
        }
      });

      // Listen for cursor updates from other users
      socketRef.current.on(ACTIONS.CURSOR_UPDATE, ({ socketId, username, cursorPosition }) => {
        updateRemoteCursor(socketId, username, cursorPosition);
      });

      // Clean up cursors when users disconnect
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId }) => {
        removeRemoteCursor(socketId);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off(ACTIONS.CURSOR_UPDATE);
        socketRef.current.off(ACTIONS.DISCONNECTED);
      }
      // Clear all cursors
      Object.keys(userCursorsRef.current).forEach(socketId => {
        removeRemoteCursor(socketId);
      });
    };
  }, [socketRef.current]);

  return (
    <div style={{ height: "600px" }}>
      <textarea id="realtimeEditor"></textarea>
    </div>
  );
}

export default Editor;
