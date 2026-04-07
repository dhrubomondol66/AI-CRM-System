import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePlatform } from '../pages/platformContext';
import '../assets/styles/chat-widget.css';
import chatbot from '../assets/icons8-chat-bot-50.png';
import close from '../assets/icons8-sort-down-24.png';
import send from '../assets/sending.png';
import axios from 'axios';

/**
 * ChatBot Component
 * A premium chat interface that can be used as a standalone component or within the widget.
 */

// Helper to get CSRF token
const getCookie = (name) => {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
            cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
            break;
        }
    }
  }
  return cookieValue;
};

// Helper for consistent session persistence
const getSessionId = () => {
  let sid = sessionStorage.getItem('chat_session_id');
  if (!sid) {
    sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('chat_session_id', sid);
  }
  return sid;
};

const getUserId = () => {
  let uid = localStorage.getItem('chat_user_id');
  if (!uid) {
    uid = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('chat_user_id', uid);
  }
  return uid;
};

// ✅ Client-Side History Buffer
const getChatBuffer = (businessId) => {
    const buf = localStorage.getItem(`chat_buffer_${businessId}`);
    return buf ? JSON.parse(buf) : [];
};

const updateChatBuffer = (businessId, role, content) => {
    const buf = getChatBuffer(businessId);
    buf.push({ role, content });
    // Limit to last 20 messages to save tokens/storage
    if (buf.length > 20) buf.shift(); 
    localStorage.setItem(`chat_buffer_${businessId}`, JSON.stringify(buf));
};

const chatbotapi = axios.create({
  baseURL: import.meta.env.PROD
    ? "https://ai-reservation.onrender.com"   // ONLY domain
    : "",
  withCredentials: true, // Required for Django session cookies (credentials: 'include')
  headers: {
    "Content-Type": "application/json",
  },
});

chatbotapi.interceptors.request.use((config) => {
  const csrftoken = getCookie('csrftoken');
  if (csrftoken) {
    config.headers['X-CSRFToken'] = csrftoken;
  }
  return config;
});


