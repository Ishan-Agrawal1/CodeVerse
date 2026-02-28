import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './ChatSidebar.css';

// Code block component with copy functionality
function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  return (
    <div className="ai-code-block">
      <div className="ai-code-toolbar">
        <span className="ai-code-lang">{language || 'code'}</span>
        <button className="ai-copy-btn" onClick={handleCopy}>
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter 
        language={language || 'text'} 
        style={oneDark} 
        customStyle={{ margin: 0, borderRadius: '0 0 8px 8px' }}
        wrapLongLines={true}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

function ChatSidebar({ isOpen, onClose, workspaceId }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history when sidebar opens
  useEffect(() => {
    if (isOpen && workspaceId) {
      loadChatHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, workspaceId]);

  const loadChatHistory = async () => {
    try {
      setLoadingHistory(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/ai/chat/${workspaceId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Transform chat history to message format
        const formattedMessages = [];
        response.data.chatHistory.forEach(chat => {
          if (chat.role === 'user') {
            formattedMessages.push({
              id: chat.id,
              text: chat.message,
              sender: 'user',
              username: chat.username,
              timestamp: new Date(chat.created_at)
            });
          }
          if (chat.response) {
            formattedMessages.push({
              id: `${chat.id}-response`,
              text: chat.response,
              sender: 'ai',
              timestamp: new Date(chat.created_at)
            });
          }
        });
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/ai/chat',
        {
          workspaceId,
          message: inputMessage
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        const aiMessage = {
          id: Date.now() + 1,
          text: response.data.response,
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = async () => {
    if (window.confirm('Are you sure you want to clear all chat history?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(
          `http://localhost:5000/api/ai/chat/${workspaceId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        setMessages([]);
      } catch (error) {
        console.error('Error clearing chat:', error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="chat-sidebar-overlay">
      <div className="chat-sidebar">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-content">
            <div className="chat-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3>AI Assistant</h3>
            </div>
            <div className="chat-header-actions">
              <button 
                className="clear-chat-btn" 
                onClick={clearChat}
                title="Clear chat history"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="3 6 5 6 21 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="close-chat-btn" onClick={onClose}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="chat-messages" ref={chatContainerRef}>
          {loadingHistory ? (
            <div className="loading-history">
              <div className="spinner"></div>
              <p>Loading chat history...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h4>Start a conversation</h4>
              <p>Ask me anything about your code or get help with coding tasks!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`message ${msg.sender === 'user' ? 'user-message' : 'ai-message'} ${msg.isError ? 'error-message' : ''}`}
              >
                <div className="message-avatar">
                  {msg.sender === 'user' ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                  )}
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-sender">
                      {msg.sender === 'user' ? (msg.username || 'You') : 'AI Assistant'}
                    </span>
                    <span className="message-time">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="message-text">
                    {msg.sender === 'ai' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const language = match ? match[1] : '';
                            const value = String(children).replace(/\n$/, '');
                            
                            if (inline) {
                              return <code className="inline-code" {...props}>{children}</code>;
                            }
                            
                            return <CodeBlock language={language} value={value} />;
                          }
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    ) : (
                      msg.text
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="message ai-message typing">
              <div className="message-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Container */}
        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <textarea
              className="chat-input"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask AI anything about your code..."
              rows="1"
              disabled={loading}
            />
            <button
              className="send-button"
              onClick={sendMessage}
              disabled={loading || !inputMessage.trim()}
            >
              {loading ? (
                <div className="spinner-small"></div>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="22" y1="2" x2="11" y2="13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
          <div className="chat-input-hint">
            Press Enter to send, Shift + Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatSidebar;
