import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, CheckCircle, AlertCircle, Star, ChevronDown, ChevronUp, Send } from 'lucide-react';
import axios from 'axios';
import logo from '../assets/logo.png.png';
import spoon1 from '../assets/spoon1.png';
import home from '../assets/home.png';
import heart from '../assets/heart.png';
import typhoon from '../assets/typhoon.png';
import cup from '../assets/cup.png';
import spoon from '../assets/spoon.png';
import gym from '../assets/gym.png';
import heartblue from '../assets/heartblue.png';
import '../assets/styles/style.css';
import rocket from '../assets/rocket.png';
import grow from '../assets/grow.png';
import typhoon1 from '../assets/typhoon1.png';
import tel from '../assets/tel.png';
import fb from '../assets/fb.png';
import lin from '../assets/lin.png';
import insta from '../assets/insta.png';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import LandingHeader from '../components/LandingHeader';
import Container from '../assets/Container.png';
import { usePlatform as usePlatformContact } from './platformContact';

// ── Axios instance ─────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta?.env?.VITE_API_BASE_URL || '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// ── Error formatter ────────────────────────────────────────────────────────
const formatBackendError = (err) => {
  const status = err?.response?.status;
  const detail = err?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const path = Array.isArray(d?.loc) ? d.loc.join('.') : '';
        const msg = d?.msg || JSON.stringify(d);
        return path ? `${path}: ${msg}` : msg;
      })
      .join('\n');
  }

  if (!err.response) return 'Network error — cannot reach the server.';

  // Custom message for review system if backend returns 400
  if (status === 400) {
    const backendMsg = err?.response?.data?.message || err?.response?.data?.error;
    if (backendMsg && (backendMsg.toLowerCase().includes('confirm') || backendMsg.toLowerCase().includes('pay'))) {
      return 'Your booking status is not confirmed yet!... please pay to confirm your booking';
    }
    return backendMsg || 'Please enter the correct inputs.';
  }

  if (status === 404) return 'Enter the correct ID';
  if (status === 422) return 'Please enter the correct inputs.';
  if (status >= 500) return 'Server error. Please try again later.';

  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    'Request failed. Please try again.'
  );
};

// ── Booking normalizer ─────────────────────────────────────────────────────
const normalizeBookings = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.bookings)) return data.bookings;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const EMPTY_FORM = {
  name: '', email: '', phone: '', subject: '', message: '',
};

// ── Star Rating Component ──────────────────────────────────────────────────
function StarRating({ value, onChange, disabled }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange(star)}
          onMouseEnter={() => !disabled && setHovered(star)}
          onMouseLeave={() => !disabled && setHovered(0)}
          style={{
            background: 'none',
            border: 'none',
            padding: '2px',
            cursor: disabled ? 'default' : 'pointer',
            transition: 'transform 0.15s ease',
            transform: hovered >= star ? 'scale(1.2)' : 'scale(1)',
          }}
          aria-label={`${star} star`}
        >
          <Star
            size={24}
            fill={(hovered || value) >= star ? '#f59e0b' : 'none'}
            color={(hovered || value) >= star ? '#f59e0b' : '#d1d5db'}
            strokeWidth={1.5}
          />
        </button>
      ))}
      {value > 0 && (
        <span style={{ marginLeft: '6px', fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][value]}
        </span>
      )}
    </div>
  );
}

