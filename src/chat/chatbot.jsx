import React, { useState, useEffect, useRef } from 'react';
import '../assets/styles/chat-widget.css';
import chatbot from '../assets/icons8-chat-bot-50.png';
import close from '../assets/icons8-sort-down-24.png';
import send from '../assets/sending.png';
import axios from 'axios';

/**
 * ChatBot Component
 * A premium chat interface that can be used as a standalone component or within the widget.
 */

const chatbotapi = axios.create({
  baseURL: import.meta.env.PROD 
    ? 'https://ai-reservation.onrender.com/api/global-chat/'
    : '/api/global-chat/',
  headers: {
    'Content-Type': 'application/json',
  },
  ...(import.meta.env.PROD && {
    withCredentials: false, // Don't send credentials for cross-origin requests
  })
});

const ChatBot = ({ isWidget = true, onClose }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your AI assistant. How can I help you manage your business today?", sender: 'ai', time: '10:00 AM' },
  ]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    try {
      // Call the chatbot API
      const response = await chatbotapi.post('', {
        message: message,
        user_id: 'user_' + Date.now(), // Generate a temporary user ID
        session_id: 'session_' + Date.now() // Generate a temporary session ID
      });

      console.log('Chatbot API response:', response.data);

      // Check if response is HTML (indicating a routing/proxy issue)
      if (typeof response.data === 'string' && response.data.includes('<!doctype html>')) {
        throw new Error('API returned HTML instead of JSON - proxy configuration issue');
      }

      const aiResponse = {
        id: Date.now() + 1,
        text: response.data?.response || response.data?.message || response.data?.answer || response.data?.text || JSON.stringify(response.data),
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Chatbot API error:', error);
      
      // Enhanced fallback response with more context
      const fallbackResponse = {
        id: Date.now() + 1,
        text: import.meta.env.PROD 
          ? "I'm currently experiencing connection issues in the production environment. This is a known issue with cross-origin requests. I can still help you with: 📅 Booking management, 📊 Customer tracking, 💼 Business analytics, and 🚀 CRM features. What would you like to know about?"
          : "I'm having trouble connecting right now, but I'm here to help! Our CRM system can help you manage reservations, track customers, and grow your business. What would you like to know?",
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, fallbackResponse]);
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
              {msg.text}
            </div>
            <div className="widget-message-time">{msg.time}</div>
          </div>
        ))}
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
