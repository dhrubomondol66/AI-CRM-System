import React, { useState, useEffect } from 'react';
import {
  Search,
  CalendarDays,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import '../assets/styles/adminBooking.css';
import Sidebar from '../components/Sidebar.jsx';
import axios from 'axios';
import Cookies from 'js-cookie';

// ── API setup ──────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta?.env?.VITE_API_BASE_URL || 'https://reservation-api-kuzr.onrender.com',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token') || localStorage.getItem('access_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

const httpErrorMsg = (err) => {
  const status = err?.response?.status;
  const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.response?.data?.detail;
  if (!err.response) return 'Network error — cannot reach the server.';
  if (status === 401) return 'Session expired. Please log in again.';
  if (status === 403) return 'Forbidden — your account may not have admin privileges.';
  if (status === 404) return 'Endpoint not found on server.';
  if (status >= 500) return `Server error (${status}) — check backend logs.`;
  return msg ?? `Unexpected error (${status}).`;
};

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING_PAYMENT: { bg: '#fef3c7', color: '#92400e', label: 'Pending Payment' },
  INITIATED: { bg: '#dbeafe', color: '#1e40af', label: 'Initiated' },
  CONFIRMED: { bg: '#d1fae5', color: '#065f46', label: 'Confirmed' },
  CANCELLED: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  EXPIRED: { bg: '#f3f4f6', color: '#6b7280', label: 'Expired' },
};

const getStatusStyle = (s) => STATUS_CONFIG[s] ?? { bg: '#f3f4f6', color: '#374151', label: s };

