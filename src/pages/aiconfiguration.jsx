import React, { useState, useEffect, useCallback } from 'react';
import { Play, AlertCircle, CheckCircle, Loader, RefreshCw } from 'lucide-react';
import '../assets/styles/aiconfigaration.css';
import Sidebar from '../components/Sidebar.jsx';
import Cookies from 'js-cookie';
import axios from 'axios';

// ── API Instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta?.env?.VITE_API_BASE_URL || 'https://reservation-xynh.onrender.com',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token') || localStorage.getItem('access_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// ── Response normalizer ────────────────────────────────────────────────────
const extractList = (data) => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  if (typeof data === 'object' && data !== null) {
    const key = Object.keys(data).find((k) => Array.isArray(data[k]));
    if (key) return data[key];
  }
  return [];
};

// ── Error formatter ────────────────────────────────────────────────────────
const httpErrorMsg = (err) => {
  const status = err?.response?.status;
  const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.response?.data?.detail;
  if (!err.response) return 'Network error — cannot reach the server.';
  if (status === 401) return '401 Unauthorized — session expired. Please log in again.';
  if (status === 403) return '403 Forbidden — your account may not have admin privileges.';
  if (status === 404) return '404 Not Found — this endpoint does not exist on the server.';
  if (status >= 500) return `${status} Server Error — check backend logs.`;
  return msg ?? `Unexpected error (${status}).`;
};

const VOICES = [
  { name: 'Sophia', gender: 'Female', accent: 'American' },
  { name: 'James', gender: 'Male', accent: 'British' },
];

const TIMEZONES = [
  'Eastern Time (ET)',
  'Central Time (CT)',
  'Mountain Time (MT)',
  'Pacific Time (PT)',
];

