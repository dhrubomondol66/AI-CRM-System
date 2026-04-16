import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Phone, PhoneOff, Volume2, X } from 'lucide-react';

const WS_URL = (import.meta?.env?.VITE_API_BASE_URL || 'https://reservation-api-kuzr.onrender.com')
  .replace('https://', 'wss://')
  .replace('http://', 'ws://');

export default function VoiceCallModal({ businessSlug, serviceName, onClose, onHandoffToChat }) {
  const [connected, setConnected] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [options, setOptions] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [connecting, setConnecting] = useState(false);

  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.name.includes('Samantha')) ||
      voices.find((v) => v.name.includes('Google US')) ||
      voices.find((v) => v.name.includes('Zira')) ||
      voices.find((v) => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const startCall = useCallback(() => {
    if (!businessSlug || !serviceName) return;

    setConnecting(true);
    const ws = new WebSocket(`${WS_URL}/api/v1/voice/ws/voice-test`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setConnecting(false);
      setCallEnded(false);
      setMessages([]);
      setOptions([]);
      setElapsed(0);

      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

      // Send start with business_slug + service_name (backend resolves to UUIDs)
      ws.send(JSON.stringify({
        action: 'start',
        business_slug: businessSlug,
        service_name: serviceName,
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'error') {
        setMessages((prev) => [...prev, { role: 'system', text: data.text }]);
        return;
      }

      if (data.type === 'speak') {
        setMessages((prev) => [...prev, { role: 'ai', text: data.text }]);
        setOptions(data.options || []);
        speak(data.text);
      }

      if (data.type === 'ended') {
        setMessages((prev) => [...prev, { role: 'ai', text: data.text }]);
        speak(data.text);
        setOptions([]);
        setCallEnded(true);
        setConnected(false);
        clearInterval(timerRef.current);
      }

      if (data.type === 'handoff_to_chat') {
        setMessages((prev) => [...prev, { role: 'ai', text: data.text }]);
        speak(data.text);
        setOptions([]);
        setCallEnded(true);
        setConnected(false);
        clearInterval(timerRef.current);

        // After speech finishes, trigger chat handoff
        setTimeout(() => {
          if (onHandoffToChat) {
            onHandoffToChat({
              conversationId: data.conversation_id,
              businessSlug: data.business_slug,
              serviceId: data.service_id,
            });
          }
        }, 3000);
      }
    };

    ws.onerror = () => {
      setMessages((prev) => [...prev, { role: 'system', text: 'Connection error. Is the server running?' }]);
      setConnected(false);
      setConnecting(false);
    };

    ws.onclose = () => {
      setConnected(false);
      setConnecting(false);
      clearInterval(timerRef.current);
    };
  }, [businessSlug, serviceName, speak, onHandoffToChat]);

  const pressDigit = (digit) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setMessages((prev) => [...prev, { role: 'user', text: `Selected: ${options.find(o => o.digit === digit)?.label || digit}` }]);
    wsRef.current.send(JSON.stringify({ action: 'press', digit }));
  };

  const endCall = () => {
    if (wsRef.current) wsRef.current.close();
    window.speechSynthesis?.cancel();
    clearInterval(timerRef.current);
    setConnected(false);
    setCallEnded(true);
  };

  const formatTime = (s) => {
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div style={styles.modal}>

        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Phone size={18} color={connected ? '#4ade80' : '#9ca3af'} />
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f4f4f5' }}>
              {serviceName || 'Voice Call'}
            </span>
          </div>
          {connected && (
            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#6b7280' }}>
              {formatTime(elapsed)}
            </span>
          )}
          <button onClick={onClose} style={styles.closeBtn}><X size={18} /></button>
        </div>

        {/* Status */}
        <div style={styles.statusBar}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? '#4ade80' : callEnded ? '#ef4444' : '#f59e0b',
            animation: connected ? 'pulse 1.5s infinite' : 'none',
          }} />
          <span style={{ fontSize: '0.8rem', color: connected ? '#4ade80' : callEnded ? '#ef4444' : '#f59e0b' }}>
            {connecting ? 'Connecting...' : connected ? 'Connected' : callEnded ? 'Call Ended' : 'Ready'}
          </span>
          {speaking && (
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: '#4ade80', fontSize: '0.75rem' }}>
              <Volume2 size={14} /> Speaking...
            </span>
          )}
        </div>

        {/* Messages */}
        <div style={styles.messages}>
          {!connected && !callEnded && messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#6b7280' }}>
              <Phone size={32} color="#4ade80" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.9rem', marginBottom: 4 }}>Ready to call about <strong style={{ color: '#e4e4e7' }}>{serviceName}</strong></p>
              <p style={{ fontSize: '0.8rem' }}>You'll hear service info and can book via chat</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 12, animation: 'fadeIn 0.3s ease' }}>
              <div style={{
                fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                color: msg.role === 'ai' ? '#4ade80' : msg.role === 'user' ? '#60a5fa' : '#f59e0b',
                marginBottom: 3,
              }}>
                {msg.role === 'ai' ? '🤖 Assistant' : msg.role === 'user' ? '👤 You' : '⚡ System'}
              </div>
              <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#d4d4d8' }}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          {/* Not started */}
          {!connected && !callEnded && (
            <button onClick={startCall} disabled={connecting} style={{
              ...styles.startBtn,
              opacity: connecting ? 0.6 : 1,
            }}>
              <Phone size={18} />
              {connecting ? 'Connecting...' : 'Start Call'}
            </button>
          )}

          {/* Active - show option buttons */}
          {connected && options.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {options.map((opt) => (
                <button
                  key={opt.digit}
                  onClick={() => pressDigit(opt.digit)}
                  style={{
                    ...styles.optionBtn,
                    ...(opt.digit === '0' ? { borderColor: '#2563eb', color: '#93c5fd' } : {}),
                    ...(opt.digit === '9' ? { borderColor: '#f59e0b', color: '#fcd34d' } : {}),
                    ...(opt.digit === '8' ? { borderColor: '#ef4444', color: '#fca5a5' } : {}),
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'monospace' }}>{opt.digit}</span>
                  <span style={{ fontSize: '0.7rem' }}>{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Active - end call button */}
          {connected && (
            <button onClick={endCall} style={styles.endBtn}>
              <PhoneOff size={16} /> End Call
            </button>
          )}

          {/* Ended */}
          {callEnded && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#6b7280', fontSize: '0.8rem', marginBottom: 10 }}>Call ended</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button onClick={() => {
                  setCallEnded(false);
                  setMessages([]);
                  setOptions([]);
                  setElapsed(0);
                }} style={{ ...styles.startBtn, fontSize: '0.85rem', padding: '10px 20px' }}>
                  <Phone size={16} /> New Call
                </button>
                <button onClick={onClose} style={{
                  ...styles.endBtn, width: 'auto', padding: '10px 20px', marginTop: 0,
                }}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)',
  },
  modal: {
    width: '400px', maxHeight: '85vh', background: '#18181b', borderRadius: '16px',
    border: '1px solid #27272a', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', background: '#1f1f23', borderBottom: '1px solid #27272a',
  },
  closeBtn: {
    background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer',
    padding: 4, borderRadius: 4,
  },
  statusBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 16px', borderBottom: '1px solid #27272a',
  },
  messages: {
    flex: 1, padding: '16px', overflowY: 'auto', maxHeight: '320px', minHeight: '100px',
  },
  actions: {
    padding: '12px 16px 16px', borderTop: '1px solid #27272a',
  },
  startBtn: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: '14px', background: '#16a34a', color: 'white', border: 'none',
    borderRadius: '12px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
    fontFamily: 'inherit',
  },
  optionBtn: {
    flex: '1 1 calc(50% - 4px)', padding: '10px 6px', background: '#27272a',
    border: '1px solid #3f3f46', borderRadius: '10px', color: '#e4e4e7',
    cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 2, fontFamily: 'inherit',
  },
  endBtn: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: '10px', background: '#7f1d1d', border: '1px solid #991b1b',
    borderRadius: '10px', color: '#fca5a5', fontWeight: 600, cursor: 'pointer',
    marginTop: 10, fontFamily: 'inherit',
  },
};