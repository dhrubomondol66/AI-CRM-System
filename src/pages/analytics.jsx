import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown, Download, TrendingUp, TrendingDown,
  Phone, Calendar, BarChart2, DollarSign, RefreshCw, AlertCircle,
} from 'lucide-react';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import Sidebar from '../components/Sidebar.jsx';
import '../assets/styles/analytics.css';
import Cookies from 'js-cookie';
import axios from 'axios';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
);

// ── API instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta?.env?.VITE_API_BASE_URL || 'https://reservation-api-kuzr.onrender.com',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const DATE_OPTIONS = ['Today', 'Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'This Year'];

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

// ── Derive chart data from recent_bookings ────────────────────────────────
// Groups bookings by date for the trend line
const buildBookingTrends = (bookings) => {
  const map = {};
  bookings.forEach((b) => {
    const date = new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    map[date] = (map[date] || 0) + 1;
  });
  return Object.entries(map)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([label, value]) => ({ label, value }));
};

// Groups bookings by status for the donut chart
const buildStatusBreakdown = (bookings) => {
  const map = {};
  bookings.forEach((b) => { map[b.status] = (map[b.status] || 0) + 1; });
  return map;
};

// Groups bookings by hour for the bar chart
const buildHourlyVolume = (bookings) => {
  const map = {};
  bookings.forEach((b) => {
    const hour = new Date(b.created_at).getHours();
    const label = `${hour}:00`;
    map[label] = (map[label] || 0) + 1;
  });
  return Object.entries(map)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([label, count]) => ({ label, count }));
};