// ── Inline Review Dropdown ─────────────────────────────────────────────────
function ReviewDropdown({ trackingId, bookingId, initialOpen = false }) {
  const [open, setOpen] = useState(initialOpen);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const targetId = trackingId || bookingId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!targetId) {
      setError('Booking ID or Tracking ID is missing.');
      return;
    }

    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/api/v1/public/reviews/bookings/${targetId}`, {
        rating,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(formatBackendError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', marginTop: '10px' }}>
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: open ? '#1d4ed8' : '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: submitted ? '8px' : open ? '8px 8px 0 0' : '8px',
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'background 0.2s',
          letterSpacing: '0.02em',
        }}
      >
        <Star size={14} fill={submitted ? '#fbbf24' : 'none'} color={submitted ? '#fbbf24' : '#fff'} />
        {submitted ? 'Review Submitted ✓' : 'Leave a Review'}
        {!submitted && (open ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
      </button>

      {/* Dropdown Panel */}
      {open && !submitted && (
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderTop: 'none',
            borderRadius: '0 0 10px 10px',
            background: '#f9fafb',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            animation: 'reviewSlideDown 0.2s ease',
          }}
        >
          <style>{`
            @keyframes reviewSlideDown {
              from { opacity: 0; transform: translateY(-8px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          <form onSubmit={handleSubmit}>
            {/* Star Rating Row */}
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Your Rating <span style={{ color: '#ef4444' }}>*</span>
              </p>
              <StarRating value={rating} onChange={setRating} disabled={loading} />
            </div>

            {/* Comment Textarea */}
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Your Comment <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
              </p>
              <textarea
                placeholder="Tell us about your experience…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={loading}
                rows={3}
                style={{
                  width: '100%',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  color: '#374151',
                  background: '#fff',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '6px', padding: '8px 10px',
                fontSize: '12px', color: '#dc2626', marginBottom: '10px',
              }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}

            {/* Submit Row */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                style={{
                  padding: '7px 14px', fontSize: '13px', fontWeight: '500',
                  background: '#fff', border: '1px solid #d1d5db',
                  borderRadius: '7px', cursor: 'pointer', color: '#6b7280',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || rating === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 16px', fontSize: '13px', fontWeight: '600',
                  background: rating === 0 ? '#93c5fd' : '#2563eb',
                  color: '#fff', border: 'none', borderRadius: '7px',
                  cursor: rating === 0 || loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <Send size={13} />
                {loading ? 'Submitting…' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Success state if panel was open then submitted */}
      {open && submitted && (
        <div style={{
          border: '1px solid #bbf7d0', borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          background: '#f0fdf4', padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '13px', color: '#16a34a',
        }}>
          <CheckCircle size={15} />
          Thank you! Your review has been submitted.
        </div>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
export default function ReservationCRM() {
  const { business_slug } = useParams();
  const slug = business_slug || 'defence';
  const navigate = useNavigate();

  // Contact form
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState('');
  const [contactError, setContactError] = useState('');

  // Platform contact info from context
  const { platformContact } = usePlatformContact();

  // Booking status checker
  const [statusEmail, setStatusEmail] = useState('');
  const [statusPhone, setStatusPhone] = useState('');
  const [bookings, setBookings] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Direct review by tracking ID
  const [reviewTrackingId, setReviewTrackingId] = useState('');
  const [reviewInput, setReviewInput] = useState('');
  const [showDirectReview, setShowDirectReview] = useState(false);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewSearchLoading, setReviewSearchLoading] = useState(false);
  const [reviewSearchError, setReviewSearchError] = useState('');

  // ── Contact form handlers ─────────────────────────────────────────────
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setContactError('');
    setContactSuccess('');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setContactSuccess('');
    setContactError('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setContactError('Please fill in all required fields (Name, Email, Message).');
      return;
    }

    setContactLoading(true);

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || undefined,
      subject: formData.subject.trim() || undefined,
      message: formData.message.trim(),
    };

    const endpoints = [
      '/api/v1/public/contact',
      '/api/v1/contact',
      '/api/v1/public/contact/',
      '/api/v1/contact/',
      '/api/v1/public/contact-us',
      '/api/v1/public/contact-us/',
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const res = await api.post(endpoint, payload);
        if (res.status === 200 || res.status === 201) {
          setContactSuccess("Your message has been sent successfully! We'll get back to you soon.");
          setFormData(EMPTY_FORM);
          setContactLoading(false);
          return;
        }
      } catch (err) {
        if (err?.response?.status === 404 || err?.response?.status === 405) {
          lastError = err;
          continue;
        }
        setContactError(formatBackendError(err));
        setContactLoading(false);
        return;
      }
    }

    setContactError(formatBackendError(lastError));
    setContactLoading(false);
  };

  // ── Booking status handler ────────────────────────────────────────────
  const handleStatusCheck = async (e) => {
    e.preventDefault();
    setStatusError('');
    setBookings(null);

    if (!statusEmail.trim() && !statusPhone.trim()) {
      setStatusError('Please enter at least an email or phone number.');
      return;
    }

    setStatusLoading(true);

    try {
      const params = {
        ...(statusEmail.trim() && { email: statusEmail.trim() }),
        ...(statusPhone.trim() && { phone: statusPhone.trim() }),
      };

      const res = await api.get('/api/v1/public/bookings/my/list', { params });
      const list = normalizeBookings(res.data);
      setBookings(list);
    } catch (err) {
      setStatusError(formatBackendError(err));
    } finally {
      setStatusLoading(false);
    }
  };

  // ── Scroll helpers ────────────────────────────────────────────────────
  const location = useLocation();

  useEffect(() => {
    if (location.state?.scrollTo === 'contact') {
      document.querySelector('.contact')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location]);

  const scrollTo = (selector) => (e) => {
    e.preventDefault();
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <LandingHeader />

      {/* ── Hero ── */}
      <section className="hero">
        <div className="container-hero-grid">
          <div className="hero-content">
            <div className="hero-badge">
              <p>WE'RE LIVE ACROSS 50+ CITIES IN USA/CANADA</p>
            </div>
            <h1 className="hero-title">Your 24/7 AI Reservation &amp; CRM System.</h1>
            <h1 className="typing-effect" style={{ color: '#345ce2' }}>Never miss a booking.</h1>
            <p className="hero-subtitle">
              Never miss a booking again. Automate reservations, manage customers, and grow your business effortlessly.
            </p>
            <div className="hero-buttons">
              <Link to={`/customerservices/`}>
                <button className="btn-primary1 btn-large">Get Started ⟶</button>
              </Link>
              <button className="btn-secondary1 btn-large">Watch Demo</button>
            </div>
            <p className="trusted">Trusted by 500+ businesses</p>
          </div>

          <div className="chat-container">
            <div className="chat-header">
              <div className="chat-header-left">
                <img src={Container} alt="container" className="container-icon" />
                <h2>AI Receptionist</h2>
              </div>
              <div className="chat-status">
                <span className="online">🟢Online 24/7</span>
              </div>
            </div>

            <div className="chat-content">
              <div className="message customer">
                <p>Good morning! I'd like to make a reservation for dinner tonight.</p>
                <div className="message-info">
                  <span className="user">Customer</span>
                  <span className="time">9:23 AM</span>
                </div>
              </div>
              <div className="message ai">
                <p>Perfect! I can help you with that. How many guests will be joining you tonight?</p>
                <div className="message-info-ai">
                  <span className="user">AI Assistant</span>
                  <span className="time">9:23 AM</span>
                </div>
              </div>
              <div className="message customer">
                <p>Four people, around 7:30 PM if possible.</p>
                <div className="message-info">
                  <span className="user">Customer</span>
                  <span className="time">9:24 AM</span>
                </div>
              </div>
              <div className="message ai">
                <p>Excellent! I've reserved a table for 4 at 7:30 PM tonight. You'll receive a confirmation text shortly.</p>
                <div className="message-info-ai">
                  <span className="user">AI Assistant</span>
                  <span className="time">9:24 AM</span>
                </div>
              </div>
            </div>

            <div className="typing-indicator">
              <span>AI is typing...</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trusted ── */}
      <section className="trusted-section">
        <div className="container">
          <p className="trusted-heading">Trusted by Businesses Across Industries</p>
          <div className="trusted-icons">
            {[
              { src: spoon1, alt: 'IT Bistro', label: 'IT BISTRO' },
              { src: home, alt: 'Homepage', label: 'HOMEPAGE' },
              { src: heart, alt: 'Healthcare', label: 'HEALTHCARE' },
              { src: typhoon, alt: 'Zentry', label: 'ZENTRY' },
              { src: cup, alt: 'Brewery', label: 'BREWERY' },
            ].map(({ src, alt, label }) => (
              <div className="icon-item" key={label}>
                <img src={src} alt={alt} className="icon" />
                <p>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features">
        <div className="container">
          <h2 className="section-title1 text-center text-2xl font-semibold">Industries We Serve</h2>
          <p className="text-xl text-gray-600 font-normal leading-7 mt-4 mb-8 text-center max-w-2xl mx-auto" style={{ color: 'black' }}>
            From restaurants to wellness centers, we tailor our AI-native service around your business use case.
          </p>
          <div className="features-grid grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { src: spoon, alt: 'spoon', title: 'Restaurants', text: 'We make reservations simple and increase booking conversion by seamlessly confirming tables.', items: ['Table bookings', 'Special requests', 'Party reservations'] },
              { src: gym, alt: 'gym', title: 'Gyms & Wellness', text: 'Never lose a client to a missed call. Our AI books and schedules classes 24/7.', items: ['Class booking', 'Personal training', 'Wellness check'] },
              { src: heartblue, alt: 'heartblue', title: 'Medical Clinics', text: 'Make scheduling patient appointments quicker, easier, and more efficient with AI-driven calling.', items: ['Patient scheduling', 'Appointment reminders', 'Medical referrals'] },
            ].map(({ src, alt, title, text, items }) => (
              <div className="feature-card" key={title}>
                <div className="icon-wrapper">
                  <img src={src} alt={alt} className="icon-image" />
                </div>
                <h3 className="feature-title">{title}</h3>
                <p className="feature-text">{text}</p>
                <ul className="feature-list">
                  {items.map((i) => <li key={i}>{i}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="benefits">
        <div className="container">
          <h1 className="section-titlee" style={{ fontSize: '2.1rem', fontWeight: '600', alignItems: 'center' }}>Zero effort, maximum growth</h1>
          <p className="section-subtitle">Going live takes less than 10 minutes. No coding. Just install. We do the rest.</p>
          <div className="benefits-grid">
            {[
              { src: rocket, alt: 'rocket', title: 'DEPLOY', text: 'Get started in minutes. No coding required. Our AI integrates seamlessly with your existing systems.' },
              { src: typhoon1, alt: 'typhoon', title: 'AUTOMATE', text: 'AI handles booking 24/7 without manual follow-ups — instant confirmations every time.' },
              { src: grow, alt: 'grow', title: 'SCALE', text: 'Effortlessly scale alongside your business without adding more staff or operational overhead.' },
            ].map(({ src, alt, title, text }) => (
              <div className="benefit-card" key={title}>
                <div className="icon-wrapper-dark">
                  <img src={src} alt={alt} className="icon-white" />
                </div>
                <h3 className="benefit-title">{title}</h3>
                <p className="benefit-text">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Booking Status ── */}
      <section className="booking-status">
        <h2 className="section-titles">Check Your Booking Status & Reviews</h2>
        <p className="section-subtitles">Enter your email and/or phone number to view your bookings and reviews.</p>

        <div className="containers">

          <div className="status-card">
            <form onSubmit={handleStatusCheck} className="form-fields">
              <input
                type="email"
                placeholder="Enter your email"
                className="input-field"
                value={statusEmail}
                onChange={(e) => { setStatusEmail(e.target.value); setStatusError(''); }}
              />
              <input
                type="tel"
                placeholder="Enter your phone number"
                className="input-field"
                value={statusPhone}
                onChange={(e) => { setStatusPhone(e.target.value); setStatusError(''); }}
              />
              <button type="submit" className="btn-submit" disabled={statusLoading}>
                {statusLoading ? 'Checking…' : 'Check Status'}
              </button>
            </form>

            {statusError && (
              <div className="lp-feedback lp-feedback--error">
                <AlertCircle size={15} /> {statusError}
              </div>
            )}

            {bookings !== null && (
              <div className="status-results">
                <h3 className="status-results-title">Your Bookings</h3>
                {bookings.length === 0 ? (
                  <p className="status-empty">No bookings found for the provided information.</p>
                ) : (
                  <div className="booking-list">
                    {bookings.map((booking, i) => (
                      <div key={booking.id ?? i} className="booking-item" style={{ flexWrap: 'wrap' }}>
                        <div className="booking-item-left">
                          <h4 className="booking-name" style={{ textAlign: 'left' }}>
                            {booking.business_name ?? booking.businessName ?? booking.service_name ?? booking.service ?? 'Booking'}
                            <span className={`booking-status-badge ${(booking.status ?? '').toLowerCase()}`}>
                              {booking.status ?? 'Pending'}
                            </span>
                          </h4>

                          {/* Date */}
                          <p className="booking-meta" style={{ textAlign: 'left' }}>
                            Booking Date:{' '}
                            {(() => {
                              const raw =
                                booking.slot_start ??
                                booking.slot_end ??
                                booking.date ??
                                booking.booking_date ??
                                booking.bookingDate ??
                                booking.scheduled_date ??
                                booking.start_time ??
                                booking.appointment_date ??
                                null;
                              if (!raw) return 'N/A';
                              const d = new Date(raw);
                              return isNaN(d)
                                ? raw
                                : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                            })()}
                          </p>

                          {/* Time */}
                          <p className="booking-meta" style={{ textAlign: 'left' }}>
                            Time:{' '}
                            {(() => {
                              const raw =
                                booking.slot_start ??
                                booking.slot_end ??
                                booking.time ??
                                booking.booking_time ??
                                booking.bookingTime ??
                                booking.start_time ??
                                booking.appointment_time ??
                                null;
                              if (!raw) return 'N/A';
                              const d = new Date(raw);
                              return isNaN(d)
                                ? raw
                                : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                            })()}
                          </p>

                          {/* Payment Reminder Warning */}
                          {(booking.status !== 'Confirmed' && booking.status !== 'CONFIRMED') && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              color: '#92400e',
                              margin: '10px 0',
                              background: '#fffbeb',
                              padding: '10px',
                              borderRadius: '8px',
                              border: '1px solid #fbbf24'
                            }}>
                              <AlertCircle size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: '13px', fontWeight: '600' }}>Your booking status is not confirmed yet!... please pay to confirm your booking</span>
                            </div>
                          )}

                          {/* Guests (optional) */}
                          {(booking.guests ?? booking.guest_count ?? booking.num_guests) != null && (
                            <p className="booking-meta" style={{ textAlign: 'left' }}>
                              Guests: {booking.guests ?? booking.guest_count ?? booking.num_guests}
                            </p>
                          )}

                          {/* Payment Reminder CTA */}
                          {(booking.status === 'PENDING_PAYMENT' || booking.status === 'Pending Payment' || (booking.status ?? '').toLowerCase() === 'pending_payment') && (
                            <div style={{
                              marginTop: '2px',
                              padding: '0 12px 12px 12px',
                              width: '100%'
                            }}>
                              <div style={{ flex: 1 }}>
                                <button
                                  onClick={() => {
                                    const rawDate = booking.slot_start || booking.date || booking.scheduled_date || '';
                                    const rawTime = booking.slot_start || booking.time || booking.start_time || '';
                                    navigate('/paymentsystem', {
                                      state: {
                                        serviceName: booking.service_name || booking.service || 'Service',
                                        price: booking.price || '0.00',
                                        businessName: booking.business_name || booking.businessName || 'Business',
                                        selectedTime: rawTime ? new Date(rawTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
                                        selectedDate: rawDate ? new Date(rawDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'
                                      }
                                    });
                                  }}
                                  style={{
                                    display: 'block',
                                    padding: '6px 14px',
                                    background: '#92400e',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    width: 'fit-content'
                                  }}
                                >
                                  Pay to Confirm ⟶
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ── Inline Review Dropdown (Confirmed only) ── */}
                        {/* {booking.status === 'Confirmed' && (
                          <div style={{ width: '100%', marginTop: '8px' }}>
                            <ReviewDropdown
                              trackingId={booking.public_tracking_id}
                              bookingId={booking.id || booking._id || booking.ID}
                            />
                          </div>
                        )} */}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="status-card" style={{ maxWidth: '600px', margin: '0 auto'}}>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px' }}>
                Enter your unique tracking code to share your feedback.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="e.g. BK-123456"
                  className="input-field"
                  value={reviewInput}
                  onChange={(e) => {
                    setReviewInput(e.target.value);
                    setReviewSearchError('');
                    setShowDirectReview(false);
                  }}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn-submit"
                  style={{ width: 'auto', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  disabled={reviewSearchLoading}
                  onClick={() => {
                    const tid = reviewInput.trim();
                    if (!tid) return;
                    setReviewSearchError('');
                    setReviewTrackingId(tid);
                    setShowDirectReview(true);
                    setBookings(null);
                  }}
                >
                  {reviewSearchLoading ? '...' : 'Go'}
                </button>
              </div>
            </div>

            {reviewSearchError && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '8px', padding: '12px', marginTop: '10px',
                color: '#dc2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <AlertCircle size={15} />
                {reviewSearchError}
              </div>
            )}

            {showDirectReview && reviewTrackingId && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '20px', textAlign: 'left' }}>
                <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#0c0d0eff' }}>
                  Review for Tracking Code: <p style={{ color: '#2563eb', fontWeight: '700' }}>{reviewTrackingId}</p>
                </h4>
                <ReviewDropdown trackingId={reviewTrackingId} initialOpen={true} />
              </div>
            )}
            {/* if you didn't get any confirmation email or sms please check your spam folder or contact us */}
            <div style={{
              background: '#ffffffff', border: '1px solid #a0a0a0ff',
              borderRadius: '8px', padding: '12px', marginTop: '25px',
              color: '#8d8585ff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <AlertCircle size={15} />
              If you didn't get any confirmation email or sms please check your folder or contact us
            </div>
          </div>
        </div>
      </section><hr />

      {/* ── Review by Tracking ID ── */}
      {/* <section id="reviews" className="review-section" style={{ background: '#f8fafc', padding: '4rem 0' }}>
        <div className="container">
          <h2 className="section-titles">Leave a Review</h2>
          <p className="section-subtitles">Have a tracking code? Leave a review for your service directly below.</p>

          
        </div>
      </section> */}

      {/* ── Contact ── */}
      <section id="contact" className="contact">
        <div className="container">
          <h2 className="section-titles">Contact Us</h2>

          <div className="contact-grid">
            {/* Info column */}
            <div className="contact-info">
              {[
                { Icon: Phone, label: 'Phone', value: platformContact.contact_phone },
                { Icon: Mail, label: 'Email', value: platformContact.contact_email },
                { Icon: MapPin, label: 'Address', value: platformContact.contact_address },
              ].map(({ Icon, label, value }) => (
                <div className="contact-item card" key={label}>
                  <div className="contact-icon"><Icon className="icon" /></div>
                  <div>
                    <h3 className="contact-label">{label}</h3>
                    <p className="contact-value" style={{ whiteSpace: 'pre-line' }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact form */}
            <div className="form-card" style={{ marginTop: '30px' }}>
              <form onSubmit={handleSendMessage} className="form-fields" noValidate>
                <input
                  type="text"
                  name="name"
                  placeholder="Your Name *"
                  className="input-field"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Your Email *"
                  className="input-field"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <input
                  type="text"
                  name="subject"
                  placeholder="Subject"
                  className="input-field"
                  value={formData.subject}
                  onChange={handleChange}
                />
                <textarea
                  name="message"
                  placeholder="Your Message *"
                  rows="4"
                  className="textarea-field"
                  value={formData.message}
                  onChange={handleChange}
                  required
                />

                <button type="submit" className="btn-submit" disabled={contactLoading}>
                  {contactLoading ? 'Sending…' : 'Send Message'}
                </button>
              </form>

              {contactSuccess && (
                <div className="lp-feedback lp-feedback--success">
                  <CheckCircle size={15} /> {contactSuccess}
                </div>
              )}
              {contactError && (
                <div className="lp-feedback lp-feedback--error">
                  <AlertCircle size={15} /> {contactError}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-logo">
              <div className="logo">
                <img src={logo} alt="Logo" />
                <span>AI Reservation &amp; CRM System</span>
              </div>
              <p>Your 24/7 AI-powered receptionist that never misses a booking.</p>
              <div className="social-icons">
                {[
                  { src: tel, alt: 'telegram' },
                  { src: fb, alt: 'facebook' },
                  { src: lin, alt: 'linkedin' },
                  { src: insta, alt: 'instagram' },
                ].map(({ src, alt }) => (
                  <div key={alt}>
                    <img src={src} alt={alt} className="social-icon" />
                  </div>
                ))}
              </div>
            </div>

            <div className="footer-links">
              <h4>Product</h4>
              <ul>
                <li><a href="#">AI Receptionist</a></li>
                <li><a href="#">Integrations</a></li>
                <li><a href="#">Features</a></li>
                <li><a href="#">Pricing</a></li>
              </ul>
            </div>

            <div className="footer-links">
              <h4>Quick Links</h4>
              <ul>
                <li><a href="#features" onClick={scrollTo('.features')}>Services</a></li>
                {/* <li><a href="#hero" onClick={scrollTo('.hero')}></a></li> */}
                <li><a href="#status" onClick={scrollTo('.booking-status')}>Booking Status</a></li>
                <li><a href="#contact" onClick={scrollTo('.contact')}>Contact</a></li>
              </ul>
            </div>

            <div className="newsletter">
              <h4>Newsletter</h4>
              <p>Get the latest updates and news</p>
              <form onSubmit={(e) => e.preventDefault()}>
                <input type="email" placeholder="Your email" className="newsletter-input" />
                <button type="submit" className="btn-submit">Subscribe</button>
              </form>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2026 AI Reservation &amp; CRM System Inc. All rights reserved.</p>
            <div className="footer-legal-links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}