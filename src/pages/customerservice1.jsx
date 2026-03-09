import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone, PhoneOff, Users, CheckCircle, Smile, Paperclip,
  DollarSign, MapPin, FileText, Mic, MicOff, Loader,
} from 'lucide-react';
import '../assets/styles/customer1.css';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import market from '../assets/market.png';
import sending from '../assets/sending.png';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Device } from '@twilio/voice-sdk';
import VoiceCallModal from '../components/VoiceCallModal';

// ── Axios instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta?.env?.VITE_API_BASE_URL || 'https://reservation-xynh.onrender.com',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token') || localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Unique session ID per browser tab ──────────────────────────────────────
const getSessionId = () => {
  let sid = sessionStorage.getItem('chat_session_id');
  if (!sid) {
    sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('chat_session_id', sid);
  }
  return sid;
};

// ── Normalise service shape from any backend response ──────────────────────
const normalizeService = (item, i) => {
  const rawPrice = item.price ?? item.base_price;
  return {
    id: item.id ?? item._id ?? i,
    business_id: item.business_id ?? item.business?.id ?? item.business?._id ?? null,
    title: item.title ?? item.name ?? item.service_name ?? 'Untitled Service',
    description: item.description ?? item.desc ?? '',
    price: rawPrice != null
      ? (typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice) || 0)
      : 0,
    priceDisplay: rawPrice != null
      ? `$${parseFloat(rawPrice).toFixed(2)}`
      : 'Free',
    currency: item.currency ?? 'USD',
    duration_minutes: item.duration_minutes ?? 60,
    business_name: item.business_name ?? item.business?.name ?? null,
    business_type: item.business_type ?? item.service_type_name
      ?? item.business?.service_type_name ?? null,
    logo_url: item.logo_url ?? item.logo ?? item.business?.logo_url ?? null,
  };
};

// ── Call state enum ────────────────────────────────────────────────────────
const CALL_STATE = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  RINGING: 'ringing',
  IN_CALL: 'in-call',
  ENDED: 'ended',
};

// ── Format mm:ss ────────────────────────────────────────────────────────────
const formatDuration = (s) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

// ── Payment Options Card ───────────────────────────────────────────────────
function PaymentOptionsCard({ bookingId, paymentUrl, onPayLater }) {
  return (
    <div style={{ padding: '1rem', minWidth: '260px', maxWidth: '320px' }}>
      <p style={{ fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
        💳 How would you like to pay?
      </p>
      <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '1rem' }}>
        Booking ID: <strong>{bookingId}</strong>
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <a
          href={paymentUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', background: '#2563eb', color: 'white',
            textAlign: 'center', padding: '0.6rem 1rem', borderRadius: '8px',
            fontWeight: '600', textDecoration: 'none', fontSize: '0.875rem',
          }}
        >
          💳 Pay Now
        </a>
        <button
          onClick={() => onPayLater(bookingId)}
          style={{
            display: 'block', width: '100%', background: 'white', color: '#2563eb',
            border: '1.5px solid #2563eb', padding: '0.6rem 1rem', borderRadius: '8px',
            fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem',
          }}
        >
          🕐 Pay Later
        </button>
      </div>
    </div>
  );
}