// ── Chart base options ─────────────────────────────────────────────────────
const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
    y: {
      grid: { color: 'rgba(0,0,0,0.04)' },
      ticks: { font: { size: 11 }, color: '#94a3b8', stepSize: 1, precision: 0 },
      beginAtZero: true,
    },
  },
  elements: { line: { tension: 0.45 }, point: { radius: 4, hoverRadius: 6 } },
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
    y: {
      grid: { color: 'rgba(0,0,0,0.04)' },
      ticks: { font: { size: 11 }, color: '#94a3b8', stepSize: 1, precision: 0 },
      beginAtZero: true,
    },
  },
};

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { font: { size: 12 }, color: '#334155', padding: 16, usePointStyle: true },
    },
    tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed}` } },
  },
  cutout: '62%',
};

// ── Skeleton helper ────────────────────────────────────────────────────────
const Sk = ({ w = '80%', h = '14px', r = '4px' }) => (
  <div className="an-skel" style={{ width: w, height: h, borderRadius: r }} />
);

// ── Component ──────────────────────────────────────────────────────────────
export default function Analytics() {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState('Last 30 Days');
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSync, setLastSync] = useState(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/v1/admin/dashboard', {
        params: { period: dateFilter },
      });
      // API returns flat: { total_bookings, total_calls, recent_bookings }
      const d = res?.data?.data ?? res?.data ?? {};
      setRawData(d);
      setLastSync(new Date());
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message ?? err?.response?.data?.error;
      if (!err.response) setError('Network error — cannot reach the server.');
      else if (status === 401) setError('Session expired. Please log in again.');
      else if (status === 403) setError('Access denied (403). Check admin permissions.');
      else setError(msg ?? `Error ${status ?? 'unknown'} fetching analytics.`);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const res = await api.get('/api/v1/admin/dashboard/export', {
        responseType: 'blob',
        params: { period: dateFilter },
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Export failed. Please try again.');
    }
  };

  // ── Derived values from real API data ─────────────────────────────────
  const totalBookings = rawData?.total_bookings ?? 0;
  const totalCalls = rawData?.total_calls ?? 0;
  const recentBookings = Array.isArray(rawData?.recent_bookings) ? rawData.recent_bookings : [];

  const pendingCount = recentBookings.filter((b) => b.status === 'PENDING_PAYMENT').length;
  const confirmedCount = recentBookings.filter((b) => b.status === 'CONFIRMED').length;

  // Chart derivations
  const bookingTrends = buildBookingTrends(recentBookings);
  const statusBreakdown = buildStatusBreakdown(recentBookings);
  const hourlyVolume = buildHourlyVolume(recentBookings);

  // ── Chart datasets ────────────────────────────────────────────────────
  const bookingTrendsData = {
    labels: bookingTrends.map((t) => t.label),
    datasets: [{
      label: 'Bookings',
      data: bookingTrends.map((t) => t.value),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37,99,235,0.08)',
      fill: true,
      pointBackgroundColor: '#2563eb',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    }],
  };

  const STATUS_CHART_COLORS = {
    PENDING_PAYMENT: '#f59e0b',
    INITIATED: '#3b82f6',
    CONFIRMED: '#10b981',
    CANCELLED: '#ef4444',
    EXPIRED: '#94a3b8',
  };
  const statusLabels = Object.keys(statusBreakdown);
  const bookingSourceData = {
    labels: statusLabels.map((s) => STATUS_CONFIG[s]?.label ?? s),
    datasets: [{
      data: statusLabels.map((s) => statusBreakdown[s]),
      backgroundColor: statusLabels.map((s) => STATUS_CHART_COLORS[s] ?? '#cbd5e1'),
      hoverBackgroundColor: statusLabels.map((s) => STATUS_CHART_COLORS[s] ?? '#94a3b8'),
      borderWidth: 0,
    }],
  };

  const hourlyVolumeData = {
    labels: hourlyVolume.map((h) => h.label),
    datasets: [{
      label: 'Bookings Created',
      data: hourlyVolume.map((h) => h.count),
      backgroundColor: 'rgba(37,99,235,0.75)',
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  // ── Stat cards ────────────────────────────────────────────────────────
  const statCards = [
    { label: 'Total Bookings', value: totalBookings, icon: Calendar, color: '#2563eb' },
    { label: 'Total Calls', value: totalCalls, icon: Phone, color: '#7c3aed' },
    { label: 'Pending Payment', value: pendingCount, icon: BarChart2, color: '#f59e0b' },
    { label: 'Confirmed', value: confirmedCount, icon: DollarSign, color: '#10b981' },
  ];

  // ── Filtered recent bookings for table ───────────────────────────────
  const filtered = recentBookings.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (b.customer_name ?? '').toLowerCase().includes(q) ||
      (b.customer_phone ?? '').includes(q) ||
      (b.public_tracking_id ?? '').toLowerCase().includes(q) ||
      (b.status ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="dashboard-container">
      <Sidebar />

      <main className="main-content">

        {/* ── Header ── */}
        <header className="content-header">
          <div className="search-container">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, phone, booking ID or status…"
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="an-refresh-btn"
              onClick={fetchData}
              disabled={loading}
              title="Refresh data"
            >
              <RefreshCw size={15} className={loading ? 'spinning-icon' : ''} />
            </button>
            <button className="export-btn" onClick={handleExport} disabled={loading}>
              <Download size={15} className="export-icon" />
              Export Data
            </button>
          </div>
        </header>

        {/* ── Error banner ── */}
        {error && (
          <div className="an-error-banner" role="alert">
            <AlertCircle size={15} />
            <span>{error}</span>
            <button className="an-error-retry" onClick={fetchData}>Retry</button>
            <button className="an-error-close" onClick={() => setError(null)}>&times;</button>
          </div>
        )}

        {/* ── Title row ── */}
        <div className="dashboard-title-section">
          <div>
            <h1 className="dashboard-title">Advanced Analytics</h1>
            {lastSync && (
              <p className="an-last-sync" style={{ textAlign: 'left' }}>
                Updated {lastSync.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <button className="date-filter-btn" onClick={() => setShowFilter((v) => !v)}>
              <span>{dateFilter}</span>
              <ChevronDown
                size={15}
                className="chevron-icon"
                style={{ transform: showFilter ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              />
            </button>
            {showFilter && (
              <div className="an-date-dropdown">
                {DATE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    className={`an-date-option ${dateFilter === opt ? 'active' : ''}`}
                    onClick={() => { setDateFilter(opt); setShowFilter(false); }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="stats-grid">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div className="stat-card an-stat-card" key={label}>
              <div className="an-stat-top">
                <div className="an-stat-icon-wrap" style={{ color }}>
                  <Icon size={18} strokeWidth={2} />
                </div>
              </div>
              {loading
                ? <Sk w="60%" h="28px" />
                : <div className="stat-value an-stat-value">{value}</div>}
              <div className="stat-label an-stat-label">{label}</div>
              <div className="stat-progress an-stat-progress">
                <div
                  className="stat-progress-bar an-stat-bar"
                  style={{ width: loading ? '0%' : '60%', backgroundColor: color, transition: 'width 0.6s ease' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* ── Charts ── */}
        <div className="an-charts-grid">

          {/* Booking trends line chart — derived from created_at dates */}
          <div className="an-chart-card an-chart-wide">
            <div className="an-chart-header">
              <div>
                <h3 className="an-chart-title">Booking Trends</h3>
                <p className="an-chart-sub">Bookings created per day</p>
              </div>
            </div>
            <div className="an-chart-body">
              {loading ? (
                <div className="an-chart-skeleton"><Sk w="100%" h="100%" r="8px" /></div>
              ) : bookingTrends.length > 0 ? (
                <Line data={bookingTrendsData} options={lineOptions} />
              ) : (
                <div className="an-chart-empty">No booking trend data available.</div>
              )}
            </div>
          </div>

          {/* Status breakdown donut — derived from recent_bookings statuses */}
          <div className="an-chart-card an-chart-narrow">
            <div className="an-chart-header">
              <div>
                <h3 className="an-chart-title">Booking Status</h3>
                <p className="an-chart-sub">Breakdown by status</p>
              </div>
            </div>
            <div className="an-chart-body an-donut-wrap">
              {loading ? (
                <div className="an-chart-skeleton"><Sk w="160px" h="160px" r="50%" /></div>
              ) : statusLabels.length > 0 ? (
                <>
                  <Pie data={bookingSourceData} options={pieOptions} />
                  <div className="an-donut-center">
                    <span className="an-donut-pct">{recentBookings.length}</span>
                    <span className="an-donut-label">total</span>
                  </div>
                </>
              ) : (
                <div className="an-chart-empty">No status data available.</div>
              )}
            </div>
            {/* Legend rows */}
            <div className="an-source-rows">
              {statusLabels.map((s) => (
                <div className="an-source-row" key={s}>
                  <span className="an-source-dot" style={{ background: STATUS_CHART_COLORS[s] ?? '#cbd5e1' }} />
                  <span className="an-source-name">{STATUS_CONFIG[s]?.label ?? s}</span>
                  {loading
                    ? <Sk w="20px" h="12px" />
                    : <span className="an-source-pct">{statusBreakdown[s]}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Hourly volume bar chart — derived from created_at hours */}
          <div className="an-chart-card an-chart-full">
            <div className="an-chart-header">
              <div>
                <h3 className="an-chart-title">Booking Activity by Hour</h3>
                <p className="an-chart-sub">When bookings are being created throughout the day</p>
              </div>
            </div>
            <div className="an-chart-body">
              {loading ? (
                <div className="an-chart-skeleton"><Sk w="100%" h="100%" r="8px" /></div>
              ) : hourlyVolume.length > 0 ? (
                <Bar data={hourlyVolumeData} options={barOptions} />
              ) : (
                <div className="an-chart-empty">No activity data available.</div>
              )}
            </div>
          </div>

        </div>

        {/* ── Recent Bookings table ── */}
        <div className="an-table-card">
          <div className="an-table-header">
            <div>
              <h3 className="an-chart-title">Recent Bookings</h3>
              <p className="an-chart-sub">
                {loading ? 'Loading…' : `${filtered.length} booking${filtered.length !== 1 ? 's' : ''} shown`}
              </p>
            </div>
            <a href="/admin/bookings" className="view-all-link">View all Bookings</a>
          </div>

          <div className="an-table">
            {/* Table head */}
            <div className="an-table-head">
              <div className="an-th">Customer</div>
              <div className="an-th">Booking ID</div>
              <div className="an-th">Phone</div>
              <div className="an-th">Created At</div>
              <div className="an-th">Status</div>
            </div>

            {/* Skeleton rows */}
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div className="an-table-row" key={i}>
                  <div className="an-td"><div className="an-avatar-skel an-skel" /><Sk w="90px" /></div>
                  <div className="an-td"><Sk w="80px" /></div>
                  <div className="an-td"><Sk w="110px" /></div>
                  <div className="an-td"><Sk w="90px" /></div>
                  <div className="an-td"><Sk w="90px" h="22px" r="99px" /></div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="an-empty">
                {searchQuery ? 'No results match your search.' : 'No recent bookings found.'}
              </div>
            ) : (
              filtered.map((b, i) => {
                const statusStyle = getStatusStyle(b.status);
                const initials = getInitials(b.customer_name);
                const avatarColor = getAvatarColor(b.customer_name);
                const createdAt = b.created_at
                  ? new Date(b.created_at).toLocaleString('en-US', {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })
                  : '—';

                return (
                  <div className="an-table-row" key={b.id} style={{ animationDelay: `${i * 40}ms` }}>

                    {/* Customer */}
                    <div className="an-td">
                      <div
                        className="an-avatar"
                        style={{ backgroundColor: avatarColor, color: 'white', fontWeight: 700 }}
                      >
                        {initials}
                      </div>
                      <span className="an-name">{b.customer_name ?? 'Guest'}</span>
                    </div>

                    {/* Booking ID */}
                    <div className="an-td">
                      <span style={{ fontFamily: 'monospace', fontWeight: '600', fontSize: '0.8rem', color: '#2563eb' }}>
                        {b.public_tracking_id ?? '—'}
                      </span>
                    </div>

                    {/* Phone */}
                    <div className="an-td an-interaction">
                      {b.customer_phone ?? '—'}
                    </div>

                    {/* Created At */}
                    <div className="an-td an-time">{createdAt}</div>

                    {/* Status */}
                    <div className="an-td">
                      <span
                        style={{
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color,
                          padding: '3px 10px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {statusStyle.label}
                      </span>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

      </main>
    </div>
  );
}