export default function AIConfiguration() {
  const [selectedVoice, setSelectedVoice] = useState('Sophia');
  const [timezone, setTimezone] = useState('Eastern Time (ET)');
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('17:00');
  const [price, setPrice] = useState('');
  const [prompt, setPrompt] = useState('');
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [permissions, setPermissions] = useState({
    cancelBookings: false,
    rescheduleBookings: true,
    mentionPromotions: false,
  });

  // allow_multiple_bookings is its own top-level field — kept separate from permissions
  const [allowMultipleBookings, setAllowMultipleBookings] = useState(false);
  const [multipleBookingsLoading, setMultipleBookingsLoading] = useState(false);
  const [multipleBookingsError, setMultipleBookingsError] = useState(null);

  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [configuredBusinesses, setConfiguredBusinesses] = useState(new Set());
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');

  const [bizLoading, setBizLoading] = useState(false);
  const [bizError, setBizError] = useState(null);
  const [svcLoading, setSvcLoading] = useState(false);
  const [svcError, setSvcError] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSavedConfig, setLastSavedConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('lastSavedConfig');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [isServiceLoaded, setIsServiceLoaded] = useState(false);

  const applyServiceConfig = useCallback((svc) => {
    if (!svc) return;
    setIsServiceLoaded(true);
    if (svc.voice) setSelectedVoice(svc.voice);
    setTimezone(svc.timezone || 'Eastern Time (ET)');
    setOpeningTime(svc.open_time || svc.opening_time || '09:00');
    setClosingTime(svc.close_time || svc.closing_time || '17:00');
    setPrice(svc.price || svc.base_price || '');
    if (Array.isArray(svc.prompts)) setSavedPrompts(svc.prompts);
    if (svc.permissions) setPermissions((p) => ({ ...p, ...svc.permissions }));
    // Read allow_multiple_bookings directly from the top-level service field
    setAllowMultipleBookings(svc.allow_multiple_bookings === true);
  }, []);

  const fetchBusinesses = useCallback(async () => {
    setBizLoading(true);
    setBizError(null);
    try {
      const res = await api.get('/api/v1/admin/businesses/');
      const list = extractList(res.data);
      if (list.length === 0) { setBizError('No businesses found. Please add a business first.'); return; }
      setBusinesses(list.map((b) => ({
        id: String(b.id ?? b.bid ?? b.business_id ?? b._id ?? ''),
        name: b.name ?? b.business_name ?? b.title ?? '(Unnamed)',
      })));
    } catch (err) {
      setBizError(httpErrorMsg(err));
    } finally {
      setBizLoading(false);
    }
  }, []);

  const fetchServices = useCallback(async (bid) => {
    if (!bid) { setServices([]); setSelectedService(''); return; }
    setSvcLoading(true);
    setSvcError(null);
    setSelectedService('');
    setIsServiceLoaded(false);
    try {
      const res = await api.get(`/api/v1/admin/businesses/${bid}/services`);
      const list = extractList(res.data);
      if (list.length === 0) {
        setSvcError('No services found for this business. Add services in the Add Business page.');
        setServices([]);
        return;
      }
      const newConfigured = new Set();
      const mapped = list.map((s) => {
        const sid = String(s.id ?? s._id ?? s.service_id ?? '');
        const hasConfig = !!(s.prompts?.length || s.voice || s.timezone || s.permissions);
        if (hasConfig) newConfigured.add(bid);
        return { ...s, id: sid, name: s.name ?? s.service_name ?? s.title ?? '(Unnamed)', slug: s.slug ?? '' };
      });
      setServices(mapped);
      setConfiguredBusinesses((prev) => new Set([...prev, ...newConfigured]));
    } catch (err) {
      setSvcError(httpErrorMsg(err));
    } finally {
      setSvcLoading(false);
    }
  }, []);

  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);

  useEffect(() => {
    fetchServices(selectedBusinessId);
    setSelectedService('');
    setIsServiceLoaded(false);
    resetForm();
  }, [selectedBusinessId, fetchServices]);

  useEffect(() => {
    const svc = services.find((s) => s.id === selectedService);
    if (svc) applyServiceConfig(svc);
    else resetForm();
  }, [selectedService, services, applyServiceConfig]);

  const resetForm = () => {
    setSelectedVoice('Sophia');
    setTimezone('Eastern Time (ET)');
    setOpeningTime('09:00');
    setClosingTime('17:00');
    setPrice('');
    setSavedPrompts([]);
    setPrompt('');
    setPermissions({ cancelBookings: false, rescheduleBookings: true, mentionPromotions: false });
    setAllowMultipleBookings(false);
    setMultipleBookingsError(null);
    setIsServiceLoaded(false);
  };

  const addPrompt = () => {
    const trimmed = prompt.trim();
    if (!trimmed || savedPrompts.includes(trimmed)) return;
    setSavedPrompts((prev) => [...prev, trimmed]);
    setPrompt('');
  };

  const removePrompt = (p) => setSavedPrompts((prev) => prev.filter((x) => x !== p));
  const handlePermissionToggle = (key) => setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Toggle allow_multiple_bookings — immediately PATCHes the backend ──────
  const handleMultipleBookingsToggle = async () => {
    if (!selectedBusinessId || !selectedService) return;

    const newValue = !allowMultipleBookings;

    // Optimistic UI update
    setAllowMultipleBookings(newValue);
    setMultipleBookingsLoading(true);
    setMultipleBookingsError(null);

    try {
      await api.patch(
        `/api/v1/admin/businesses/${selectedBusinessId}/services/${selectedService}`,
        { allow_multiple_bookings: newValue }
      );
    } catch (err) {
      // Revert on failure
      setAllowMultipleBookings(!newValue);
      setMultipleBookingsError(httpErrorMsg(err));
    } finally {
      setMultipleBookingsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedBusinessId || !selectedService) {
      setSaveError('Please select both a business and a service to configure.');
      return;
    }
    let finalPrompts = [...savedPrompts];
    const currentPrompt = prompt.trim();
    if (currentPrompt && !finalPrompts.includes(currentPrompt)) {
      finalPrompts.push(currentPrompt);
      setSavedPrompts(finalPrompts);
      setPrompt('');
    }
    if (finalPrompts.length === 0) {
      setSaveError('Please add at least one prompt instruction.');
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    const selectedSvc = services.find((s) => s.id === selectedService);
    const payload = {
      service_name: selectedSvc?.name ?? '',
      slug: selectedSvc?.slug ?? selectedSvc?.name?.toLowerCase().replace(/\s+/g, '-') ?? '',
      timezone,
      description: finalPrompts.join('\n') || null,
      open_time: openingTime || null,
      close_time: closingTime,
      base_price: parseFloat(price) || 0,
      currency: 'USD',
      voice: selectedVoice,
      prompts: finalPrompts,
      permissions,
      price: parseFloat(price) || 0,
      duration_minutes: 30,
    };

    try {
      await api.patch(`/api/v1/admin/businesses/${selectedBusinessId}/services/${selectedService}`, payload);
      setSaveSuccess(true);
      const newConfig = {
        businessName: businesses.find((b) => b.id === selectedBusinessId)?.name ?? 'Unknown',
        serviceName: selectedSvc?.name ?? 'Unknown Service',
        voice: selectedVoice,
        hours: `${openingTime} – ${closingTime} (${timezone})`,
        price: parseFloat(price) || 0,
        promptsCount: finalPrompts.length,
        permissions: Object.keys(permissions).filter((k) => permissions[k]).map((k) => k.replace(/([A-Z])/g, ' $1').trim()),
      };
      setLastSavedConfig(newConfig);
      try { localStorage.setItem('lastSavedConfig', JSON.stringify(newConfig)); } catch { /* non-critical */ }
      fetchServices(selectedBusinessId);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setSaveError(httpErrorMsg(err));
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="ai-config-container">
      <Sidebar />
      <main className="ai-config-main-content">
        <header className="ai-config-header">
          <div>
            <h1 className="ai-config-page-title">AI Configuration</h1>
            <p className="ai-config-page-subtitle">Fine-tune your AI assistant's personality and operational boundaries.</p>
          </div>
          <button className="ai-config-save-btn" onClick={handleSave} disabled={saveLoading}>
            {saveLoading ? <><Loader size={14} className="spinning-icon" /> Saving...</> : 'Save Changes'}
          </button>
        </header>

        {saveSuccess && (
          <div className="config-banner config-banner--success" role="status">
            <CheckCircle size={16} /><span>Configuration saved successfully!</span>
            <button className="banner-close" onClick={() => setSaveSuccess(false)}>&times;</button>
          </div>
        )}
        {saveError && (
          <div className="config-banner config-banner--error" role="alert">
            <AlertCircle size={16} /><span>{saveError}</span>
            <button className="banner-close" onClick={() => setSaveError(null)}>&times;</button>
          </div>
        )}

        {lastSavedConfig && (
          <section className="ai-config-section">
            <div className="business-card" style={{ borderLeft: '4px solid #10b981' }}>
              <div className="business-card-head">
                <div className="business-card-title-group">
                  <h3 className="business-card-title">{lastSavedConfig.businessName}</h3>
                  <p className="business-card-sub" style={{ background: '#ecfdf5', color: '#065f46' }}>
                    <CheckCircle size={14} style={{ marginRight: '4px' }} />
                    Active AI Profile: {lastSavedConfig.serviceName}
                  </p>
                </div>
                <button
                  className="banner-close"
                  onClick={() => {
                    setLastSavedConfig(null);
                    try { localStorage.removeItem('lastSavedConfig'); } catch { /* non-critical */ }
                  }}
                  style={{ color: '#9ca3af', padding: '0.5rem' }}
                >
                  &times;
                </button>
              </div>
              <div className="business-card-content">
                <div className="business-card-info">
                  <div className="info-row"><span className="info-label">Voice:</span><span className="info-value"><strong>{lastSavedConfig.voice}</strong></span></div>
                  <div className="info-row"><span className="info-label">Hours:</span><span className="info-value">{lastSavedConfig.hours}</span></div>
                  <div className="info-row"><span className="info-label">Price:</span><span className="info-value">{lastSavedConfig.price}</span></div>
                  <div className="info-row"><span className="info-label">AI Logic:</span><span className="info-value">{lastSavedConfig.promptsCount} prompt(s) configured</span></div>
                  <div className="info-row">
                    <span className="info-label">Capabilities:</span>
                    <span className="info-value">{lastSavedConfig.permissions.length > 0 ? lastSavedConfig.permissions.join(', ') : 'No advanced permissions granted'}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="ai-config-section">
          <div className="section-label-row" style={{ marginBottom: '1.5rem' }}>
            <h2 className="ai-config-section-title" style={{ margin: 0 }}>Select Business Profile</h2>
            <button className="icon-retry-btn" onClick={fetchBusinesses} disabled={bizLoading} title="Refresh" style={{ backgroundColor: 'transparent', color: 'gray' }}>
              <RefreshCw size={16} className={bizLoading ? 'spinning-icon' : ''} />
            </button>
          </div>
          {bizError && <div className="field-error-box" style={{ marginBottom: '1.5rem' }}><AlertCircle size={14} /><span>{bizError}</span></div>}
          {bizLoading && (
            <div className="service-cards-grid">
              {[1, 2, 3].map((i) => <div key={i} className="service-card service-card--skeleton"><div className="skel skel-svc-name" /></div>)}
            </div>
          )}
          {!bizLoading && businesses.length > 0 && (
            <div className="service-cards-grid">
              {businesses.map((b) => (
                <div
                  key={b.id}
                  className={`service-card ${selectedBusinessId === b.id ? 'service-card--selected' : ''}`}
                  onClick={() => setSelectedBusinessId(b.id)}
                  style={{ cursor: 'pointer', gap: '0.5rem' }}
                >
                  {selectedBusinessId === b.id && <span className="service-card-check"><CheckCircle size={18} /></span>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: '22px' }}>
                    <h3 className="service-card-name" style={{ margin: 0 }}>{b.name}</h3>
                  </div>
                  <div style={{ marginTop: '0.75rem' }}>
                    {configuredBusinesses.has(b.id)
                      ? <span className="svc-selected-badge" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7' }}>✓ CONFIGURED</span>
                      : <span className="svc-selected-badge" style={{ backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>NOT SET</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {selectedBusinessId ? (
          <>
            <section className="ai-config-section">
              <div className="ai-config-select-services svc-panel">
                <div className="section-label-row">
                  <h2 className="select-services-title">
                    Select Service
                    {selectedService && (
                      <span className="svc-selected-badge">✓ {services.find((s) => s.id === selectedService)?.name}</span>
                    )}
                  </h2>
                  <button
                    className="icon-retry-btn"
                    onClick={() => fetchServices(selectedBusinessId)}
                    disabled={svcLoading}
                    title="Refresh services"
                    style={{ backgroundColor: 'transparent', color: 'gray' }}
                  >
                    <RefreshCw size={14} className={svcLoading ? 'spinning-icon' : ''} />
                  </button>
                </div>

                {svcError && (
                  <div className="field-error-box"><AlertCircle size={13} /><span>{svcError}</span></div>
                )}

                {svcLoading && (
                  <div className="service-cards-grid">
                    {[1, 2, 3].map((i) => <div key={i} className="service-card service-card--skeleton"><div className="skel skel-svc-name" /></div>)}
                  </div>
                )}

                {!svcLoading && services.length > 0 && (
                  <div className="service-cards-grid">
                    {services.map((s) => (
                      <div
                        key={s.id}
                        className={`service-card ${selectedService === s.id ? 'service-card--selected' : ''}`}
                        onClick={() => setSelectedService((prev) => (prev === s.id ? '' : s.id))}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setSelectedService((prev) => (prev === s.id ? '' : s.id))}
                      >
                        <span className="service-card-check">{selectedService === s.id ? '✓' : ''}</span>
                        <span className="service-card-name">{s.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {!svcLoading && services.length === 0 && !svcError && (
                  <p className="svc-empty-text">
                    No services found. Add services in the <a href="/addBusiness" className="svc-link">Add Business</a> page.
                  </p>
                )}
              </div>

              <div className="ai-config-prompt">
                <div className="ai-config-prompt-content">
                  <h2 className="ai-config-prompt-title">Prompt</h2>
                  <div className="ai-config-prompt-input">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Enter a prompt instruction and click Add Prompt…"
                      onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addPrompt(); }}
                    />
                  </div>
                  <p className="prompt-hint">Ctrl + Enter to add quickly</p>
                  <button
                    className="ai-config-save-btn"
                    style={{ marginTop: '0.75rem' }}
                    onClick={addPrompt}
                    disabled={!prompt.trim()}
                  >
                    Add Prompt
                  </button>
                </div>
                {savedPrompts.length > 0 && (
                  <div className="saved-prompts editable">
                    {savedPrompts.map((p, i) => (
                      <button key={i} type="button" className="chip chip-removable" onClick={() => removePrompt(p)} title="Remove">
                        {p} ✕
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <h2 className="ai-config-section-titleB">Business Hours</h2>
              <div className="form-group">
                <label>Timezone *</label>
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Opening Time *</label>
                <input type="time" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Closing Time *</label>
                <input type="time" value={closingTime} onChange={(e) => setClosingTime(e.target.value)} />
              </div>

              <h2 className="ai-config-section-title">Price</h2>
              <div className="form-group">
                <label>Price *</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$USD" />
              </div>
            </section>

            <section className="ai-config-section">
              <h2 className="ai-config-section-title">Select Voice</h2>
              <div className="voice-grid">
                {VOICES.map((voice) => (
                  <div
                    key={voice.name}
                    className={`voice-card ${selectedVoice === voice.name ? 'selected' : ''}`}
                    onClick={() => setSelectedVoice(voice.name)}
                  >
                    <div className="voice-card-content">
                      <h3 className="voice-name">{voice.name}</h3>
                      <div className="voice-details">
                        <span className="voice-detail">{voice.gender}</span>
                        <span className="voice-detail-separator">•</span>
                        <span className="voice-detail">{voice.accent}</span>
                      </div>
                      <button className="voice-preview-btn" onClick={(e) => e.stopPropagation()}>
                        <Play size={14} className="voice-preview-icon" />Preview
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="ai-config-section">
              <h2 className="ai-config-section-title">Permissions</h2>
              <div className="permissions-list">

                {/* Standard permission toggles */}
                {[
                  { key: 'cancelBookings',     title: 'Cancel Bookings',     desc: 'AI can process cancellations' },
                  { key: 'rescheduleBookings', title: 'Reschedule Bookings', desc: 'AI can move appointments' },
                ].map(({ key, title, desc }) => (
                  <div className="permission-item" key={key}>
                    <div className="permission-info">
                      <h3 className="permission-title">{title}</h3>
                      <p className="permission-description">{desc}</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={permissions[key]} onChange={() => handlePermissionToggle(key)} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}

                {/* ── Allow Multiple Bookings — PATCHes immediately on click ── */}
                <div className="permission-item">
                  <div className="permission-info">
                    <h3 className="permission-title">Allow Multiple Bookings</h3>
                    <p className="permission-description">Multiple users can book the same slot</p>
                    {multipleBookingsError && (
                      <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                        {multipleBookingsError}
                      </p>
                    )}
                  </div>

                  {/* Pill toggle — blue = true, grey = false */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={allowMultipleBookings}
                    onClick={handleMultipleBookingsToggle}
                    disabled={multipleBookingsLoading || !selectedService}
                    title={!selectedService ? 'Select a service first' : undefined}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      width: '48px',
                      height: '26px',
                      borderRadius: '9999px',
                      border: 'none',
                      cursor: (!selectedService || multipleBookingsLoading) ? 'not-allowed' : 'pointer',
                      padding: '3px',
                      transition: 'background-color 0.25s ease',
                      backgroundColor: allowMultipleBookings ? '#3b82f6' : '#d1d5db',
                      opacity: (!selectedService || multipleBookingsLoading) ? 0.6 : 1,
                      flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    {/* Spinning loader overlaid when saving */}
                    {multipleBookingsLoading && (
                      <span style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Loader size={14} className="spinning-icon" style={{ color: '#fff' }} />
                      </span>
                    )}
                    <span
                      style={{
                        display: 'block',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        transition: 'transform 0.25s ease',
                        transform: allowMultipleBookings ? 'translateX(22px)' : 'translateX(0px)',
                        opacity: multipleBookingsLoading ? 0 : 1,
                      }}
                    />
                  </button>
                </div>

              </div>
            </section>
          </>
        ) : (
          <div className="ai-config-section" style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            <p>Please select a business above to configure its AI settings.</p>
          </div>
        )}
      </main>
    </div>
  );
}