// ── useTwilioVoice hook ────────────────────────────────────────────────────
function useTwilioVoice({ business_slug, selectedService, sessionId }) {
  const deviceRef = useRef(null);
  const callRef = useRef(null);
  const timerRef = useRef(null);

  const [callState, setCallState] = useState(CALL_STATE.IDLE);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    deviceRef.current?.destroy();
  }, []);

  const startTimer = () => {
    setCallDuration(0);
    timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
  };
  const stopTimer = () => { clearInterval(timerRef.current); timerRef.current = null; };

  const initDevice = useCallback(async () => {
    deviceRef.current?.destroy();
    deviceRef.current = null;

    const res = await api.post('/api/v1/voice/twilio/', {
      business_slug,
      service_name: selectedService?.title,
      user_session_id: sessionId,
      action: 'token',
    });

    const token = res.data?.token ?? res.data?.data?.token;
    if (!token) throw new Error('No Twilio access token returned from server.');

    const device = new Device(token, {
      logLevel: 1,
      codecPreferences: ['opus', 'pcmu'],
      enableRingingState: true,
    });

    device.on('error', (twilioError) => {
      setError(twilioError.message ?? 'Twilio device error');
      setCallState(CALL_STATE.IDLE);
      stopTimer();
    });

    device.on('tokenWillExpire', async () => {
      try {
        const r = await api.post('/api/v1/voice/twilio/', {
          business_slug, service_name: selectedService?.title,
          user_session_id: sessionId, action: 'token',
        });
        const newToken = r.data?.token ?? r.data?.data?.token;
        if (newToken) device.updateToken(newToken);
      } catch (_) { /* best effort */ }
    });

    await device.register();
    deviceRef.current = device;
    return device;
  }, [business_slug, selectedService, sessionId]);

  const attachCallHandlers = (call) => {
    callRef.current = call;
    call.on('ringing', () => setCallState(CALL_STATE.RINGING));
    call.on('accept', () => { setCallState(CALL_STATE.IN_CALL); setIsMuted(false); startTimer(); });
    call.on('disconnect', () => {
      setCallState(CALL_STATE.ENDED);
      stopTimer();
      callRef.current = null;
      setTimeout(() => setCallState(CALL_STATE.IDLE), 2000);
    });
    call.on('cancel', () => { setCallState(CALL_STATE.IDLE); stopTimer(); callRef.current = null; });
    call.on('error', (err) => {
      setError(err.message ?? 'Call error');
      setCallState(CALL_STATE.IDLE);
      stopTimer();
      callRef.current = null;
    });
  };

  const startCall = useCallback(async () => {
    if (callState !== CALL_STATE.IDLE) return;
    setError(null);
    setCallState(CALL_STATE.CONNECTING);
    try {
      const device = await initDevice();
      const call = await device.connect({
        params: {
          business_slug: business_slug ?? '',
          service_name: selectedService?.title ?? '',
          user_session_id: sessionId ?? '',
        },
      });
      attachCallHandlers(call);
    } catch (err) {
      setError(err.message ?? 'Could not start call');
      setCallState(CALL_STATE.IDLE);
    }
  }, [callState, initDevice, business_slug, selectedService, sessionId]);

  const endCall = useCallback(() => {
    if (callRef.current) {
      callRef.current.disconnect();
    } else {
      deviceRef.current?.disconnectAll();
      setCallState(CALL_STATE.IDLE);
    }
    stopTimer();
  }, []);

  const toggleMute = useCallback(() => {
    if (!callRef.current) return;
    const next = !isMuted;
    callRef.current.mute(next);
    setIsMuted(next);
  }, [isMuted]);

  return { callState, startCall, endCall, isMuted, toggleMute, callDuration, error };
}

// ── Star SVG helper ────────────────────────────────────────────────────────
function StarIcon({ filled, size = 10 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? '#f59e0b' : 'none'}
      stroke="#f59e0b"
      strokeWidth="2"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

// ── CallButton component ───────────────────────────────────────────────────
function CallButton({ business_slug, selectedService, sessionId, setShowVoiceCall }) {
  const { callState, startCall, endCall, isMuted, toggleMute, callDuration, error } =
    useTwilioVoice({ business_slug, selectedService, sessionId });

  const isActive = callState === CALL_STATE.IN_CALL;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      {error && (
        <span style={{ fontSize: '0.68rem', color: '#ef4444', maxWidth: '200px', textAlign: 'right', lineHeight: 1.3 }}>
          ⚠ {error}
        </span>
      )}
      {isActive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontSize: '0.73rem', fontWeight: '700', color: '#16a34a',
            background: '#f0fdf4', padding: '2px 10px', borderRadius: '999px',
            border: '1px solid #86efac', letterSpacing: '0.03em',
          }}>
            🔴 {formatDuration(callDuration)}
          </span>
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute mic'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '34px', height: '34px', borderRadius: '50%', border: 'none',
              cursor: 'pointer',
              background: isMuted ? '#fee2e2' : '#f1f5f9',
              color: isMuted ? '#dc2626' : '#475569',
              transition: 'all 0.15s',
            }}
          >
            {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
        </div>
      )}
      <button
        className="start-call-btn"
        onClick={() => {
          if (!selectedService) { alert('Select a service first'); return; }
          setShowVoiceCall(true);
        }}
      >
        <Phone className="phone-icon" /> Start Call
      </button>
    </div>
  );
}

