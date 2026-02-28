import React, { useState, useEffect, useRef } from 'react';
import { ACTIONS } from '../Actions';
import { useAuth } from '../contexts/AuthContext';
import './UserChat.css';

function UserChat({ isOpen, onClose, workspaceId, socketRef, workspaceInfo }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { user } = useAuth();
  
  // Debug logging
  useEffect(() => {
    console.log('UserChat component props:', { workspaceInfo, user, isOpen });
  }, [workspaceInfo, user, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socketRef.current) return;

    // Request chat history when opening
    if (isOpen) {
      socketRef.current.emit(ACTIONS.CHAT_HISTORY, { roomId: workspaceId });
    }

    // Listen for chat history
    const handleChatHistory = ({ messages: historyMessages }) => {
      setMessages(historyMessages);
    };

    // Listen for new chat messages
    const handleChatMessage = ({ id, username, message, timestamp, userId }) => {
      setMessages((prev) => [...prev, { id, username, message, timestamp, userId }]);
    };

    // Listen for typing indicators
    const handleUserTyping = ({ username, isTyping }) => {
      if (isTyping) {
        setTypingUsers((prev) => {
          if (!prev.includes(username)) {
            return [...prev, username];
          }
          return prev;
        });
      } else {
        setTypingUsers((prev) => prev.filter((user) => user !== username));
      }
    };

    // Listen for message deletion
    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    };

    // Listen for all messages deletion
    const handleAllDeleted = () => {
      setMessages([]);
    };

    // Listen for errors
    const handleError = (error) => {
      console.error('Socket error:', error);
      alert(error.message || 'An error occurred');
    };

    const socket = socketRef.current;
    socket.on(ACTIONS.CHAT_HISTORY, handleChatHistory);
    socket.on(ACTIONS.CHAT_MESSAGE, handleChatMessage);
    socket.on(ACTIONS.USER_TYPING, handleUserTyping);
    socket.on(ACTIONS.CHAT_MESSAGE_DELETED, handleMessageDeleted);
    socket.on(ACTIONS.CHAT_ALL_DELETED, handleAllDeleted);
    socket.on('error', handleError);

    return () => {
      socket.off(ACTIONS.CHAT_HISTORY, handleChatHistory);
      socket.off(ACTIONS.CHAT_MESSAGE, handleChatMessage);
      socket.off(ACTIONS.USER_TYPING, handleUserTyping);
      socket.off(ACTIONS.CHAT_MESSAGE_DELETED, handleMessageDeleted);
      socket.off(ACTIONS.CHAT_ALL_DELETED, handleAllDeleted);
      socket.off('error', handleError);
    };
  }, [socketRef, workspaceId, isOpen]);

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);

    // Emit typing indicator
    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.USER_TYPING, {
        roomId: workspaceId,
        username: user.username,
        isTyping: true,
      });

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit(ACTIONS.USER_TYPING, {
            roomId: workspaceId,
            username: user.username,
            isTyping: false,
          });
        }
      }, 2000);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !socketRef.current) return;

    const messageData = {
      roomId: workspaceId,
      username: user.username,
      userId: user.id,
      message: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    // Emit the message
    socketRef.current.emit(ACTIONS.CHAT_MESSAGE, messageData);

    // Clear input and stop typing indicator
    setInputMessage('');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socketRef.current.emit(ACTIONS.USER_TYPING, {
      roomId: workspaceId,
      username: user.username,
      isTyping: false,
    });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleDeleteMessage = (messageId) => {
    console.log('handleDeleteMessage called with messageId:', messageId);
    console.log('workspaceId:', workspaceId);
    console.log('user.id:', user.id);
    
    if (!socketRef.current) {
      console.error('No socket connection!');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this message?')) {
      console.log('Emitting CHAT_DELETE_MESSAGE...');
      socketRef.current.emit(ACTIONS.CHAT_DELETE_MESSAGE, {
        roomId: workspaceId,
        messageId: messageId,
        userId: user.id,
      });
      console.log('Delete message event emitted');
    }
  };

  const handleDeleteAllMessages = () => {
    console.log('handleDeleteAllMessages called');
    if (!socketRef.current) {
      console.error('No socket connection!');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete ALL chat messages? This action cannot be undone.')) {
      console.log('Emitting CHAT_DELETE_ALL...');
      socketRef.current.emit(ACTIONS.CHAT_DELETE_ALL, {
        roomId: workspaceId,
        userId: user.id,
      });
      console.log('Delete all messages event emitted');
    }
  };

  const canDeleteMessage = (msg) => {
    // Check if message has an ID (required for deletion)
    if (!msg.id) {
      console.log('No message ID:', msg);
      return false;
    }
    
    // Debug logging
    console.log('canDeleteMessage check:', {
      msgId: msg.id,
      workspaceInfo,
      userRole: workspaceInfo?.userRole,
      isOwner: workspaceInfo?.userRole === 'owner',
      userId: user.id,
      msgUserId: msg.userId
    });
    
    // Owner can delete any message
    if (workspaceInfo?.userRole === 'owner') {
      console.log('✅ Owner can delete message:', msg.id);
      return true;
    }
    
    // User can delete their own messages within 5 minutes
    if (msg.userId === user.id) {
      const messageTime = new Date(msg.timestamp).getTime();
      const currentTime = new Date().getTime();
      const timeDifferenceMinutes = (currentTime - messageTime) / (1000 * 60);
      const canDelete = timeDifferenceMinutes <= 5;
      console.log(`User message ${msg.id}: ${timeDifferenceMinutes.toFixed(2)} mins ago, canDelete: ${canDelete}`);
      return canDelete;
    }
    
    console.log('❌ Cannot delete message:', msg.id);
    return false;
  };

  const renderMessages = () => {
    let lastDate = null;
    const elements = [];
    
    console.log('=== Render Messages Debug ===');
    console.log('workspaceInfo:', workspaceInfo);
    console.log('user:', user);
    console.log('messages:', messages);

    messages.forEach((msg, index) => {
      const messageDate = formatDate(msg.timestamp);
      
      // Add date separator if date changed
      if (messageDate !== lastDate) {
        elements.push(
          <div key={`date-${index}`} className="user-chat-date-separator">
            <span>{messageDate}</span>
          </div>
        );
        lastDate = messageDate;
      }

      const isOwnMessage = msg.userId === user.id || msg.username === user.username;
      const showDeleteButton = canDeleteMessage(msg);
      
      elements.push(
        <div
          key={msg.id || index}
          className={`user-chat-message ${isOwnMessage ? 'own-message' : 'other-message'}`}
        >
          <div className="user-chat-message-header">
            <span className="user-chat-username">{msg.username}</span>
            <div className="user-chat-message-actions">
              <span className="user-chat-timestamp">{formatTime(msg.timestamp)}</span>
              {showDeleteButton && (
                <button 
                  className="user-chat-delete-btn"
                  onClick={() => handleDeleteMessage(msg.id)}
                  title="Delete message"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="3 6 5 6 21 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="user-chat-message-content">{msg.message}</div>
        </div>
      );
    });

    return elements;
  };

  if (!isOpen) return null;
  
  // Debug: check if owner delete button should show
  const isOwner = workspaceInfo?.userRole === 'owner';
  console.log('Render check - isOwner:', isOwner, 'workspaceInfo:', workspaceInfo);

  return (
    <div className="user-chat-sidebar">
      <div className="user-chat-header">
        <h2>Team Chat</h2>
        <div className="user-chat-header-actions">
          {isOwner && (
            <button 
              className="user-chat-delete-all-btn" 
              onClick={handleDeleteAllMessages}
              title="Delete all messages"
              disabled={messages.length === 0}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="3 6 5 6 21 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="10" y1="11" x2="10" y2="17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="14" y1="11" x2="14" y2="17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          <button className="user-chat-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="user-chat-messages-container">
        {messages.length === 0 ? (
          <div className="user-chat-empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>No messages yet</p>
            <span>Start the conversation!</span>
          </div>
        ) : (
          <>
            {renderMessages()}
            {typingUsers.length > 0 && (
              <div className="user-chat-typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="user-chat-input-container" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={inputMessage}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="user-chat-input"
        />
        <button type="submit" className="user-chat-send-btn" disabled={!inputMessage.trim()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="22" y1="2" x2="11" y2="13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </form>
    </div>
  );
}

export default UserChat;
