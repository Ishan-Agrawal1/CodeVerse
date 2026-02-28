const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const ACTIONS = require("./Actions");
const cors = require("cors");
const axios = require("axios");
const server = http.createServer(app);
require("dotenv").config();
const { initializeDatabase } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const fileRoutes = require("./routes/fileRoutes");
const aiRoutes = require("./routes/aiRoutes");
const { cleanupExpiredSessions } = require("./utils/sessionManager");

const languageConfig = {
  python3: { versionIndex: "3" },
  java: { versionIndex: "3" },
  cpp: { versionIndex: "4" },
  c: { versionIndex: "4" }
};

app.use(cors());

app.use(express.json());

app.use('/api/auth', authRoutes);

app.use('/api/workspaces', workspaceRoutes);

app.use('/api/workspaces', fileRoutes);

app.use('/api/ai', aiRoutes);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const userSocketMap = {};
const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
};

io.on("connection", (socket) => {
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });
  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.CURSOR_POSITION, ({ roomId, cursorPosition }) => {
    socket.in(roomId).emit(ACTIONS.CURSOR_UPDATE, {
      socketId: socket.id,
      username: userSocketMap[socket.id],
      cursorPosition,
    });
  });

  // Chat message handling
  socket.on(ACTIONS.CHAT_MESSAGE, async ({ roomId, username, userId, message, timestamp }) => {
    // Store message in database first to get the ID
    try {
      const { pool } = require('./config/db');
      // Convert ISO timestamp to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
      const mysqlTimestamp = new Date(timestamp).toISOString().slice(0, 19).replace('T', ' ');
      const [result] = await pool.query(
        `INSERT INTO user_chat_messages (workspace_id, user_id, username, message, timestamp) 
         VALUES (?, ?, ?, ?, ?)`,
        [roomId, userId, username, message, mysqlTimestamp]
      );
      
      // Get the created_at timestamp from database for accurate time tracking
      const [msgRows] = await pool.query(
        'SELECT created_at FROM user_chat_messages WHERE id = ?',
        [result.insertId]
      );
      
      const messageData = { 
        id: result.insertId, 
        username, 
        userId, 
        message, 
        timestamp: msgRows[0].created_at // Use database timestamp for consistency
      };
      
      // Broadcast to all clients in the room including sender
      io.in(roomId).emit(ACTIONS.CHAT_MESSAGE, messageData);
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  });

  // Request chat history
  socket.on(ACTIONS.CHAT_HISTORY, async ({ roomId }) => {
    try {
      const { pool } = require('./config/db');
      const [rows] = await pool.query(
        `SELECT id, user_id as userId, username, message, created_at as timestamp 
         FROM user_chat_messages 
         WHERE workspace_id = ? 
         ORDER BY created_at ASC`,
        [roomId]
      );
      
      socket.emit(ACTIONS.CHAT_HISTORY, { messages: rows });
    } catch (error) {
      console.error('Error fetching chat history:', error);
      socket.emit(ACTIONS.CHAT_HISTORY, { messages: [] });
    }
  });

  // Delete a specific chat message
  socket.on(ACTIONS.CHAT_DELETE_MESSAGE, async ({ roomId, messageId, userId }) => {
    console.log('CHAT_DELETE_MESSAGE received:', { roomId, messageId, userId });
    try {
      const { pool } = require('./config/db');
      
      // Check if user is the workspace owner
      const [workspaceRows] = await pool.query(
        'SELECT owner_id FROM workspaces WHERE id = ?',
        [roomId]
      );
      
      console.log('Workspace query result:', workspaceRows);
      
      if (workspaceRows.length === 0) {
        console.log('Workspace not found');
        socket.emit('error', { message: 'Workspace not found' });
        return;
      }
      
      const isOwner = workspaceRows[0].owner_id === userId;
      console.log('Is owner?', isOwner);
      
      // Get message details - use created_at for reliable time comparison
      const [messageRows] = await pool.query(
        'SELECT user_id, created_at FROM user_chat_messages WHERE id = ? AND workspace_id = ?',
        [messageId, roomId]
      );
      
      console.log('Message query result:', messageRows);
      
      if (messageRows.length === 0) {
        console.log('Message not found');
        socket.emit('error', { message: 'Message not found' });
        return;
      }
      
      const message = messageRows[0];
      const isMessageOwner = message.user_id === userId;
      console.log('Is message owner?', isMessageOwner);
      
      // Check permissions
      if (!isOwner && !isMessageOwner) {
        console.log('Permission denied');
        socket.emit('error', { message: 'You do not have permission to delete this message' });
        return;
      }
      
      // If user is not owner, check if message is within deletion time limit (5 minutes)
      if (!isOwner && isMessageOwner) {
        const messageTime = new Date(message.created_at).getTime();
        const currentTime = new Date().getTime();
        const timeDifferenceMinutes = (currentTime - messageTime) / (1000 * 60);
        
        console.log(`Created at: ${message.created_at}`);
        console.log(`Current time: ${new Date()}`);
        console.log(`Time difference: ${timeDifferenceMinutes} minutes`);
        
        if (timeDifferenceMinutes > 5) {
          console.log('Time limit exceeded');
          socket.emit('error', { message: 'You can only delete messages within 5 minutes of sending' });
          return;
        }
      }
      
      // Delete the message
      console.log('Deleting message from database...');
      await pool.query(
        'DELETE FROM user_chat_messages WHERE id = ? AND workspace_id = ?',
        [messageId, roomId]
      );
      
      console.log('Message deleted successfully, broadcasting to room...');
      // Notify all clients in the room
      io.in(roomId).emit(ACTIONS.CHAT_MESSAGE_DELETED, { messageId });
      console.log('Broadcast complete');
    } catch (error) {
      console.error('Error deleting chat message:', error);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  });

  // Delete all chat messages (owner only)
  socket.on(ACTIONS.CHAT_DELETE_ALL, async ({ roomId, userId }) => {
    console.log('CHAT_DELETE_ALL received:', { roomId, userId });
    try {
      const { pool } = require('./config/db');
      
      // Check if user is the workspace owner
      const [workspaceRows] = await pool.query(
        'SELECT owner_id FROM workspaces WHERE id = ?',
        [roomId]
      );
      
      console.log('Workspace query result:', workspaceRows);
      
      if (workspaceRows.length === 0) {
        console.log('Workspace not found');
        socket.emit('error', { message: 'Workspace not found' });
        return;
      }
      
      const isOwner = workspaceRows[0].owner_id === userId;
      console.log('Is owner?', isOwner);
      
      if (!isOwner) {
        console.log('Not owner - permission denied');
        socket.emit('error', { message: 'Only workspace owner can delete all messages' });
        return;
      }
      
      // Delete all messages for this workspace
      console.log('Deleting all messages from database...');
      await pool.query(
        'DELETE FROM user_chat_messages WHERE workspace_id = ?',
        [roomId]
      );
      
      console.log('All messages deleted, broadcasting to room...');
      // Notify all clients in the room
      io.in(roomId).emit(ACTIONS.CHAT_ALL_DELETED);
      console.log('Broadcast complete');
    } catch (error) {
      console.error('Error deleting all chat messages:', error);
      socket.emit('error', { message: 'Failed to delete all messages' });
    }
  });

  // Typing indicator
  socket.on(ACTIONS.USER_TYPING, ({ roomId, username, isTyping }) => {
    socket.in(roomId).emit(ACTIONS.USER_TYPING, { username, isTyping });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });

    delete userSocketMap[socket.id];
    socket.leave();
  });
});

app.post("/compile", async (req, res) => {
  const { code, language } = req.body;

  try {
    const response = await axios.post("https://api.jdoodle.com/v1/execute", {
      script: code,
      language: language,
      versionIndex: languageConfig[language].versionIndex,
      clientId: process.env.jDoodle_clientId,
      clientSecret: process.env.jDoodle_clientSecret,
    });

    res.json(response.data);
  } catch (error) {
    console.error("JDoodle API Error:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.error || error.message || "Failed to compile code";
    res.status(500).json({ 
      error: "Failed to compile code",
      details: errorMessage 
    });
  }
});

const PORT = process.env.PORT || 5000;

initializeDatabase()
  .then(() => {
    server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
    
    setInterval(() => {
      cleanupExpiredSessions();
    }, 60 * 60 * 1000);

    cleanupExpiredSessions();
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
