import React, { useState, useRef, useEffect } from 'react';
import { Search, Clock, DollarSign, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import '../assets/styles/customer.css';
import { Link, useLocation } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Robot from '../assets/Rectangle 6.png';
import axios from 'axios';
import Cookies from 'js-cookie';

// ── Axios instance ─────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta?.env?.VITE_API_BASE_URL || '/',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token') || localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response normalizer ────────────────────────────────────────────────────
const normalizeServices = (data) => {
  const list = Array.isArray(data)
    ? data
    : data?.data ?? data?.services ?? data?.results ?? [];

  return list.map((item, i) => ({
    id: item.id ?? item._id ?? i,
    title: item.business_name ?? item.title ?? item.name ?? item.service_name ?? 'Untitled Service',
    description: item.description ?? item.desc ?? '',
    duration: item.duration ?? (item.duration_minutes ? `${item.duration_minutes} Minutes` : ''),
    price: item.price != null
      ? (typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : item.price)
      : item.is_free ? 'Free Reservation' : '',
    location: item.location ?? item.address ?? item.venue ?? '',
    badge: item.badge ?? item.tag ?? (item.is_popular ? 'MOST POPULAR' : null),
    category: item.category ?? item.service_type ?? 'All Services',
    business_slug: item.business_slug ?? item.slug ?? null,
    logo_url: item.logo_url ?? item.logo ?? null,
  }));
};

const TABS = ['All Services'];

// ── Authenticated logo hook ────────────────────────────────────────────────
// Fetches logo as a blob so the Authorization header is sent correctly.
// Returns a local object URL (or null while loading / on error).
function useAuthLogo(businessSlug) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (!businessSlug) return;
    let objectUrl = null;
    let cancelled = false;

    api
      .get(`/api/v1/public/${businessSlug}/logo`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [businessSlug]);

  return src;
}

// function businessLogo(businessSlug) {
//   const src = useAuthLogo(businessSlug);
//   if (!src) return null;
//   return (
//     <img
//       src={src}
//       alt={`${businessSlug} logo`}
//       className="service-logo"
//     />
//   );
// }

// ── Service logo component ─────────────────────────────────────────────────
function ServiceLogo({ businessSlug, title, logoUrl }) {
  const authSrc = useAuthLogo(businessSlug);
  const finalSrc = logoUrl || authSrc;

  if (!finalSrc) return null;

  return (
    <img
      src={finalSrc}
      alt={`${title} logo`}
      className="service-logo"
      onError={(e) => {
        // If logoUrl failed, try authSrc if we haven't already
        if (logoUrl && authSrc && e.target.src !== authSrc) {
          e.target.src = authSrc;
        } else {
          e.target.style.display = 'none';
        }
      }}
    />
  );
}

// ── Payment Success Toast ──────────────────────────────────────────────────
function PaymentSuccessToast({ bookingId, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 7000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      position: 'fixed', top: '1.5rem', left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: '#f0fdf4', border: '1.5px solid #86efac',
      borderRadius: '14px', padding: '1rem 1.5rem',
      boxShadow: '0 8px 32px rgba(34,197,94,0.18)',
      display: 'flex', alignItems: 'center', gap: '0.875rem',
      minWidth: '300px', maxWidth: '90vw',
      animation: 'slideDown 0.35s cubic-bezier(.4,0,.2,1)',
    }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        background: '#22c55e', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        <CheckCircle size={20} color="white" />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: '700', color: '#15803d', fontSize: '0.95rem' }}>
          Payment Successful! 🎉
        </p>
        {bookingId && (
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#166534' }}>
            Booking ID: <strong>{bookingId}</strong>
          </p>
        )}
      </div>
      <button onClick={onDismiss} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#86efac', fontSize: '1.2rem', lineHeight: 1, padding: 0,
      }}>×</button>
    </div>
  );
}

