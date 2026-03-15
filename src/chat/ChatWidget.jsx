import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import ChatBot from './chatbot.jsx';
import '../assets/styles/chat-widget.css';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Define routes where the chat widget should be visible
  const publicRoutes = ['/', '/customerservice', '/customerservices', '/platformContact'];
  const excludedPrefixes = ['/admin', '/login', '/forgot-password', '/reset-password', '/profile', '/analytics', '/settings', '/addbusiness', '/paymentsystem'];

  const isLandingPage = 
    publicRoutes.includes(location.pathname) || 
    location.pathname.startsWith('/customerservice/') ||
    (location.pathname !== '/' && !excludedPrefixes.some(prefix => location.pathname.startsWith(prefix)));

  if (!isLandingPage) return null;

  return (
    <div className="chat-widget-container">
      {isOpen && (
        <div className="chat-window shadow-xl">
          <ChatBot isWidget={true} onClose={() => setIsOpen(false)} />
        </div>
      )}

      <button 
        className={`chat-trigger ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Chat"
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-in fade-in zoom-in duration-300">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-in fade-in zoom-in duration-300">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>
    </div>
  );
};

export default ChatWidget;
