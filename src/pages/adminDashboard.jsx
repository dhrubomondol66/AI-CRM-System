import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown, Download, Phone, Calendar, BarChart2,
  DollarSign, RefreshCw, AlertCircle, TrendingUp, TrendingDown,
  CheckCircle, XCircle, Clock, Users, Activity,
} from 'lucide-react';
import { Line, Pie, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import Sidebar from '../components/Sidebar.jsx';
// import '../assets/styles/analytics.css';
import '../assets/styles/adminDashboard.css';
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
  const token = Cookies.get('access_token') || localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const DATE_OPTIONS = ['Today', 'Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'This Year'];

const STATUS_CONFIG = {
  PENDING_PAYMENT: { bg: '#fef3c7', color: '#92400e', label: 'Pending Payment', chartColor: '#f59e0b' },
  INITIATED: { bg: '#dbeafe', color: '#1e40af', label: 'Initiated', chartColor: '#3b82f6' },
  CONFIRMED: { bg: '#d1fae5', color: '#065f46', label: 'Confirmed', chartColor: '#10b981' },
  CANCELLED: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled', chartColor: '#ef4444' },
  EXPIRED: { bg: '#f3f4f6', color: '#6b7280', label: 'Expired', chartColor: '#94a3b8' },
};
const getStatusStyle = (s) => STATUS_CONFIG[s] ?? { bg: '#f3f4f6', color: '#374151', label: s, chartColor: '#cbd5e1' };

const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706', '#dc2626'];
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0].slice(0, 2).toUpperCase();
};
const getAvatarColor = (name) => {
  if (!name) return '#94a3b8';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// ── Chart derivations ──────────────────────────────────────────────────────
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

const buildStatusBreakdown = (bookings) => {
  const map = {};
  bookings.forEach((b) => { map[b.status] = (map[b.status] || 0) + 1; });
  return map;
};

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

const buildWeeklyComparison = (bookings, period = 'Last 30 Days', customRange) => {
  if (!bookings || bookings.length === 0) return { thisWeek: 0, lastWeek: 0, change: 0 };

  let endDate = new Date();
  let periodDays = 7; // default: Last 7 Days

  if (period === 'CustomRange' && customRange?.start && customRange?.end) {
    const start = new Date(customRange.start);
    const end = new Date(customRange.end);
    end.setHours(23, 59, 59, 999);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    periodDays = diff;
    endDate = end;
  } else {
    if (period === 'Today') periodDays = 1;
    else if (period === 'Last 7 Days') periodDays = 7;
    else if (period === 'Last 30 Days') periodDays = 30;
    else if (period === 'Last 90 Days') periodDays = 90;
    else if (period === 'This Year') periodDays = 365;
  }

  const thisPeriodStart = new Date(endDate);
  thisPeriodStart.setDate(endDate.getDate() - periodDays);

  const lastPeriodStart = new Date(thisPeriodStart);
  lastPeriodStart.setDate(thisPeriodStart.getDate() - periodDays);

  const thisPeriod = bookings.filter(b => {
    const d = new Date(b.created_at);
    return d >= thisPeriodStart && d <= endDate;
  }).length;

  const lastPeriod = bookings.filter(b => {
    const d = new Date(b.created_at);
    return d >= lastPeriodStart && d < thisPeriodStart;
  }).length;

  const change = lastPeriod === 0
    ? (thisPeriod > 0 ? 100 : 0)
    : Math.round(((thisPeriod - lastPeriod) / lastPeriod) * 100);

  return { thisWeek: thisPeriod, lastWeek: lastPeriod, change };
};
// ── Chart options ──────────────────────────────────────────────────────────
const lineOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
    y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 }, color: '#94a3b8', stepSize: 1, precision: 0 }, beginAtZero: true },
  },
  elements: { line: { tension: 0.45 }, point: { radius: 4, hoverRadius: 6 } },
};

const barOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
    y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 }, color: '#94a3b8', stepSize: 1, precision: 0 }, beginAtZero: true },
  },
};

const pieOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { font: { size: 12 }, color: '#334155', padding: 16, usePointStyle: true } },
    tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed}` } },
  },
  cutout: '62%',
};

// ── Skeleton ───────────────────────────────────────────────────────────────
const Sk = ({ w = '80%', h = '14px', r = '4px' }) => (
  <div className="an-skel" style={{ width: w, height: h, borderRadius: r }} />
);

// ── Mini stat pill ─────────────────────────────────────────────────────────
function TrendPill({ value }) {
  const positive = value >= 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      background: positive ? '#dcfce7' : '#fee2e2',
      color: positive ? '#16a34a' : '#dc2626',
      borderRadius: '999px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: '700',
    }}>
      {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {Math.abs(value)}%
    </span>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Analytics() {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState('Last 30 Days');
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { period: dateFilter };
      if (dateFilter === 'CustomRange') {
        params.start_date = customRange.start;
        params.end_date = customRange.end;
      }
      const res = await api.get('/api/v1/admin/dashboard', { params });
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
  }, [dateFilter, customRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived values ────────────────────────────────────────────────────
  const totalBookings = rawData?.total_bookings ?? 0;
  const totalCalls = rawData?.total_calls ?? 0;
  const recentBookings = Array.isArray(rawData?.recent_bookings) ? rawData.recent_bookings : [];

  const confirmedCount = recentBookings.filter(b => b.status === 'CONFIRMED').length;
  const pendingCount = recentBookings.filter(b => b.status === 'PENDING_PAYMENT').length;
  const cancelledCount = recentBookings.filter(b => b.status === 'CANCELLED').length;
  const expiredCount = recentBookings.filter(b => b.status === 'EXPIRED').length;
  const initiatedCount = recentBookings.filter(b => b.status === 'INITIATED').length;

  const conversionRate = recentBookings.length > 0
    ? Math.round((confirmedCount / recentBookings.length) * 100)
    : 0;

  const cancellationRate = recentBookings.length > 0
    ? Math.round((cancelledCount / recentBookings.length) * 100)
    : 0;

  const weeklyComparison = buildWeeklyComparison(
    recentBookings,
    dateFilter,
    customRange
  );
  const bookingTrends = buildBookingTrends(recentBookings);
  const statusBreakdown = buildStatusBreakdown(recentBookings);
  const hourlyVolume = buildHourlyVolume(recentBookings);

  // ── Chart datasets ────────────────────────────────────────────────────
  const bookingTrendsData = {
    labels: bookingTrends.map(t => t.label),
    datasets: [{
      label: 'Bookings',
      data: bookingTrends.map(t => t.value),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37,99,235,0.08)',
      fill: true,
      pointBackgroundColor: '#2563eb',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    }],
  };

  const statusLabels = Object.keys(statusBreakdown);
  const bookingSourceData = {
    labels: statusLabels.map(s => STATUS_CONFIG[s]?.label ?? s),
    datasets: [{
      data: statusLabels.map(s => statusBreakdown[s]),
      backgroundColor: statusLabels.map(s => STATUS_CONFIG[s]?.chartColor ?? '#cbd5e1'),
      borderWidth: 0,
    }],
  };

  const hourlyVolumeData = {
    labels: hourlyVolume.map(h => h.label),
    datasets: [{
      label: 'Bookings',
      data: hourlyVolume.map(h => h.count),
      backgroundColor: 'rgba(37,99,235,0.75)',
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  // Weekly comparison bar
  const weeklyCompData = {
    labels: ['Last Week', 'This Week'],
    datasets: [{
      data: [weeklyComparison.lastWeek, weeklyComparison.thisWeek],
      backgroundColor: ['rgba(148,163,184,0.6)', 'rgba(37,99,235,0.8)'],
      borderRadius: 8,
      borderSkipped: false,
    }],
  };
  const weeklyCompOptions = {
    ...barOptions,
    plugins: { ...barOptions.plugins, legend: { display: false } },
    scales: {
      ...barOptions.scales,
      y: { ...barOptions.scales.y, ticks: { ...barOptions.scales.y.ticks, stepSize: 1 } },
    },
  };

  // ── Stat cards ────────────────────────────────────────────────────────
  const statCards = [
    { label: 'Total Bookings', value: totalBookings, icon: Calendar, color: '#2563eb', sub: `${recentBookings.length} recent` },
    { label: 'Total Calls', value: totalCalls, icon: Phone, color: '#7c3aed', sub: 'voice interactions' },
    { label: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp, color: '#10b981', sub: `${confirmedCount} confirmed` },
    { label: 'Cancellation Rate', value: `${cancellationRate}%`, icon: XCircle, color: '#ef4444', sub: `${cancelledCount} cancelled` },
    { label: 'Pending Payment', value: pendingCount, icon: Clock, color: '#f59e0b', sub: 'awaiting payment' },
    { label: 'Initiated', value: initiatedCount, icon: Activity, color: '#6366f1', sub: 'in progress' },
  ];

  // ── Export ────────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = ['Booking ID', 'Customer', 'Phone', 'Status', 'Created At'];
    const rows = recentBookings.map(b => [
      b.public_tracking_id ?? '—',
      b.customer_name ?? 'Guest',
      b.customer_phone ?? '—',
      b.status ?? '—',
      b.created_at ? new Date(b.created_at).toLocaleString() : '—',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `analytics-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const filtered = recentBookings.filter(b => {
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
              type="text" placeholder="Search by name, phone, booking ID or status…"
              className="search-input" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                padding: '0.625rem 1rem 0.625rem 2.75rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                backgroundColor: 'white',
                transition: 'all 0.2s',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="an-refresh-btn" onClick={fetchData} disabled={loading} title="Refresh">
              <RefreshCw size={15} className={loading ? 'spinning-icon' : ''} />
            </button>
            <button className="export-btn" onClick={handleExport} disabled={loading}>
              <Download size={15} className="export-icon" />
              Export CSV
            </button>
          </div>
        </header>

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
            <h1 className="dashboard-title">Dashboard Analytics</h1>
            {lastSync && <p className="an-last-sync" style={{ textAlign: 'left' }}>Updated {lastSync.toLocaleTimeString()}</p>}
          </div>
          {/* <div style={{ position: 'relative' }}>
            <button className="date-filter-btn" onClick={() => setShowFilter(v => !v)}>
              <Calendar size={15} style={{ marginRight: '8px' }} />
              <span>{dateFilter === 'CustomRange' ? 'Custom Range' : dateFilter}</span>
              <ChevronDown size={15} className="chevron-icon" style={{ transform: showFilter ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: '8px' }} />
            </button>
            {showFilter && (
              <div className="an-date-dropdown" style={{ width: '220px', padding: '8px' }}>
                {DATE_OPTIONS.map(opt => (
                  <button key={opt} className={`an-date-option ${dateFilter === opt ? 'active' : ''}`}
                    onClick={() => { setDateFilter(opt); if (opt !== 'CustomRange') setShowFilter(false); }}>
                    {opt}
                  </button>
                ))}
                <button className={`an-date-option ${dateFilter === 'CustomRange' ? 'active' : ''}`}
                  onClick={() => setDateFilter('CustomRange')}>
                  Custom Range
                </button>

                {dateFilter === 'CustomRange' && (
                  <div style={{ marginTop: '10px', padding: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Start Date</label>
                      <input
                        type="date"
                        value={customRange.start}
                        onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                        style={{ width: '100%', padding: '4px', fontSize: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#64748b' }}>End Date</label>
                      <input
                        type="date"
                        value={customRange.end}
                        onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                        style={{ width: '100%', padding: '4px', fontSize: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                      />
                    </div>
                    <button
                      onClick={() => setShowFilter(false)}
                      style={{ marginTop: '5px', background: '#2563eb', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Apply Range
                    </button>
                  </div>
                )}
              </div>
            )}
          </div> */}
        </div>

        {/* ── 6 Stat cards ── */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          {statCards.map(({ label, value, icon: Icon, color, sub }) => (
            <div className="stat-card an-stat-card" key={label}>
              <div className="an-stat-top">
                <div className="an-stat-icon-wrap" style={{ color }}>
                  <Icon size={18} strokeWidth={2} />
                </div>
                {!loading && label === 'Total Bookings' && (
                  <TrendPill value={weeklyComparison.change} />
                )}
              </div>
              {loading
                ? <Sk w="60%" h="28px" />
                : <div className="stat-value an-stat-value">{value}</div>}
              <div className="stat-label an-stat-label">{label}</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{sub}</div>
              <div className="stat-progress an-stat-progress">
                <div className="stat-progress-bar an-stat-bar"
                  style={{ width: loading ? '0%' : '60%', backgroundColor: color, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Summary row ── */}
        {!loading && recentBookings.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem', margin: '1rem 0',
          }}>
            {[
              { label: 'Confirmed', count: confirmedCount, total: recentBookings.length, color: '#10b981' },
              { label: 'Pending Payment', count: pendingCount, total: recentBookings.length, color: '#f59e0b' },
              { label: 'Cancelled', count: cancelledCount, total: recentBookings.length, color: '#ef4444' },
              { label: 'Expired', count: expiredCount, total: recentBookings.length, color: '#94a3b8' },
            ].map(({ label, count, total, color }) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={label} style={{
                  background: 'white', borderRadius: '12px', padding: '1rem 1.25rem',
                  border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>{label}</span>
                    <span style={{ fontSize: '0.8rem', color, fontWeight: '700' }}>{pct}%</span>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>{count}</div>
                  <div style={{
                    marginTop: '0.6rem', height: '4px', borderRadius: '2px',
                    background: '#f1f5f9', overflow: 'hidden',
                  }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Charts grid ── */}
        <div className="an-charts-grid">

          {/* Booking trends */}
          <div className="an-chart-card an-chart-wide">
            <div className="an-chart-header">
              <div>
                <h3 className="an-chart-title">Booking Trends</h3>
                <p className="an-chart-sub">Bookings created per day</p>
              </div>
            </div>
            <div className="an-chart-body">
              {loading ? <div className="an-chart-skeleton"><Sk w="100%" h="100%" r="8px" /></div>
                : bookingTrends.length > 0 ? <Line data={bookingTrendsData} options={lineOptions} />
                  : <div className="an-chart-empty">No trend data available.</div>}
            </div>
          </div>

          {/* Status donut */}
          <div className="an-chart-card an-chart-narrow">
            <div className="an-chart-header">
              <div>
                <h3 className="an-chart-title">Booking Status</h3>
                <p className="an-chart-sub">Breakdown by status</p>
              </div>
            </div>
            <div className="an-chart-body an-donut-wrap">
              {loading ? <div className="an-chart-skeleton"><Sk w="160px" h="160px" r="50%" /></div>
                : statusLabels.length > 0 ? (
                  <>
                    <Pie data={bookingSourceData} options={pieOptions} />
                    <div className="an-donut-center">
                      <span className="an-donut-pct">{recentBookings.length}</span>
                      <span className="an-donut-label">total</span>
                    </div>
                  </>
                ) : <div className="an-chart-empty">No status data.</div>}
            </div>
            <div className="an-source-rows">
              {statusLabels.map(s => (
                <div className="an-source-row" key={s}>
                  <span className="an-source-dot" style={{ background: STATUS_CONFIG[s]?.chartColor ?? '#cbd5e1' }} />
                  <span className="an-source-name">{STATUS_CONFIG[s]?.label ?? s}</span>
                  {loading ? <Sk w="20px" h="12px" /> : <span className="an-source-pct">{statusBreakdown[s]}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Hourly volume */}
          <div className="an-chart-card an-chart-wide">
            <div className="an-chart-header">
              <div>
                <h3 className="an-chart-title">Booking Activity by Hour</h3>
                <p className="an-chart-sub">When bookings are created throughout the day</p>
              </div>
            </div>
            <div className="an-chart-body">
              {loading ? <div className="an-chart-skeleton"><Sk w="100%" h="100%" r="8px" /></div>
                : hourlyVolume.length > 0 ? <Bar data={hourlyVolumeData} options={barOptions} />
                  : <div className="an-chart-empty">No activity data available.</div>}
            </div>
          </div>

          {/* Week-over-week comparison */}
          {/* Week-over-week / period comparison */}
          <div className="an-chart-card an-chart-narrow">
            <div className="an-chart-header">
              <div>
                <h3 className="an-chart-title">
                  {dateFilter === 'Today' ? 'Today vs Yesterday'
                    : dateFilter === 'Last 7 Days' ? 'This Week vs Last Week'
                      : dateFilter === 'Last 30 Days' ? 'This Month vs Last Month'
                        : dateFilter === 'Last 90 Days' ? 'This Quarter vs Last Quarter'
                          : dateFilter === 'This Year' ? 'This Year vs Last Year'
                            : 'Current vs Previous Period'}
                </h3>
                <p className="an-chart-sub">
                  {dateFilter === 'CustomRange'
                    ? `${customRange.start || '—'} → ${customRange.end || '—'}`
                    : 'Comparing current period to previous'}
                </p>
              </div>
              {!loading && <TrendPill value={weeklyComparison.change} />}
            </div>

            <div className="an-chart-body">
              {loading
                ? <div className="an-chart-skeleton"><Sk w="100%" h="100%" r="8px" /></div>
                : <Bar
                  data={{
                    labels: [
                      dateFilter === 'Today' ? 'Yesterday'
                        : dateFilter === 'Last 7 Days' ? 'Last Week'
                          : dateFilter === 'Last 30 Days' ? 'Last Month'
                            : dateFilter === 'Last 90 Days' ? 'Last Quarter'
                              : dateFilter === 'This Year' ? 'Last Year'
                                : 'Previous Period',
                      dateFilter === 'Today' ? 'Today'
                        : dateFilter === 'Last 7 Days' ? 'This Week'
                          : dateFilter === 'Last 30 Days' ? 'This Month'
                            : dateFilter === 'Last 90 Days' ? 'This Quarter'
                              : dateFilter === 'This Year' ? 'This Year'
                                : 'Current Period',
                    ],
                    datasets: [{
                      data: [weeklyComparison.lastWeek, weeklyComparison.thisWeek],
                      backgroundColor: ['rgba(148,163,184,0.6)', 'rgba(37,99,235,0.8)'],
                      borderRadius: 8,
                      borderSkipped: false,
                    }],
                  }}
                  options={weeklyCompOptions}
                />
              }
            </div>

            {!loading && (
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '0.75rem', fontSize: '0.8rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#64748b' }}>
                    {weeklyComparison.lastWeek}
                  </div>
                  <div style={{ color: '#94a3b8' }}>
                    {dateFilter === 'Today' ? 'Yesterday'
                      : dateFilter === 'Last 7 Days' ? 'Last week'
                        : dateFilter === 'Last 30 Days' ? 'Last month'
                          : dateFilter === 'Last 90 Days' ? 'Last quarter'
                            : dateFilter === 'This Year' ? 'Last year'
                              : 'Previous'}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#2563eb' }}>
                    {weeklyComparison.thisWeek}
                  </div>
                  <div style={{ color: '#94a3b8' }}>
                    {dateFilter === 'Today' ? 'Today'
                      : dateFilter === 'Last 7 Days' ? 'This week'
                        : dateFilter === 'Last 30 Days' ? 'This month'
                          : dateFilter === 'Last 90 Days' ? 'This quarter'
                            : dateFilter === 'This Year' ? 'This year'
                              : 'Current'}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Recent Bookings table ── */}
        <div className="an-table-card">
          <div className="an-table-header">
            <div>
              <h3 className="an-chart-title">Recent Bookings</h3>
            </div>
            <p className="an-chart-sub" style={{ textAlign: 'left' }}>
              {loading ? 'Loading…' : `${filtered.length} booking${filtered.length !== 1 ? 's' : ''} shown`}
            </p>
          </div>

          <div className="an-table">
            <div className="an-table-head">
              <div className="an-th">Customer</div>
              <div className="an-th">Booking ID</div>
              <div className="an-th">Phone</div>
              <div className="an-th">Created At</div>
              <div className="an-th">Status</div>
            </div>

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
                const createdAt = b.created_at
                  ? new Date(b.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—';
                return (
                  <div className="an-table-row" key={b.id} style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="an-td">
                      <div className="an-avatar" style={{ backgroundColor: getAvatarColor(b.customer_name), color: 'white', fontWeight: 700 }}>
                        {getInitials(b.customer_name)}
                      </div>
                      <span className="an-name">{b.customer_name ?? 'Guest'}</span>
                    </div>
                    <div className="an-td">
                      <span style={{ fontFamily: 'monospace', fontWeight: '600', fontSize: '0.8rem', color: '#2563eb' }}>
                        {b.public_tracking_id ?? '—'}
                      </span>
                    </div>
                    <div className="an-td an-interaction">{b.customer_phone ?? '—'}</div>
                    <div className="an-td an-time">{createdAt}</div>
                    <div className="an-td">
                      <span style={{
                        backgroundColor: statusStyle.bg, color: statusStyle.color,
                        padding: '3px 10px', borderRadius: '999px',
                        fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap',
                      }}>
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