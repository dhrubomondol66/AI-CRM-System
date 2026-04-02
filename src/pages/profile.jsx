import React, { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import notification from "../assets/notification.png";
import email from "../assets/email.png";
import sms from "../assets/chatting.png";
import whatsappIcon from "../assets/whatsapp.png";
import "../assets/styles/adminProfile.css";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import Cookies from "js-cookie";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";
import { usePlatform } from "./platformContext";
import { usePlatform as usePlatformContact } from "./platformContact";

// ── API instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta?.env?.VITE_API_BASE_URL || "/",
  withCredentials: true,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get("access_token") || localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const AdminProfileDashboard = () => {
  const navigate = useNavigate();

  const { platformName, setPlatformName } = usePlatform();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  // At the top, update the import to get refreshPlatformContact too
  const { platformContact: ctxContact, setPlatformContact, refreshPlatformContact } = usePlatformContact();

  // Update initial profile state to use context values
  const [profile, setProfile] = useState({
    phone: ctxContact.contact_phone,
    email: ctxContact.contact_email,
    address: ctxContact.contact_address,
    company: platformName,
    timezone: 'Eastern Time (ET)',
  });

  // Replace handlePlatformContactsave with this:
  const handlePlatformContactsave = async (e) => {
    e.preventDefault();
    try {
      await api.put('/api/v1/admin/platform-contact', {
        contact_phone: profile.phone,
      contact_email: profile.email,
      contact_address: profile.address,
      updated_at: new Date().toISOString(),
    });
    // Update context immediately so landing page reflects change
    setPlatformContact({
      contact_phone: profile.phone,
      contact_email: profile.email,
      contact_address: profile.address,
    });
      // Also re-fetch from server to confirm
    await refreshPlatformContact();
    alert('Platform contact updated successfully!');
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? 'Failed to update platform contact. Please try again.';
      alert(msg);
    }
  };

  
  const [platformNameInput, setPlatformNameInput] = useState(platformName);
  const [platformNameSaving, setPlatformNameSaving] = useState(false);
  const [platformNameStatus, setPlatformNameStatus] = useState(null);
  const [platformNameError, setPlatformNameError] = useState("");

  const stats = useMemo(
    () => ({
      totalBusinesses: 12,
      activeBusinesses: 9,
      totalBookings: 1842,
      conversions: 312,
      recentInteractions: [
        { name: "Downtown Health Clinic", status: "Converted", time: "2m ago", interaction: "Booked appointment for 3:00 PM" },
        { name: "Sunset Restaurant", status: "Hands-off", time: "15m ago", interaction: "Customer asked for menu details" },
        { name: "Elite Fitness Center", status: "Converted", time: "1h ago", interaction: "Signed up for monthly membership" },
        { name: "City Dental Care", status: "Converted", time: "3h ago", interaction: "Rescheduled cleaning appointment" },
      ],
    }),
    []
  );

  const handleChange = (key, value) => setProfile((prev) => ({ ...prev, [key]: value }));
  const handleSave = (e) => { e.preventDefault(); alert("Profile updated successfully!"); };

  const handlePlatformNameSave = async (e) => {
    e.preventDefault();
    if (!platformNameInput.trim()) return;
    setPlatformNameSaving(true);
    setPlatformNameStatus(null);
    setPlatformNameError("");
    try {
      await api.put("/api/v1/admin/platform-name", {
        platform_name: platformNameInput.trim(),
      });
      setPlatformName(platformNameInput.trim());
      setPlatformNameStatus("success");
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        "Failed to update platform name. Please try again.";
      setPlatformNameError(msg);
      setPlatformNameStatus("error");
    } finally {
      setPlatformNameSaving(false);
      setTimeout(() => setPlatformNameStatus(null), 4000);
    }
  };

  const handlePlatformNameCancel = () => {
    setPlatformNameInput(platformName);
    setPlatformNameStatus(null);
    setPlatformNameError("");
  };

  return (
    <div className="admin-dashboard">
      <Sidebar />

      <div className="admin-topbar">
        <div>
          <h1 className="admin-title" style={{ color: 'black' }}>Admin Profile</h1>
          <p className="admin-subtitle" style={{ color: 'black' }}>Manage your account, preferences, and activity.</p>
        </div>
      </div>

      <div className="admin-grid">

        {/* ── Left Column ── */}
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div className="left-col" style={{ flex: 1 }}>
            <div className="cards profile-card">
              <div className="profile-header">
                <div className="avatar">{profile.name?.[0]?.toUpperCase() || "A"}</div>
                <div className="profile-meta">
                  <h2 className="profile-name">Admin</h2>
                  <p className="profile-role">{platformName}</p>
                  <div className="profile-badges" />
                </div>
              </div>

              <div className="profile-info">
                <div className="info-row">
                  <span className="info-label">Email</span>
                  <span className="info-value">{profile.email}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Phone</span>
                  <span className="info-value">{profile.phone}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Timezone</span>
                  <span className="info-value">{profile.timezone}</span>
                </div>
              </div>

              <div className="profile-actions">
                <Link to="/change-password">
                  <button className="btn-secondary w-full" type="button">
                    Change Password
                  </button>
                </Link>
              </div>

              {/* ── Change Platform Name ── */}
              <div style={{ marginTop: '1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', margin: 0, textAlign: 'center' }}>
                    Change Platform Name
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem', textAlign: 'center' }}>
                    Updates instantly across the sidebar, header, and all pages.
                  </p>
                </div>

                <form onSubmit={handlePlatformNameSave}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.4rem' }}>
                      Platform Name
                    </label>
                    <input
                      value={platformNameInput}
                      onChange={(e) => { setPlatformNameInput(e.target.value); setPlatformNameStatus(null); }}
                      placeholder="Enter the platform name"
                      required
                      disabled={platformNameSaving}
                      style={{
                        width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.875rem',
                        border: `1.5px solid ${platformNameStatus === 'error' ? '#fca5a5' : platformNameStatus === 'success' ? '#6ee7b7' : '#e2e8f0'}`,
                        borderRadius: '8px', outline: 'none',
                        background: platformNameSaving ? '#f1f5f9' : 'white',
                        color: '#1e293b', transition: 'border-color 0.2s', boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {platformNameStatus === 'success' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#059669', marginBottom: '0.75rem' }}>
                      <CheckCircle size={14} /> Platform name updated everywhere!
                    </div>
                  )}
                  {platformNameStatus === 'error' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#dc2626', marginBottom: '0.75rem' }}>
                      <AlertCircle size={14} /> {platformNameError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={handlePlatformNameCancel} disabled={platformNameSaving}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: '600', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: 'white', color: '#374151', cursor: platformNameSaving ? 'not-allowed' : 'pointer', opacity: platformNameSaving ? 0.6 : 1 }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={!platformNameInput.trim() || platformNameSaving}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: '600', borderRadius: '8px', border: 'none', background: !platformNameInput.trim() || platformNameSaving ? '#93c5fd' : '#2563eb', color: 'white', cursor: !platformNameInput.trim() || platformNameSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'background 0.2s' }}>
                      {platformNameSaving && <Loader size={13} className="spinning" />}
                      {platformNameSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)', flex: 0.4 }}>
            <h2 style={{ textAlign: 'center', color: 'black' }}>Admin Personal Details</h2>
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem', textAlign: 'center' }}>
                    Updates instantly in homepage.
                  </p>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'black' }}>Phone</label>
            <input
              type="text"
              value={profile.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '15px',
                fontSize: '16px',
                borderRadius: '5px',
                border: '1px solid #ddd',
                backgroundColor: 'white',
                cursor: 'text',
                color: 'black'
              }}
              />

            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'black' }}>Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => handleChange('email', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '15px',
                fontSize: '16px',
                borderRadius: '5px',
                border: '1px solid #ddd',
                backgroundColor: 'white',
                cursor: 'text',
                color: 'black'
              }}
              placeholder="Enter your email"
            />

            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'black' }}>Address</label>
            <input
              type="text"
              value={profile.address}
              onChange={(e) => handleChange('address', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '20px',
                fontSize: '16px',
                borderRadius: '5px',
                border: '1px solid #ddd',
                backgroundColor: 'white',
                cursor: 'text',
                color: 'black'
              }}
              placeholder="Enter your address"
            />

            <button
              onClick={handlePlatformContactsave}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease',
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#45a049'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#4CAF50'}
            >
              Update
            </button>
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="right-col">
          <section className="section">
            <h2 className="section-title">
              <img src={notification} alt="notification" className="notification-icon" />
              Notification Channels
            </h2>
            <div className="section-content">
              <div className="input-group toggle-group">
                <label><img src={email} alt="email" className="pop-icon" />Email Alerts</label>
                <label className="toggle-switch">
                  <input type="checkbox" checked={emailAlerts} onChange={() => setEmailAlerts(!emailAlerts)} />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="input-group toggle-group">
                <label><img src={sms} alt="sms" className="sms-icon" />SMS Alerts</label>
                <label className="toggle-switch">
                  <input type="checkbox" checked={smsAlerts} onChange={() => setSmsAlerts(!smsAlerts)} />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="input-group toggle-group">
                <label><img src={whatsappIcon} alt="whatsapp" className="whatsapp-icon" />WhatsApp</label>
                <label className="toggle-switch">
                  <input type="checkbox" checked={whatsapp} onChange={() => setWhatsapp(!whatsapp)} />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
};

export default AdminProfileDashboard;