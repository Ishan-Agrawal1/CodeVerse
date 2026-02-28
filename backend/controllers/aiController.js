const { GoogleGenerativeAI } = require('@google/generative-ai');
const { pool } = require('../config/db');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.sendMessage = async (req, res) => {
  try {
    const { workspaceId, message } = req.body;
    const userId = req.user.id;

    if (!message || !workspaceId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message and workspace ID are required' 
      });
    }

    // Get previous chat history for context
    const [chatHistory] = await pool.query(
      `SELECT message, response, role 
       FROM chat_messages 
       WHERE workspace_id = ? 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [workspaceId]
    );

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Build conversation prompt with history
    let prompt = '';
    if (chatHistory.length > 0) {
      prompt = 'Previous conversation:\n';
      chatHistory.reverse().forEach(chat => {
        prompt += `User: ${chat.message}\n`;
        if (chat.response) {
          prompt += `Assistant: ${chat.response}\n`;
        }
      });
      prompt += `\nUser: ${message}\nAssistant:`;
    } else {
      prompt = message;
    }

    // Get AI response
    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();

    // Save user message to database
    await pool.query(
      `INSERT INTO chat_messages (workspace_id, user_id, message, role) 
       VALUES (?, ?, ?, 'user')`,
      [workspaceId, userId, message]
    );

    // Save AI response to database
    await pool.query(
      `INSERT INTO chat_messages (workspace_id, user_id, message, response, role) 
       VALUES (?, ?, ?, ?, 'assistant')`,
      [workspaceId, userId, message, aiResponse]
    );

    res.json({
      success: true,
      message: 'Message sent successfully',
      response: aiResponse
    });

  } catch (error) {
    console.error('Error in AI chat:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI response',
      error: error.message
    });
  }
};

exports.getChatHistory = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    // Verify user has access to workspace
    const [workspaceAccess] = await pool.query(
      `SELECT uw.* FROM user_workspaces uw 
       WHERE uw.user_id = ? AND uw.workspace_id = ?`,
      [userId, workspaceId]
    );

    if (workspaceAccess.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this workspace'
      });
    }

    // Get chat history
    const [chatHistory] = await pool.query(
      `SELECT cm.*, u.username 
       FROM chat_messages cm
       LEFT JOIN users u ON cm.user_id = u.id
       WHERE cm.workspace_id = ?
       ORDER BY cm.created_at ASC`,
      [workspaceId]
    );

    res.json({
      success: true,
      chatHistory
    });

  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat history',
      error: error.message
    });
  }
};

exports.clearChatHistory = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    // Verify user is owner or has permission
    const [workspace] = await pool.query(
      `SELECT owner_id FROM workspaces WHERE id = ?`,
      [workspaceId]
    );

    if (workspace.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found'
      });
    }

    // Delete chat history
    await pool.query(
      `DELETE FROM chat_messages WHERE workspace_id = ?`,
      [workspaceId]
    );

    res.json({
      success: true,
      message: 'Chat history cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear chat history',
      error: error.message
    });
  }
};