// ── Service Image Carousel ────────────────────────────────────────────────
function ServiceImageCarousel({ images }) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  const [hovered, setHovered] = useState(false);
  const total = images.length;

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  const getSrc = (img) =>
    img.image_url || img.url || img.file || img.photo || (typeof img === 'string' ? img : null);

  const getAlt = (img, i) => img.caption || img.alt || `Service image ${i + 1}`;

  if (total === 0) return null;

  return (
    <>
      {/* Lightbox overlay */}
      {lightbox !== null && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={getSrc(images[lightbox])}
            alt={getAlt(images[lightbox], lightbox)}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox((l) => (l - 1 + total) % total); }}
            style={{
              position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', color: '#fff',
              width: '44px', height: '44px', borderRadius: '50%', fontSize: '2.4rem',
              cursor: 'pointer', backdropFilter: 'blur(4px)', fontWeight: '200',
            }}
          >‹</button>
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox((l) => (l + 1) % total); }}
            style={{
              position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', color: '#fff',
              width: '44px', height: '44px', borderRadius: '50%', fontSize: '2.4rem',
              cursor: 'pointer', backdropFilter: 'blur(4px)', fontWeight: '200',
            }}
          >›</button>
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: '16px', right: '20px',
              background: 'transparent', border: 'none', color: '#fff',
              width: '36px', height: '36px', borderRadius: '25%', fontSize: '1.1rem',
              cursor: 'pointer',
            }}
          >✕</button>
        </div>
      )}

      {/* Carousel */}
      <div
        style={{ position: 'relative', width: '100%', marginTop: '0.5rem' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Main image */}
        <div
          style={{
            width: '100%', height: '160px', borderRadius: '12px', overflow: 'hidden',
            position: 'relative', background: '#f1f5f9', cursor: 'zoom-in',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
          onClick={() => setLightbox(current)}
        >
          <img
            key={current}
            src={getSrc(images[current])}
            alt={getAlt(images[current], current)}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              animation: 'carouselFadeIn 0.35s ease',
            }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          {/* Counter badge */}
          <div style={{
            position: 'absolute', bottom: '8px', right: '10px',
            background: 'rgba(0,0,0,0.55)', color: '#fff',
            fontSize: '0.65rem', fontWeight: '600', padding: '2px 8px',
            borderRadius: '999px', letterSpacing: '0.04em',
          }}>
            {current + 1} / {total}
          </div>
          {/* Zoom hint */}
          <div style={{
            position: 'absolute', top: '8px', right: '10px',
            background: 'rgba(0,0,0,0.45)', color: '#fff',
            fontSize: '0.6rem', padding: '2px 7px', borderRadius: '999px',
          }}>🔍 tap to expand</div>
        </div>

        {/* Prev / Next arrows — centered on the image */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              style={{
                position: 'absolute', left: '-12px', top: '35%', transform: 'translateY(-50%)',
                width: '28px', height: '28px', borderRadius: '50%',
                background: '#fff', border: '1px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                cursor: 'pointer', fontSize: '1rem', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#334155',
                transition: 'opacity 0.2s ease, background 0.15s, color 0.15s',
                opacity: hovered ? 1 : 0,
                pointerEvents: hovered ? 'auto' : 'none',
                zIndex: 2,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#334155'; }}
            >‹</button>
            <button
              onClick={next}
              style={{
                position: 'absolute', right: '-12px', top: '35%', transform: 'translateY(-50%)',
                width: '28px', height: '28px', borderRadius: '50%',
                background: '#fff', border: '1px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                cursor: 'pointer', fontSize: '1rem', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#334155',
                transition: 'opacity 0.2s ease, background 0.15s, color 0.15s',
                opacity: hovered ? 1 : 0,
                pointerEvents: hovered ? 'auto' : 'none',
                zIndex: 2,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#334155'; }}
            >›</button>
          </>
        )}

        {/* Dot indicators */}
        {total > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                style={{
                  width: i === current ? '20px' : '7px',
                  height: '7px',
                  borderRadius: '999px',
                  border: 'none',
                  background: i === current ? '#2563eb' : '#cbd5e1',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.25s ease',
                }}
              />
            ))}
          </div>
        )}

        {/* Thumbnail strip */}
        {total > 1 && (
          <div style={{
            display: 'flex', gap: '6px', marginTop: '10px',
            overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'thin',
          }}>
            {images.map((img, i) => (
              <div
                key={i}
                onClick={() => setCurrent(i)}
                style={{
                  flexShrink: 0, width: '44px', height: '44px',
                  borderRadius: '7px', overflow: 'hidden', cursor: 'pointer',
                  border: `2px solid ${i === current ? '#2563eb' : 'transparent'}`,
                  opacity: i === current ? 1 : 0.55,
                  transition: 'all 0.2s',
                }}
              >
                <img
                  src={getSrc(img)}
                  alt={getAlt(img, i)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keyframe animation injected once */}
      <style>{`
        @keyframes carouselFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}

// ── Main page component ────────────────────────────────────────────────────
export default function BookingAssistant() {
  const { business_slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const bidFromQuery = new URLSearchParams(location.search).get('bid');
  const sessionId = useRef(getSessionId()).current;

  // ── State ────────────────────────────────────────────────────────────────
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedTime, setSelectedTime] = useState('7:00 PM');
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(30);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [paymentLink, setPaymentLink] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [detectedBookingId, setDetectedBookingId] = useState(null);
  const [showVoiceCall, setShowVoiceCall] = useState(false);

  // ── Reviews state ────────────────────────────────────────────────────────
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // ── Images state ─────────────────────────────────────────────────────────
  const [serviceImages, setServiceImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(false);

  const chatEndRef = useRef(null);

  const business = services.length > 0
    ? {
      business_slug: services[0].business_slug || services[0].slug || business_slug,
      name: services[0].business_name,
      service_type_name: services[0].business_type,
      logo_url: services[0].logo_url,
    }
    : null;

  // ── Auto-scroll chat ─────────────────────────────────────────────────────
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // ── Fetch services ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!business_slug) return;
    const fetchServices = async () => {
      setServicesLoading(true);
      setError(null);
      try {
        const res = await api.get(`/api/v1/public/${business_slug}/services/`, {
          params: { popular_only: false },
        });
        const raw = Array.isArray(res.data)
          ? res.data
          : res.data?.data ?? res.data?.services ?? res.data?.results ?? [];
        const normalized = raw.map(normalizeService);
        setServices(normalized);
        if (bidFromQuery) {
          const match = normalized.find((s) => String(s.id) === String(bidFromQuery));
          if (match) { setSelectedService(match); setProgress(65); }
        }
      } catch (err) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message ?? err?.response?.data?.error;
        setError(!err.response
          ? 'Network error — cannot reach the server.'
          : (msg ?? `Error ${status} loading services.`));
      } finally {
        setServicesLoading(false);
      }
    };
    fetchServices();
  }, [business_slug]);

  // ── Fetch reviews when service selected ─────────────────────────────────
  useEffect(() => {
    if (!selectedService || !business_slug) return;

    // Reset on every service switch
    setReviews([]);
    setAvgRating(0);
    setTotalReviews(0);

    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        // Try service-specific reviews first
        const res = await api.get(
          `/api/v1/public/reviews/service/${selectedService.id}`,
          { params: { limit: 50, offset: 0 } }
        );
        setReviews(res.data?.reviews ?? []);
        setAvgRating(res.data?.average_rating ?? 0);
        setTotalReviews(res.data?.total_reviews ?? 0);
      } catch {
        try {
          // Fall back to business-level reviews
          const res = await api.get(
            `/api/v1/public/reviews/business/${business_slug}`,
            { params: { limit: 50, offset: 0 } }
          );
          setReviews(res.data?.reviews ?? []);
          setAvgRating(res.data?.average_rating ?? 0);
          setTotalReviews(res.data?.total_reviews ?? 0);
        } catch {
          setReviews([]);
          setAvgRating(0);
          setTotalReviews(0);
        }
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [selectedService, business_slug]);

  // ── Fetch service images when service selected ──────────────────────────
  useEffect(() => {
    if (!selectedService) return;

    setServiceImages([]);

    const extractImages = (data) => {
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.images)) return data.images;
      if (Array.isArray(data?.results)) return data.results;
      if (data && typeof data === 'object') {
        const key = Object.keys(data).find(k => Array.isArray(data[k]));
        if (key) return data[key];
      }
      return [];
    };

    const fetchImages = async () => {
      setImagesLoading(true);
      try {
        // Try service-specific endpoint first
        const res = await api.get(
          `/api/v1/public/${business_slug}/services/${selectedService.id}/images/`
        );
        const imgData = extractImages(res.data);
        setServiceImages(imgData);
      } catch (err) {
        // Fallback: try business-level images endpoint
        try {
          const res2 = await api.get(
            `/api/v1/public/services/${selectedService.id}/images/`
          );
          const imgData = extractImages(res2.data);
          setServiceImages(imgData);
        } catch {
          console.error('Could not fetch service images:', err);
          setServiceImages([]);
        }
      } finally {
        setImagesLoading(false);
      }
    };

    fetchImages();
  }, [selectedService]);

  // ── Start conversation when a service is selected ────────────────────────
  useEffect(() => {
    if (!selectedService || !business_slug) return;
    const startConversation = async () => {
      setChatMessages([]);
      setConversationStarted(false);
      setChatLoading(true);
      setDetectedBookingId(null);
      setPaymentLink(null);
      try {
        const res = await api.post('/api/v1/chat/conversations', {
          business_slug,
          service_name: selectedService.title,
          user_session_id: sessionId,
          channel: 'CHAT',
        });
        const convId = res.data?.id ?? res.data?.conversation_id ?? res.data?.data?.id;
        if (convId) setConversationId(convId);

        const aiReply =
          res.data?.first_message ??
          res.data?.message ??
          res.data?.reply ??
          res.data?.data?.message ??
          `Hello! I see you're interested in "${selectedService.title}". I can help you book this right now. What time would work best for you?`;

        setChatMessages([{ role: 'assistant', text: aiReply }]);
        setConversationStarted(true);
      } catch {
        setChatMessages([{
          role: 'assistant',
          text: `Hello! I see you're interested in "${selectedService.title}". I can help you book this right now. What time would work best for you?`,
        }]);
        setConversationStarted(true);
      } finally {
        setChatLoading(false);
      }
    };
    startConversation();
  }, [selectedService]);

  // ── Extract booking ID from AI reply ─────────────────────────────────────
  const extractBookingId = (text) => {
    const patterns = [
      /booking\s*(?:id|ID|Id)[:\s#]*([A-Za-z0-9_-]{4,})/i,
      /\b(BK[-_]?[A-Z0-9]{4,})\b/i,
      /\b([A-Z]{2,4}[-_]?[0-9]{4,})\b/,
    ];
    for (const p of patterns) { const m = text.match(p); if (m) return m[1]; }
    return null;
  };

  // ── Trigger payment card ──────────────────────────────────────────────────
  const triggerPaymentOptions = async (bookingId) => {
    if (!bookingId || paymentLoading) return;
    setPaymentLoading(true);
    try {
      const response = await api.post('/api/v1/payments/create-intent', { booking_id: bookingId });
      const paymentUrl = response.data?.payment_url || response.data?.url;
      if (paymentUrl) {
        setPaymentLink(paymentUrl);
        setChatMessages((prev) => [...prev, { role: 'assistant', type: 'payment_options', bookingId, paymentUrl }]);
      } else {
        setChatMessages((prev) => [...prev, { role: 'assistant', text: "Booking confirmed! However, I couldn't generate a payment link. Please contact support." }]);
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', text: 'There was an error setting up payment. Please try again.' }]);
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── Pay Later ─────────────────────────────────────────────────────────────
  const handlePayLater = async (bookingId) => {
    if (!bookingId) return;
    try {
      await api.post('/api/v1/payments/pay-later', { booking_id: bookingId });
      setChatMessages((prev) => [...prev, { role: 'assistant', text: '✅ Got it! Your booking is reserved. You can pay when you arrive.' }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', text: 'Something went wrong with pay-later option. Please contact us directly.' }]);
    }
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed || chatLoading || !selectedService) return;
    setChatMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setMessage('');
    setChatLoading(true);
    try {
      const endpoint = conversationId
        ? `/api/v1/chat/conversations/${conversationId}/messages`
        : '/api/v1/chat/conversations';
      const payload = conversationId
        ? { message: trimmed }
        : { business_slug, service_name: selectedService.title, user_session_id: sessionId, channel: 'CHAT', message: trimmed };

      const res = await api.post(endpoint, payload);
      const aiReply =
        res.data?.message ?? res.data?.reply ?? res.data?.data?.message ?? "I'm here to help. Could you please clarify?";

      setChatMessages((prev) => [...prev, { role: 'assistant', text: aiReply }]);

      if (!detectedBookingId) {
        const foundId = extractBookingId(aiReply);
        if (foundId) { setDetectedBookingId(foundId); triggerPaymentOptions(foundId); }
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', text: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const handleServiceSelect = (service) => { setSelectedService(service); setProgress(65); };

  const handleConfirmBooking = () => {
    if (!selectedService) { alert('Please select a service first.'); return; }
    navigate('/paymentsystem', {
      state: {
        serviceId: selectedService.id,
        serviceName: selectedService.title,
        price: selectedService.price,
        selectedTime,
        selectedDate: 'Saturday, Oct 28th',
        businessName: business?.name ?? business_slug,
      },
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="booking-container">
      <Header icon="check" showThemeToggle={true} />

      <main className="maincontent">
        <div className="contentgrid" style={{ maxWidth: '80%', minWidth: '80%' }}>

          {/* ── Left Sidebar ── */}
          <aside className="sidebar">
            <div className="booking-card">
              <div className="card-header">
                <div className="cart-icon">
                  {business?.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt="Business Logo"
                      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }}
                      onError={(e) => { e.target.src = market; }}
                    />
                  ) : (
                    <img src={market} alt="market" />
                  )}
                </div>
                <div>
                  <h2 className="card-title" style={{ fontSize: '1.25rem', textAlign: 'right' }}>
                    {servicesLoading ? 'Loading...' : (business?.name || 'Booking Inquiry')}
                  </h2>
                  <p className="card-subtitle" style={{ textAlign: 'right' }}>
                    {business?.service_type_name || business?.service_type || 'Direct Reservation'}
                  </p>
                </div>
              </div>

              {/* ── Booking Details ── */}
              <div className="booking-details">

                {/* Header row: title + avg star rating badge */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: '0.75rem',
                }}>
                  <div className="section-title-small" style={{ fontWeight: '600', color: '#1e293b' }}>
                    AVAILABLE SERVICES
                  </div>

                  {/* Average Rating Badge — only when avgRating > 0 and service selected */}
                  {avgRating > 0 && selectedService && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: '#fffbeb', border: '1px solid #fde68a',
                      borderRadius: '20px', padding: '3px 10px', flexShrink: 0,
                    }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <StarIcon key={s} filled={avgRating >= s} size={11} />
                      ))}
                      <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#92400e', marginLeft: '2px' }}>
                        {Number(avgRating).toFixed(1)}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: '#a16207' }}>
                        ({totalReviews})
                      </span>
                    </div>
                  )}
                </div>

                {error && <p style={{ fontSize: '0.875rem', color: '#ef4444' }}>{error}</p>}

                {/* Services list */}
                <div
                  className="services-list-mini"
                  style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem', color: 'black', backgroundColor: 'white' }}
                >
                  {servicesLoading ? (
                    <p style={{ fontSize: '0.875rem' }}>Loading services...</p>
                  ) : services.length === 0 && !error ? (
                    <p style={{ fontSize: '0.875rem' }}>No services available.</p>
                  ) : (
                    services.map((s) => (
                      <div
                        key={s.id}
                        className={`service-item-mini ${selectedService?.id === s.id ? 'active' : ''}`}
                        onClick={() => handleServiceSelect(s)}
                        style={{
                          padding: '0.75rem', borderRadius: '8px', marginBottom: '0.5rem',
                          border: `1px solid ${selectedService?.id === s.id ? '#2563eb' : '#e2e8f0'}`,
                          cursor: 'pointer',
                          backgroundColor: selectedService?.id === s.id ? '#eff6ff' : 'white',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        {s.logo_url && (
                          <div style={{ flexShrink: 0 }}>
                            <img
                              src={s.logo_url}
                              alt={s.title}
                              style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: selectedService?.id === s.id ? '#1e40af' : '#1e293b' }}>{s.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.priceDisplay}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Selected service details */}
                {selectedService && (
                  <>
                    <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                    <div className="detail-row">
                      <div className="detail-label"><Users className="detail-icon" /><span>Selected Service</span></div>
                      <span className="detail-value">{selectedService.title}</span>
                    </div>
                    {selectedService.priceDisplay && (
                      <div className="detail-row">
                        <div className="detail-label"><DollarSign className="detail-icon" /><span>Price</span></div>
                        <span className="detail-value">{selectedService.priceDisplay}</span>
                      </div>
                    )}
                    {selectedService.location && (
                      <div className="detail-row">
                        <div className="detail-label"><MapPin className="detail-icon" /><span>Location</span></div>
                        <span className="detail-value">{selectedService.location}</span>
                      </div>
                    )}
                    {selectedService.description && (
                      <div className="detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div className="detail-label"><FileText className="detail-icon" /><span>Description</span></div>
                        <span className="detail-value" style={{ fontSize: '0.875rem', lineHeight: '1.4', marginTop: '0.25rem' }}>
                          {selectedService.description}
                        </span>
                      </div>
                    )}

                    {/* ── Images Carousel Section ── */}
                    {(imagesLoading || serviceImages.length > 0) && (
                      <div style={{ marginTop: '1.5rem', paddingLeft: '14px', paddingRight: '14px' }}>
                        <div style={{
                          fontWeight: '600', fontSize: '0.7rem', color: '#64748b',
                          letterSpacing: '0.08em', marginBottom: '0.75rem',
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                          <span>📸</span> SERVICE GALLERY
                        </div>
                        {imagesLoading ? (
                          <div style={{
                            height: '160px', borderRadius: '12px', background: '#f1f5f9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                              Loading images...
                            </p>
                          </div>
                        ) : (
                          <ServiceImageCarousel images={serviceImages} />
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* ── Reviews Section ── */}
                {selectedService && (
                  <>
                    <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

                    <div style={{
                      fontWeight: '600', fontSize: '0.75rem', color: '#1e293b',
                      letterSpacing: '0.05em', marginBottom: '0.6rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span>CUSTOMER REVIEWS</span>
                      {totalReviews > 0 && (
                        <span style={{ fontSize: '0.65rem', fontWeight: '500', color: '#64748b' }}>
                          {totalReviews} review{totalReviews !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {reviewsLoading ? (
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        Loading reviews...
                      </p>
                    ) : reviews.length === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        No reviews yet. Be the first!
                      </p>
                    ) : (
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: '0.6rem',
                        maxHeight: '260px', overflowY: 'auto', paddingRight: '2px',
                      }}>
                        {reviews.slice(-3).reverse().map((review, i) => {
                          const name =
                            review.reviewer_name ??
                            review.user_name ??
                            review.username ??
                            review.full_name ??
                            review.customer_name ??
                            review.author_name ??
                            review.author ??
                            review.name ??
                            (review.user?.full_name) ??
                            (review.user?.name) ??
                            (review.user?.username) ??
                            (review.user?.first_name
                              ? `${review.user.first_name} ${review.user.last_name ?? ''}`.trim()
                              : null) ??
                            (review.customer?.full_name) ??
                            (review.customer?.name) ??
                            (review.first_name
                              ? `${review.first_name} ${review.last_name ?? ''}`.trim()
                              : null) ??
                            review.email?.split('@')[0] ??
                            'Guest';
                          const initial = name[0].toUpperCase();
                          const hue = (name.charCodeAt(0) * 37) % 360;

                          return (
                            <div key={review.id ?? i} style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding: '0.65rem 0.75rem',
                            }}>
                              {/* Top row: avatar + name + stars */}
                              <div style={{
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between', marginBottom: '6px',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                  {/* Coloured avatar initial */}
                                  <div style={{
                                    width: '26px', height: '26px', borderRadius: '50%',
                                    background: `hsl(${hue}, 55%, 60%)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.65rem', fontWeight: '700', color: 'white', flexShrink: 0,
                                  }}>
                                    {initial}
                                  </div>
                                  <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#1e293b' }}>
                                    {name}
                                  </span>
                                </div>

                                {/* Star rating */}
                                <div style={{ display: 'flex', gap: '1px' }}>
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <StarIcon key={s} filled={(review.rating ?? 0) >= s} size={10} />
                                  ))}
                                </div>
                              </div>

                              {/* Comment */}
                              {review.comment && (
                                <p style={{
                                  fontSize: '0.75rem', color: '#475569',
                                  lineHeight: '1.45', margin: '0 0 4px 0',
                                }}>
                                  "{review.comment}"
                                </p>
                              )}

                              {/* Date */}
                              {(review.created_at ?? review.date) && (
                                <p style={{ fontSize: '0.65rem', color: '#94a3b8', margin: 0 }}>
                                  {new Date(review.created_at ?? review.date).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: 'numeric',
                                  })}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

              </div>{/* end booking-details */}

              <div className="progress-section">
                <div className="progress-header">
                  <span className="progress-label">BOOKING PROGRESS</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <p className="progress-text">Almost there! Select your preferred time.</p>
              </div>
            </div>

            <div className="confirmation-card">
              <div className="confirmation-icon"><CheckCircle className="check-icon" /></div>
              <div>
                <h3 className="confirmation-title">Instant Confirmation</h3>
                <p className="confirmation-text">
                  Your booking will be confirmed immediately after you pick a time. No phone calls required.
                </p>
              </div>
            </div>
          </aside>

          {/* ── Right — Chat + Voice ── */}
          <section className="chat-section">
            <div className="chat-container">

              {/* Chat Header */}
              <div className="chat-header">
                <div className="assistant-info">
                  <div className="assistant-avatar"><div className="avatar-circle" /></div>
                  <div>
                    <h3 className="assistant-name">AI Booking Assistant</h3>
                    <p className="assistant-status">
                      <span className="status-indicator" />
                      Live &amp; Ready to help
                    </p>
                  </div>
                </div>

                <div title={!selectedService ? 'Select a service to enable voice call' : undefined}>
                  <CallButton
                    business_slug={business_slug}
                    selectedService={selectedService}
                    sessionId={sessionId}
                    setShowVoiceCall={setShowVoiceCall}
                    disabled={!selectedService}
                  />
                </div>
              </div>

              {/* Chat Messages */}
              <div className="chat-messages" style={{ maxWidth: '100%', minWidth: '100%' }}>

                {!selectedService && (
                  <div className="message-group">
                    <div className="message assistant-message">
                      <div className="message-avatar"><div className="avatar-small" /></div>
                      <div className="message-bubble">
                        Hello! I can help you book a service with {business?.name ?? 'us'}. Please select a service from the list to get started.
                      </div>
                    </div>
                  </div>
                )}

                {chatLoading && chatMessages.length === 0 && (
                  <div className="message-group">
                    <div className="message assistant-message">
                      <div className="message-avatar"><div className="avatar-small" /></div>
                      <div className="message-bubble" style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        Connecting to AI assistant...
                      </div>
                    </div>
                  </div>
                )}

                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`message-group ${msg.role === 'user' ? 'user-group' : ''}`}>
                    <div className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}>
                      {msg.role === 'assistant' && (
                        <div className="message-avatar"><div className="avatar-small" /></div>
                      )}
                      {msg.type === 'payment_options' ? (
                        <div className="message-bubble" style={{ padding: 0, overflow: 'hidden' }}>
                          <PaymentOptionsCard
                            bookingId={msg.bookingId}
                            paymentUrl={msg.paymentUrl}
                            onPayLater={handlePayLater}
                          />
                        </div>
                      ) : (
                        <div className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : ''}`}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {chatLoading && chatMessages.length > 0 && (
                  <div className="message-group">
                    <div className="message assistant-message">
                      <div className="message-avatar"><div className="avatar-small" /></div>
                      <div className="message-bubble" style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        Typing...
                      </div>
                    </div>
                  </div>
                )}

                {paymentLoading && (
                  <div className="message-group">
                    <div className="message assistant-message">
                      <div className="message-avatar"><div className="avatar-small" /></div>
                      <div className="message-bubble" style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        Generating payment options...
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="chat-input-container">
                <div className="chat-input-wrapper">
                  <button className="input-action-btn"><Smile className="input-icon" /></button>
                  <button className="input-action-btn"><Paperclip className="input-icon" /></button>
                  <input
                    type="text"
                    placeholder={selectedService ? 'Type a message...' : 'Select a service to start chatting...'}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="chat-input"
                    disabled={!selectedService || chatLoading}
                  />
                  <button
                    className="sending-btn"
                    onClick={handleSendMessage}
                    disabled={!selectedService || chatLoading || !message.trim()}
                  >
                    <img src={sending} alt="Send" />
                  </button>
                </div>
                <p className="powered-by">POWERED BY ADVANCED AI LOGIC</p>
              </div>

            </div>
          </section>

        </div>
      </main>

      {/* Voice Call Modal */}
      {showVoiceCall && selectedService && (
        <VoiceCallModal
          businessSlug={business_slug}
          serviceName={selectedService.title}
          onClose={() => setShowVoiceCall(false)}
          onHandoffToChat={({ conversationId }) => {
            setShowVoiceCall(false);
            if (conversationId) setConversationId(conversationId);
          }}
        />
      )}
    </div>
  );
}

export { };