// ── Avatar helpers ─────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706', '#dc2626'];
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
};
const getAvatarColor = (name) => {
  if (!name) return '#94a3b8';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// ── Date formatter ─────────────────────────────────────────────────────────
const formatSlot = (iso) => {
  if (!iso) return { date: '—', time: '—' };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
};

const PAGE_SIZE = 10;

// ── Component ──────────────────────────────────────────────────────────────
export default function Bookings() {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({
    total_bookings: 0,
    pending_payment: 0,
    confirmed: 0,
    cancelled: 0,
    expired: 0,
  });

  const tabs = ['All', 'INITIATED', 'PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED'];

  const fetchBookings = async (statusFilter = 'All') => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'All') {
        params.status_filter = statusFilter.toUpperCase();
      }

      const response = await api.get('/api/v1/admin/bookings-summary', { params });
      const d = response.data?.data ?? response.data ?? {};

      setStats({
        total_bookings: d.total_bookings ?? 0,
        pending_payment: d.pending_payment ?? 0,
        confirmed: d.confirmed ?? 0,
        cancelled: d.cancelled ?? 0,
        expired: d.expired ?? 0,
      });

      const raw = Array.isArray(d.bookings) ? d.bookings : [];
      setBookings(raw.map((b) => ({
        id: b.booking_id ?? b.id ?? '—',
        trackingId: b.public_tracking_id ?? '—',
        customer: b.customer_name ?? 'Guest',
        phone: b.customer_phone ?? '—',
        email: b.customer_email ?? '—',
        service: b.service_name ?? '—',
        slotStart: b.slot_start ?? null,
        status: b.status ?? '—',
        createdAt: b.created_at ?? null,
      })));

      setPage(1);
    } catch (err) {
      setError(httpErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(activeTab); }, [activeTab]);

  const filtered = bookings.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.customer.toLowerCase().includes(q) ||
      b.phone.includes(q) ||
      b.email.toLowerCase().includes(q) ||
      b.service.toLowerCase().includes(q) ||
      b.trackingId.toLowerCase().includes(q) ||
      b.status.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="bookings-container">
      <Sidebar />

      <main className="bookings-main-content">

        <header className="bookings-header">
          <div>
            <h1 className="bookings-page-title">Bookings</h1>
            <p className="bookings-page-subtitle">Manage and monitor all incoming appointments.</p>
          </div>
          <button
            className="refresh-btn"
            onClick={() => fetchBookings(activeTab)}
            disabled={loading}
            title="Refresh"
            style={{ marginLeft: 'auto', background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.75rem', cursor: 'pointer' }}
          >
            <RefreshCw size={15} className={loading ? 'spinning' : ''} />
          </button>
        </header>

        <div className="bookings-ai-insight">
          <div className="bookings-ai-insight-icon">
            <Sparkles className="sparkles-icon" />
          </div>
          <div className="bookings-ai-insight-content">
            <h3 className="bookings-ai-insight-title">AI Insight</h3>
            <p className="bookings-ai-insight-text">
              {stats.total_bookings > 0
                ? `${stats.total_bookings} total bookings tracked. ${stats.pending_payment} awaiting payment.`
                : 'No bookings yet. Your AI Receptionist is ready to take appointments.'}
            </p>
          </div>
          <a href="/adminDashboard" className="bookings-view-analytics">VIEW ANALYTICS</a>
        </div>

        <div className="bookings-stats-grid">
          <div className="bookings-stat-card">
            <div className="bookings-stat-label">Total Bookings</div>
            <div className="bookings-stat-value">{loading ? '—' : stats.total_bookings}</div>
          </div>
          <div className="bookings-stat-card">
            <div className="bookings-stat-label">Pending Payment</div>
            <div className="bookings-stat-value warning">{loading ? '—' : stats.pending_payment}</div>
            <div className="bookings-stat-change warning">Requires action</div>
          </div>
          <div className="bookings-stat-card">
            <div className="bookings-stat-label">Confirmed</div>
            <div className="bookings-stat-value">{loading ? '—' : stats.confirmed}</div>
            <div className="bookings-stat-change positive">Paid &amp; confirmed</div>
          </div>
          <div className="bookings-stat-card">
            <div className="bookings-stat-label">Cancelled / Expired</div>
            <div className="bookings-stat-value">{loading ? '—' : stats.cancelled + stats.expired}</div>
          </div>
        </div>

        <div className="bookings-search-section">
          <div className="bookings-search-container">
            <Search className="bookings-search-icon" />
            <input
              type="text"
              placeholder="Search by name, phone, email, booking ID or service..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="bookings-search-input"
            />
          </div>
        </div>

        <div className="bookings-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`bookings-tab ${activeTab === tab ? 'active' : ''}`}
            >
              {tab === 'All' ? 'All' : STATUS_CONFIG[tab]?.label ?? tab}
            </button>
          ))}
        </div>

        {error && (
          <div
            className="bookings-error-banner"
            role="alert"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}
          >
            <AlertCircle size={16} />
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => fetchBookings(activeTab)} style={{ background: 'none', border: 'none', color: '#991b1b', fontWeight: '600', cursor: 'pointer' }}>Retry</button>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '1.1rem' }}>&times;</button>
          </div>
        )}

        {loading && (
          <div className="bookings-loading">
            <div className="loading-spinner" />
            <p>Loading bookings...</p>
          </div>
        )}

        {!loading && !error && (
          <div className="bookings-table-card">
            <div className="bookings-table">
              <div className="bookings-table-header">
                <div className="bookings-th">CUSTOMER</div>
                <div className="bookings-th">PHONE</div>
                <div className="bookings-th">SERVICE</div>
                <div className="bookings-th">SLOT</div>
                <div className="bookings-th">BOOKED ON</div>
                <div className="bookings-th">BOOKING ID</div>
                <div className="bookings-th">STATUS</div>
              </div>

              {paginated.length === 0 && (
                <div className="bookings-empty-state" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  {searchQuery ? 'No bookings match your search.' : 'No bookings found.'}
                </div>
              )}

              {paginated.map((b) => {
                const slot = formatSlot(b.slotStart);
                const created = formatSlot(b.createdAt);
                const statusStyle = getStatusStyle(b.status);
                const initials = getInitials(b.customer !== 'Guest' ? b.customer : null);
                const avatarColor = getAvatarColor(b.customer);

                return (
                  <div key={b.id} className="bookings-table-row">
                    <div className="bookings-td customer-cell">
                      <div
                        className="customer-avatar"
                        style={{ backgroundColor: avatarColor, color: 'white', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.75rem', flexShrink: 0 }}
                      >
                        {initials}
                      </div>
                      <div className="customer-info">
                        <div className="customer-name">{b.customer}</div>
                        <div className="customer-email" style={{ fontSize: '0.7rem', color: '#64748b' }}>{b.email}</div>
                      </div>
                    </div>
                    <div className="bookings-td" style={{ fontSize: '0.875rem', fontWeight: '500' }}>{b.phone}</div>
                    <div className="bookings-td" style={{ fontSize: '0.875rem' }}>{b.service}</div>
                    <div className="bookings-td">
                      <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{slot.date}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{slot.time}</div>
                    </div>
                    <div className="bookings-td">
                      <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{created.date}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{created.time}</div>
                    </div>
                    <div className="bookings-td">
                      <span style={{ fontFamily: 'monospace', fontWeight: '600', fontSize: '0.8rem', color: '#2563eb' }}>
                        {b.trackingId}
                      </span>
                    </div>
                    <div className="bookings-td">
                      <span style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {statusStyle.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bookings-pagination">
              <div className="pagination-info">
                Showing {paginated.length} of {filtered.length} bookings
                {filtered.length !== bookings.length && ` (filtered from ${bookings.length})`}
              </div>
              <div className="pagination-controls">
                <button className="pagination-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`dots-${i}`} className="pagination-dots">...</span>
                    ) : (
                      <button key={p} className={`pagination-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>
                        {p}
                      </button>
                    )
                  )}
                <button className="pagination-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}