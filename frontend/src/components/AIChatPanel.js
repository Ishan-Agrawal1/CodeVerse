import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Send, Check, Copy, Bot, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/Avatar';

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
    <div className="relative my-4 rounded-md overflow-hidden bg-[#0A0D14] border border-slate-700">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700">
        <span className="text-xs text-slate-400 font-mono">{language || 'code'}</span>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="text-sm overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent [&>pre]:!scrollbar-none [&>pre]:!overflow-visible">
        <SyntaxHighlighter 
          language={language || 'text'} 
          style={oneDark} 
          customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
          wrapLongLines={false}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export default function AIChatPanel({ workspaceId }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (workspaceId) {
      loadChatHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const loadChatHistory = async () => {
    if (!workspaceId) return;
    try {
      setLoadingHistory(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/ai/chat/${workspaceId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const formattedMessages = [];
        response.data.chatHistory.forEach(chat => {
          if (chat.role === 'user') {
            formattedMessages.push({
              id: chat.id + '-user',
              text: chat.message,
              sender: 'user',
              username: chat.username,
              timestamp: new Date(chat.created_at)
            });
          }
          if (chat.response) {
            formattedMessages.push({
              id: chat.id + '-ai',
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
    if (!inputMessage.trim() || loading || !workspaceId) return;

    const currentMsg = inputMessage;
    const userMessage = {
      id: Date.now().toString(),
      text: currentMsg,
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
        { workspaceId, message: currentMsg },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (response.data.success) {
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          text: response.data.response,
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
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

  const clearChat = async () => {
    if (window.confirm('Are you sure you want to clear all chat history?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/ai/chat/${workspaceId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages([]);
      } catch (error) {
        console.error('Error clearing chat:', error);
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#12151E]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold tracking-wider text-purple-400 flex items-center gap-2">
          <Bot className="w-4 h-4" /> AI CHATBOT
        </span>
        <button onClick={clearChat} title="Clear Chat" className="text-slate-500 hover:text-red-400 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {loadingHistory ? (
          <div className="text-sm text-slate-500 text-center mt-4">Loading history...</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-slate-500 text-center mt-4 p-4 border border-dashed border-slate-700 rounded-lg">
            Start a conversation with AI! Paste code or ask questions.
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 max-w-full ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              <Avatar className="w-8 h-8 shrink-0 border border-slate-700">
                {msg.sender === 'user' ? (
                  <AvatarFallback className="bg-cyan-900 text-cyan-100 text-xs">U</AvatarFallback>
                ) : (
                  <AvatarFallback className="bg-purple-900 text-purple-100"><Bot className="w-4 h-4" /></AvatarFallback>
                )}
              </Avatar>
              <div className={`flex flex-col relative max-w-[85%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className="text-[10px] text-slate-500 mb-1 px-1">
                  {msg.sender === 'user' ? 'You' : 'Codeverse AI'}
                </div>
                <div 
                  className={`text-sm rounded-xl p-3 shadow-md border ${
                    msg.sender === 'user' 
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200' 
                      : msg.isError 
                        ? 'bg-red-900/20 border-red-900/50 text-red-200' 
                        : 'bg-[#0A0D14] border-purple-500/30 text-slate-300'
                  }`}
                  style={{ wordBreak: 'break-word' }}
                >
                  {msg.sender === 'ai' ? (
                    <div className="text-sm text-slate-300">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const language = match ? match[1] : '';
                            const value = String(children).replace(/\n$/, '');
                            if (inline) {
                              return <code className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded text-xs mx-0.5 font-mono" {...props}>{children}</code>;
                            }
                            return <CodeBlock language={language} value={value} />;
                          },
                          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="mb-1 leading-relaxed">{children}</li>,
                          a: ({ href, children }) => <a href={href} className="text-cyan-400 hover:underline">{children}</a>,
                          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4 text-white">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 text-white">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold mb-2 mt-2 text-white">{children}</h3>,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex gap-3 max-w-full">
            <Avatar className="w-8 h-8 shrink-0 border border-slate-700">
              <AvatarFallback className="bg-purple-900 text-purple-100"><Bot className="w-4 h-4" /></AvatarFallback>
            </Avatar>
            <div className="flex items-center bg-[#0A0D14] border border-purple-500/30 rounded-xl p-3 w-16 h-10 shadow-md">
              <span className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4 shrink-0" />
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 relative z-10">
        <div className="flex items-end bg-[#0A0D14] rounded-lg p-2 border border-slate-700 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all shadow-inner">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask AI anything..."
            className="flex-1 max-h-32 min-h-[40px] bg-transparent px-2 py-1 text-sm text-slate-200 placeholder:text-slate-600 outline-none resize-none scrollbar-thin scrollbar-thumb-slate-700"
            disabled={loading}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !inputMessage.trim()}
            className="w-10 h-10 shrink-0 rounded-md bg-purple-600/20 text-purple-400 flex items-center justify-center hover:bg-purple-600 hover:text-white transition-all disabled:opacity-40 disabled:hover:bg-purple-600/20 disabled:hover:text-purple-400 ml-2 shadow-[0_0_15px_rgba(147,51,234,0.1)]"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
        <div className="text-[10px] text-slate-500 text-center mt-2">
          Press Enter to send, Shift + Enter for new line
        </div>
      </div>
    </div>
  );
}