const ChatBot = ({ isWidget = true, onClose }) => {
  const navigate = useNavigate();
  const { platformName } = usePlatform();
  const { business_slug } = useParams();

  const [message, setMessage] = useState('');
  
  const businessNameSlug = business_slug || platformName?.toLowerCase()
    ?.replace(/[^a-z0-9\s-]/g, '')
    ?.replace(/\s+/g, '-')
    ?.replace(/-+/g, '-');
    
  const baseUrl = window.location.origin;

  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: `Hello! I'm your AI assistant. How can I help you manage your business today?`,
      sender: 'ai', 
      time: '10:00 AM' 
    },
  ]);
  const messagesEndRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingDots, setTypingDots] = useState('.');

  const sessionId = useRef(getSessionId()).current;
  const userId = useRef(getUserId()).current;

  // Initial greeting or load from buffer if needed? 
  // For now, satisfy the "user identifies" request by sending buffer in handleSend.

  const handleBusinessLink = () => {
    // Navigate to /receptionist/{businessName}
    const businessName = business_slug || platformName.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')        // Replace spaces with -
      .replace(/-+/g, '-');        // Remove consecutive -
    navigate(`/receptionist/${businessName}`);
  };

  const renderMessageText = (text) => {
    if (!text) return null;
    
    // 1. Define keywords
    const keywords = [
      'receptionist', 'digital receptionist', 'booking page', 'book a call',
      platformName.toLowerCase(), business_slug?.toLowerCase()
    ].filter(Boolean);

    // 2. URL detection regex that excludes trailing parentheses/punctuation
    const urlPattern = /(https?:\/\/[^\s\)]+)/gi;
    
    let parts = [text];
    
    // Linkify actual URLs first
    parts = parts.flatMap((part, partIdx) => {
      if (typeof part !== 'string') return [part];
      const split = part.split(urlPattern);
      return split.map((subPart, i) => {
        if (subPart.match(urlPattern)) {
          return (
            <span 
              key={`url-${partIdx}-${i}`}
              onClick={(e) => {
                e.stopPropagation();
                window.open(subPart, '_blank', 'noopener,noreferrer');
              }}
              style={{
                color: '#2563eb',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontWeight: '600',
                wordBreak: 'break-all'
              }}
            >
              {subPart}
            </span>
          );
        }
        return subPart;
      });
    });

    // Linkify keywords next
    keywords.forEach((keyword, kwIdx) => {
      let nextParts = [];
      parts.forEach((part, partIdx) => {
        if (typeof part !== 'string') {
          nextParts.push(part);
          return;
        }
        
        const regex = new RegExp(`(${keyword})`, 'gi');
        const split = part.split(regex);
        
        split.forEach((subPart, i) => {
          if (subPart.toLowerCase() === keyword.toLowerCase()) {
            nextParts.push(
              <span 
                key={`kw-${kwIdx}-${partIdx}-${i}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleBusinessLink();
                }}
                style={{
                  color: '#2563eb',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {subPart}
              </span>
            );
          } else if (subPart) {
            nextParts.push(subPart);
          }
        });
      });
      parts = nextParts;
    });
    
    return parts;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isTyping) {
      const interval = setInterval(() => {
        setTypingDots(prev => {
          if (prev === '.') return '..';
          if (prev === '..') return '...';
          return '.';
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setTypingDots('.');
    }
  }, [isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, newMessage]);
    setMessage('');
    
    // Show typing indicator
    setIsTyping(true);

    const chatBuffer = getChatBuffer(businessNameSlug);

    try {
      // Debug log to confirm API URL
      console.log("API URL:", chatbotapi.defaults.baseURL);
      
      // Call the chatbot API with persistent session IDs and browser-side chat history
      const response = await chatbotapi.post('/api/global-chat/', {
        message: message,
        user_id: userId,
        session_id: sessionId,
        chat_history: chatBuffer // ✅ Sending local history for AI context
      });

      console.log('Chatbot API response:', response.data);

      // Check if response is HTML (indicating a routing/proxy issue)
      if (typeof response.data === 'string' && response.data.includes('<!doctype html>')) {
        throw new Error('API returned HTML instead of JSON - routing configuration issue');
      }

      const responseText = response.data?.response || response.data?.message || response.data?.answer || response.data?.text || JSON.stringify(response.data);
      
      const aiResponse = {
        id: Date.now() + 1,
        text: responseText,
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      // Hide typing indicator and show AI response
      setIsTyping(false);
      setMessages(prev => [...prev, aiResponse]);

      // ✅ Update browser's local memory for future context
      updateChatBuffer(businessNameSlug, 'user', message);
      updateChatBuffer(businessNameSlug, 'assistant', responseText);

    } catch (error) {
      console.error('Chatbot API error:', error);
      
      // Simple error response when backend fails
      const errorResponse = {
        id: Date.now() + 1,
        text: "Sorry, I'm having trouble connecting to the chatbot service right now. Please try again later.",
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorResponse]);
    }
  };

  return (
    <div className={`chatbot-container ${isWidget ? 'widget-mode' : 'fullscreen-mode'}`}>
      <div className="widget-chat-header">
        <div className="widget-chat-header-avatar">
          <div className="widget-avatar-circle">
            <img src={chatbot} alt="chatbot" style={{height:'40px', width:'auto'}}/>
          </div>
        </div>
        <div className="widget-chat-header-info">
          <h3>AI Business Assistant</h3>
          <div className="widget-chat-header-status">
            <span className="widget-status-dot"></span>
            <span>Always Active</span>
          </div>
        </div>
        {isWidget && onClose && (
          <button className="widget-chat-close-btn" onClick={onClose}>
            <img src={close} alt="close" />
          </button>
        )}
      </div>

      <div className="widget-chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`widget-message-wrapper ${msg.sender}`}>
            <div className={`widget-message ${msg.sender}`}>
              {renderMessageText(msg.text)}
            </div>
            <div className="widget-message-time">{msg.time}</div>
          </div>
        ))}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="widget-message-wrapper ai">
            <div className="widget-message-time">AI is typing{typingDots}</div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form className="widget-chat-input-area" onSubmit={handleSend}>
        
        <input
          type="text"
          className="widget-chat-input"
          placeholder="Ask me anything..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{color:"black"}}
        />
        <button type="submit" className="widget-send-button" disabled={!message.trim()}>
          <img src={send} alt="send" />
        </button>
      </form>
    </div>
  );
};

export default ChatBot;