// Inject keyframe once
if (!document.getElementById('customer-keyframes')) {
  const s = document.createElement('style');
  s.id = 'customer-keyframes';
  s.textContent = `
    @keyframes slideDown {
      from { opacity: 0; transform: translateX(-50%) translateY(-16px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;
  document.head.appendChild(s);
}

// ── Component ──────────────────────────────────────────────────────────────
export default function AIReservationCRM() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('All Services');
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const searchParams = new URLSearchParams(location.search);
  const paymentStatus = searchParams.get('payment');
  const returnBookingId = searchParams.get('booking_id');

  const [showSuccessToast, setShowSuccessToast] = useState(paymentStatus === 'success');

  useEffect(() => {
    if (paymentStatus === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const servicesGridRef = useRef(null);

  // ── Fetch ALL services ────────────────────────────────────────────────
  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {};
        if (activeTab !== 'All Services') params.category = activeTab;
        if (searchQuery) params.search = searchQuery;

        const res = await api.get('/api/v1/public/', { params });
        const list = normalizeServices(res.data);
        setServices(list);
      } catch (err) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message ?? err?.response?.data?.error;
        if (!err.response) {
          setError('Network error — cannot reach the server.');
        } else if (status === 404) {
          setError(null);
        } else {
          setError(msg ?? `Error ${status} loading services.`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [activeTab, searchQuery]);

  // ── Filter logic ──────────────────────────────────────────────────────
  const filteredServices = services.filter((service) => {
    const matchesTab = activeTab === 'All Services' || service.category === activeTab;
    const matchesSearch =
      !searchQuery ||
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleExploreClick = () => {
    servicesGridRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Skeleton card ─────────────────────────────────────────────────────
  const SkeletonCard = () => (
    <div className="service-card service-card--skeleton">
      <div className="service-content">
        <div className="skel skel-badge" />
        <div className="skel skel-title" />
        <div className="skel skel-desc" />
        <div className="skel skel-desc skel-desc--short" />
        <div className="service-details" style={{ gap: '0.5rem', flexDirection: 'column' }}>
          <div className="skel skel-detail" />
          <div className="skel skel-detail" />
          <div className="skel skel-detail" />
        </div>
        <div className="skel skel-btn" />
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="ai-reservation-container">

      {showSuccessToast && (
        <PaymentSuccessToast
          bookingId={returnBookingId}
          onDismiss={() => setShowSuccessToast(false)}
        />
      )}

      <Header showThemeToggle={false} myBookingsText="My Booking" />

      <div className="main-wrapper">

        {/* ── Hero ── */}
        <div className="hero-section">
          <div className="hero-grid">
            <div className="hero-illustration">
              <div className="illustration-content">
                <div className="ai-circle-inner">
                  <img src={Robot} alt="AI Robot" />
                </div>
              </div>
            </div>

            <div className="hero-text">
              <div className="instant-badge">INSTANT CONFIRMATIONS</div>
              <h1 className="hero-title">
                Seamless care,{' '}
                <span className="hero-highlight">one click away.</span>
              </h1>
              <p className="hero-description">
                Fast, automated booking powered by our AI receptionist. Select a service below to get started.
              </p>
              <button className="view-bookings-btn" onClick={handleExploreClick}>
                Explore Services
                <span>↓</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="customer-error-banner">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* ── Search ── */}
        <div
          className="tabs-section"
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem 0' }}
          ref={servicesGridRef}
        >
          <div
            className="search-wrapper"
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '50%',
              // minWidth: '280px',
              // maxWidth: '640px',
            }}
          >
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search for dental cleanups, massage, coaching..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              style={{ height: '50px', width: '100%', borderRadius: '10px', border: '1px solid #ffffffff', color: '#000000', backgroundColor: '#ffffffff', fontSize: '16px' }}
            />
          </div>
        </div>

        {/* ── Services grid ── */}
        <div className="services-grid">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : filteredServices.length === 0
              ? (
                <div className="customer-empty">
                  <p>No services found{searchQuery ? ` for "${searchQuery}"` : ''}.</p>
                </div>
              )
              : filteredServices.map((service) => (
                <div key={service.id} className="service-card">
                  <div className="service-content">
                    <div className="service-header">
                      {/* ── Authenticated logo — fetched via axios, not <img src> ── */}
                      {service.business_slug && (
                        <ServiceLogo
                          businessSlug={service.business_slug}
                          title={service.title}
                          logoUrl={service.logo_url}
                        />
                      )}
                      {service.badge && (
                        <span className="service-badge">{service.badge}</span>
                      )}
                      <div className="service-title-container">
                        <h3 className="service-title">{service.title}</h3>
                        <p className="service-description">{service.description}</p>
                      </div>
                    </div>
                    <div className="service-details">
                      {service.duration && (
                        <div className="service-detail-item">
                          <Clock className="detail-icon" />
                          <span>{service.duration}</span>
                        </div>
                      )}
                      {service.price && (
                        <div className="service-detail-item">
                          <DollarSign className="detail-icon" />
                          <span className="price-text">{service.price}</span>
                        </div>
                      )}
                      {service.location && (
                        <div className="service-detail-item">
                          <MapPin className="detail-icon" />
                          <span>{service.location}</span>
                        </div>
                      )}
                    </div>

                    {service.business_slug ? (
                      <Link
                        to={`/customerservice/${service.business_slug}?bid=${service.id}`}
                        className="service-link"
                      >
                        <button className="book-now-btn">Book Now <span>→</span></button>
                      </Link>
                    ) : (
                      <button className="book-now-btn" disabled style={{ opacity: 0.5 }}>
                        Unavailable
                      </button>
                    )}
                  </div>
                </div>
              ))
          }
        </div>

      </div>
    </div>
  );
}