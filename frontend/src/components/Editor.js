import React, { useEffect, useRef } from "react";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/python/python";
import "codemirror/mode/clike/clike";
import "codemirror/mode/ruby/ruby";
import "codemirror/mode/go/go";
import "codemirror/mode/rust/rust";
import "codemirror/mode/php/php";
import "codemirror/mode/sql/sql";
import "codemirror/mode/swift/swift";
import "codemirror/mode/r/r";
import "codemirror/theme/dracula.css";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/lib/codemirror.css";
import CodeMirror from "codemirror";
import { ACTIONS } from "../Actions";
import "./Editor.css";

// Map JDoodle language names to CodeMirror MIME types
const LANGUAGE_TO_CM_MODE = {
  python3: "text/x-python",
  java: "text/x-java",
  cpp: "text/x-c++src",
  c: "text/x-csrc",
  nodejs: "text/javascript",
  ruby: "text/x-ruby",
  go: "text/x-go",
  rust: "text/x-rustsrc",
  php: "application/x-httpd-php",
  swift: "text/x-swift",
  kotlin: "text/x-kotlin",
  scala: "text/x-scala",
  r: "text/x-rsrc",
  sql: "text/x-sql",
};

function Editor({
  socketRef,
  roomId,
  onCodeChange,
  showCursors = true,
  language = "python3",
  fontSize = 14,
  wordWrap = true,
}) {
  const editorRef = useRef(null);
  const userCursorsRef = useRef({});
  const showCursorsRef = useRef(showCursors);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Generate a random color for each user
  const getColorForUser = (socketId) => {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#FFA07A",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E2",
      "#F8B739",
      "#52B788",
      "#E63946",
      "#06FFA5",
    ];
    const hash = socketId
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Create cursor widget
  const createCursorWidget = (username, color) => {
    const cursorElement = document.createElement("div");
    cursorElement.className = "remote-cursor";
    cursorElement.style.borderLeftColor = color;

    const labelElement = document.createElement("div");
    labelElement.className = "cursor-label";
    labelElement.style.backgroundColor = color;
    labelElement.textContent = username;

    cursorElement.appendChild(labelElement);
    return cursorElement;
  };

  // Update remote cursor position
  const updateRemoteCursor = (socketId, username, position) => {
    if (!editorRef.current || !showCursorsRef.current) return;

    const color = getColorForUser(socketId);

    // Remove old cursor if exists
    if (userCursorsRef.current[socketId]) {
      userCursorsRef.current[socketId].clear();
    }

    // Create and place new cursor
    const cursorWidget = createCursorWidget(username, color);
    const cursorMarker = editorRef.current.setBookmark(
      { line: position.line, ch: position.ch },
      { widget: cursorWidget, insertLeft: true },
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
      const cmMode = LANGUAGE_TO_CM_MODE[language] || "text/javascript";
      const editor = CodeMirror.fromTextArea(
        document.getElementById("realtimeEditor"),
        {
          mode: cmMode,
          theme: "dracula",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
          lineWrapping: wordWrap,
        },
      );
      editorRef.current = editor;

      editor.setSize(null, "100%");
      editor.getWrapperElement().style.fontSize = fontSize + "px";

      // Setup resize observer
      const resizeObserver = new ResizeObserver(() => {
        editor.setSize(null, "100%");
        editor.refresh();
      });
      const wrapperElement = editor.getWrapperElement();
      if (wrapperElement && wrapperElement.parentElement) {
        resizeObserver.observe(wrapperElement.parentElement);
      }
      // Attach to editor instance for cleanup
      editor.resizeObserver = resizeObserver;

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
        if (showCursorsRef.current) {
          const cursor = editorRef.current.getCursor();
          socketRef.current.emit(ACTIONS.CURSOR_POSITION, {
            roomId,
            cursorPosition: { line: cursor.line, ch: cursor.ch },
          });
        }
      });
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dynamically update CodeMirror mode when language changes
  useEffect(() => {
    if (editorRef.current) {
      const cmMode = LANGUAGE_TO_CM_MODE[language] || "text/javascript";
      editorRef.current.setOption("mode", cmMode);
    }
  }, [language]);

  // Dynamically update font size
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.getWrapperElement().style.fontSize = fontSize + "px";
      editorRef.current.refresh();
    }
  }, [fontSize]);

  // Dynamically update word wrap
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setOption("lineWrapping", wordWrap);
    }
  }, [wordWrap]);

  // Keep ref in sync with prop
  useEffect(() => {
    showCursorsRef.current = showCursors;
    if (!showCursors) {
      // Hide all remote cursors
      Object.keys(userCursorsRef.current).forEach((socketId) => {
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
      socketRef.current.on(
        ACTIONS.CURSOR_UPDATE,
        ({ socketId, username, cursorPosition }) => {
          updateRemoteCursor(socketId, username, cursorPosition);
        },
      );

      // Clean up cursors when users disconnect
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId }) => {
        removeRemoteCursor(socketId);
      });
    }

    return () => {
      // Cleanup resize observer
      if (editorRef.current && editorRef.current.resizeObserver) {
        editorRef.current.resizeObserver.disconnect();
      }

      if (socketRef.current) {
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off(ACTIONS.CURSOR_UPDATE);
        socketRef.current.off(ACTIONS.DISCONNECTED);
      }
      // Clear all cursors
      Object.keys(userCursorsRef.current).forEach((socketId) => {
        removeRemoteCursor(socketId);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketRef.current]);

  // Resize observer to handle editor resizing
  useEffect(() => {
    if (!editorRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      editorRef.current.setSize(null, "100%");
      editorRef.current.refresh();
    });

    const container = document.getElementById("realtimeEditor")?.parentElement;
    if (container) {
      resizeObserver.observe(container);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <textarea id="realtimeEditor"></textarea>
    </div>
  );
}

export default Editor;
