/**
 * QARI 24/7 — Admin Dashboard
 *
 * In a real React project, each section below maps to its own file:
 *
 * src/
 * ├── tokens.js
 * ├── auth/
 * │   ├── Login.jsx
 * │   ├── ForgotPassword.jsx
 * │   └── ResetPassword.jsx
 * ├── components/
 * │   ├── QariLogo.jsx
 * │   ├── Sidebar.jsx
 * │   └── TopBar.jsx
 * └── pages/
 *     ├── Overview.jsx
 *     ├── UserManagement.jsx
 *     └── ProfileSetting.jsx
 */

import { useState, useRef } from "react";
import {
  Mail, Lock, Eye, EyeOff, Bell, LayoutDashboard, Users,
  Settings, LogOut, Search, Filter, MoreVertical,
  ChevronLeft, ChevronRight, Edit2, ArrowLeft, CheckCircle,
  TrendingUp, DollarSign, UserCheck, UserX
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid
} from "recharts";

/* ================================================================
   TOKENS  (src/tokens.js)
   ================================================================ */
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #f0f4f1; color: #1a2a1e; min-height: 100vh; }
  .app-root { display: flex; min-height: 100vh; }
  .main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
  .page-content { flex: 1; overflow-y: auto; padding: 28px 32px; }
  .page-header { margin-bottom: 24px; }
  .page-title { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 600; color: #1a2a1e; }
  .page-subtitle { font-size: 13px; color: #5a6b5e; margin-top: 2px; }
  .card { background: #ffffff; border-radius: 14px; border: 1px solid #e8eae8; padding: 22px; }
  .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .card-title { font-size: 15px; font-weight: 600; color: #1a2a1e; }
  .period-select { font-size: 12px; color: #5a6b5e; border: 1px solid #e8eae8; border-radius: 6px; padding: 4px 10px; background: #ffffff; cursor: pointer; font-family: 'DM Sans', sans-serif; }
  .badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge.premium { background: rgba(201,168,76,0.15); color: #c9a84c; }
  .badge.basic { background: #f0f4f1; color: #5a6b5e; }

  /* ── Auth shared ── */
  .auth-bg { min-height:100vh; display:flex; align-items:center; justify-content:center; background:radial-gradient(ellipse at 60% 40%,#2d5a3d 0%,#0f2018 60%,#06110c 100%); position:relative; overflow:hidden; }
  .auth-bg::before { content:''; position:absolute; inset:0; background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"); }
  .auth-card { background:rgba(30,60,40,0.85); backdrop-filter:blur(20px); border:1px solid rgba(201,168,76,0.2); border-radius:20px; padding:48px 40px; width:100%; max-width:420px; position:relative; z-index:1; box-shadow:0 32px 64px rgba(0,0,0,0.4); animation:fadeUp 0.4s ease; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .auth-logo { text-align:center; margin-bottom:28px; }
  .auth-logo-icon { display:flex; align-items:flex-end; justify-content:center; gap:3px; margin-bottom:8px; height:40px; }
  .bar { width:5px; border-radius:3px; background:linear-gradient(to top,#c9a84c,#e8c97a); animation:barPulse 1.4s ease-in-out infinite; }
  @keyframes barPulse { 0%,100%{transform:scaleY(0.5);opacity:0.7} 50%{transform:scaleY(1);opacity:1} }
  .auth-logo-text { font-family:'Playfair Display',serif; color:#c9a84c; font-size:15px; letter-spacing:3px; font-weight:600; }
  .auth-title { font-family:'Playfair Display',serif; color:#ffffff; font-size:26px; font-weight:600; text-align:center; margin-bottom:8px; }
  .auth-subtitle { color:rgba(255,255,255,0.45); font-size:13px; text-align:center; margin-bottom:28px; }
  .auth-input-wrap { position:relative; margin-bottom:14px; }
  .auth-input-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.4); pointer-events:none; }
  .auth-input { width:100%; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:13px 14px 13px 42px; color:#ffffff; font-size:14px; font-family:'DM Sans',sans-serif; outline:none; transition:border-color 0.2s; }
  .auth-input::placeholder { color:rgba(255,255,255,0.3); }
  .auth-input:focus { border-color:#c9a84c; }
  .auth-eye { position:absolute; right:14px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.4); cursor:pointer; background:none; border:none; display:flex; align-items:center; }
  .btn-primary { width:100%; background:linear-gradient(135deg,#1a2a1e 0%,#0a1a10 100%); color:#ffffff; border:none; border-radius:10px; padding:14px; font-size:15px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; transition:opacity 0.2s,transform 0.1s; letter-spacing:0.5px; margin-top:4px; }
  .btn-primary:hover { opacity:0.85; transform:translateY(-1px); }
  .btn-primary:active { transform:translateY(0); }
  .btn-primary:disabled { opacity:0.6; cursor:wait; }
  .auth-link { color:#c9a84c; cursor:pointer; font-weight:500; }
  .auth-link:hover { text-decoration:underline; }
  .auth-link-row { text-align:center; margin-top:18px; font-size:13px; color:rgba(255,255,255,0.4); }
  .auth-back { display:flex; align-items:center; gap:6px; color:rgba(255,255,255,0.45); font-size:13px; cursor:pointer; background:none; border:none; font-family:'DM Sans',sans-serif; margin-bottom:20px; padding:0; transition:color 0.15s; }
  .auth-back:hover { color:#c9a84c; }
  .success-icon { width:64px; height:64px; border-radius:50%; background:rgba(201,168,76,0.15); border:2px solid rgba(201,168,76,0.4); display:flex; align-items:center; justify-content:center; margin:0 auto 20px; color:#c9a84c; }
  .otp-row { display:flex; gap:10px; justify-content:center; margin-bottom:20px; }
  .otp-input { width:52px; height:56px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.07); color:#ffffff; font-size:22px; font-weight:700; text-align:center; font-family:'Playfair Display',serif; outline:none; transition:border-color 0.2s; }
  .otp-input:focus { border-color:#c9a84c; }
  .auth-hint { font-size:12px; color:rgba(255,255,255,0.35); text-align:center; margin-top:8px; }
  .auth-err { background:rgba(192,57,43,0.15); border:1px solid rgba(192,57,43,0.3); border-radius:8px; padding:10px 14px; margin-bottom:14px; color:#e57368; font-size:13px; }
`;

/* ================================================================
   components/QariLogo.jsx
   ================================================================ */
const QariLogo = ({ size = "auth" }) => {
  if (size === "sidebar") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 3, height: 20 }}>
        {[10, 16, 20, 22, 20, 16, 10].map((h, i) => (
          <div key={i} style={{ width: 3, height: h, borderRadius: 2, background: "linear-gradient(to top, #c9a84c, #e8c97a)" }} />
        ))}
      </div>
    );
  }
  const bars = [{ h: 16, d: "0s" }, { h: 26, d: "0.2s" }, { h: 36, d: "0.4s" }, { h: 40, d: "0.2s" }, { h: 36, d: "0s" }, { h: 26, d: "0.3s" }, { h: 16, d: "0.1s" }];
  return (
    <div className="auth-logo">
      <div className="auth-logo-icon">
        {bars.map((b, i) => <div key={i} className="bar" style={{ height: b.h, animationDelay: b.d }} />)}
      </div>
      <div className="auth-logo-text">QARI 24/7</div>
    </div>
  );
};

/* ================================================================
   components/Sidebar.jsx
   ================================================================ */
const sidebarStyles = `
  .sidebar { width:210px; min-height:100vh; background:#ffffff; border-right:1px solid #e8eae8; display:flex; flex-direction:column; padding:24px 0; flex-shrink:0; }
  .sidebar-brand { display:flex; align-items:center; gap:10px; padding:0 20px 24px; border-bottom:1px solid #e8eae8; margin-bottom:12px; }
  .brand-icon { width:36px; height:36px; border-radius:8px; background:#1a3a2a; display:flex; align-items:center; justify-content:center; }
  .brand-name { font-weight:700; font-size:14px; color:#1a2a1e; line-height:1.2; }
  .brand-sub { font-size:11px; color:#5a6b5e; }
  .nav-label { font-size:10px; font-weight:600; letter-spacing:1.5px; color:#888b88; padding:4px 20px 8px; text-transform:uppercase; }
  .nav-item { display:flex; align-items:center; gap:10px; padding:10px 20px; cursor:pointer; font-size:13.5px; font-weight:500; color:#5a6b5e; border-left:3px solid transparent; transition:all 0.15s; user-select:none; }
  .nav-item:hover { background:#f0f4f1; color:#1a2a1e; }
  .nav-item.active { background:rgba(26,58,42,0.06); color:#1a3a2a; border-left-color:#1a3a2a; font-weight:600; }
  .nav-item.logout { color:#c0392b; }
  .nav-item.logout:hover { background:#fff5f5; }
  .sidebar-spacer { flex:1; }
`;

const Sidebar = ({ activePage, setActivePage, onLogout }) => {
  const nav = [
    { id: "overview", label: "Over View", icon: <LayoutDashboard size={16} /> },
    { id: "users", label: "User Management", icon: <Users size={16} /> },
    { id: "profile", label: "Profile Setting", icon: <Settings size={16} /> },
  ];
  return (
    <>
      <style>{sidebarStyles}</style>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon"><QariLogo size="sidebar" /></div>
          <div><div className="brand-name">Qari</div><div className="brand-sub">Admin Dashboard</div></div>
        </div>
        <div className="nav-label">Menu</div>
        {nav.map(item => (
          <div key={item.id} className={`nav-item ${activePage === item.id ? "active" : ""}`} onClick={() => setActivePage(item.id)}>
            {item.icon} {item.label}
          </div>
        ))}
        <div className="sidebar-spacer" />
        <div className="nav-item logout" onClick={onLogout}><LogOut size={16} /> Logout</div>
      </aside>
    </>
  );
};

/* ================================================================
   components/TopBar.jsx
   ================================================================ */
const topbarStyles = `
  .topbar { display:flex; align-items:center; justify-content:flex-end; gap:16px; padding:14px 32px; background:#ffffff; border-bottom:1px solid #e8eae8; flex-shrink:0; }
  .notif-btn { position:relative; background:#f0f4f1; border:none; border-radius:50%; width:38px; height:38px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#5a6b5e; transition:background 0.15s; }
  .notif-btn:hover { background:#e8eae8; }
  .notif-dot { position:absolute; top:7px; right:7px; width:8px; height:8px; border-radius:50%; background:#c9a84c; border:2px solid #ffffff; }
  .topbar-user { display:flex; align-items:center; gap:10px; }
  .user-avatar { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#2d5a3d,#3d7a52); display:flex; align-items:center; justify-content:center; color:white; font-weight:700; font-size:13px; flex-shrink:0; }
  .user-info { line-height:1.3; }
  .user-name { font-size:13px; font-weight:600; color:#1a2a1e; }
  .user-email { font-size:11px; color:#5a6b5e; }
`;

const TopBar = () => (
  <>
    <style>{topbarStyles}</style>
    <div className="topbar">
      <button className="notif-btn"><Bell size={17} /><span className="notif-dot" /></button>
      <div className="topbar-user">
        <div className="user-avatar">AT</div>
        <div className="user-info">
          <div className="user-name">Abu Tahbbit</div>
          <div className="user-email">example@gmail.com</div>
        </div>
      </div>
    </div>
  </>
);

/* ================================================================
   auth/Login.jsx
   ================================================================ */
const Login = ({ onLogin, onForgotPassword }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setError("");
    onLogin();
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <QariLogo />
        <h1 className="auth-title">Log In with Email</h1>
        <p className="auth-subtitle">Enter Your Email & Password for Log in</p>
        {error && <div className="auth-err">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="auth-input-wrap">
            <Mail className="auth-input-icon" size={15} />
            <input className="auth-input" type="email" placeholder="Enter Your Email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="auth-input-wrap">
            <Lock className="auth-input-icon" size={15} />
            <input className="auth-input" type={showPw ? "text" : "password"} placeholder="Enter Your Password" style={{ paddingRight: 42 }} value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" className="auth-eye" onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>
          <div style={{ textAlign: "right", marginBottom: 20, marginTop: -4 }}>
            <span className="auth-link" onClick={onForgotPassword}>Forgot Password?</span>
          </div>
          <button type="submit" className="btn-primary">Log In</button>
        </form>
      </div>
    </div>
  );
};

/* ================================================================
   auth/ForgotPassword.jsx
   ================================================================ */
const ForgotPassword = ({ onBack, onOtpSent }) => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1200);
  };

  if (sent) return (
    <div className="auth-bg">
      <div className="auth-card">
        <QariLogo />
        <div className="success-icon"><CheckCircle size={28} /></div>
        <h1 className="auth-title">Check Your Email</h1>
        <p className="auth-subtitle">
          We've sent a reset code to<br />
          <span style={{ color: "#c9a84c", fontWeight: 500 }}>{email}</span>
        </p>
        <button className="btn-primary" onClick={onOtpSent} style={{ marginTop: 8 }}>Enter Reset Code</button>
        <div className="auth-link-row">
          Didn't receive it? <span className="auth-link" style={{ marginLeft: 4 }} onClick={() => setSent(false)}>Resend</span>
        </div>
        <div className="auth-link-row" style={{ marginTop: 10 }}>
          <span className="auth-link" onClick={onBack}>← Back to Login</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <QariLogo />
        <button className="auth-back" onClick={onBack}><ArrowLeft size={15} /> Back to Login</button>
        <h1 className="auth-title">Forgot Password?</h1>
        <p className="auth-subtitle">Enter your email and we'll send you a reset code.</p>
        <form onSubmit={handleSubmit}>
          <div className="auth-input-wrap">
            <Mail className="auth-input-icon" size={15} />
            <input className="auth-input" type="email" placeholder="Enter Your Email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Code"}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ================================================================
   auth/ResetPassword.jsx
   ================================================================ */
const OtpInput = ({ value, onChange }) => {
  const refs = [useRef(), useRef(), useRef(), useRef()];
  const digits = (value + "    ").slice(0, 4).split("");

  const handleKey = (i, e) => {
    if (e.key === "Backspace") {
      const arr = digits.slice(); arr[i] = " ";
      onChange(arr.join("").trimEnd().replace(/ /g, ""));
      if (i > 0) refs[i - 1].current?.focus();
    } else if (/^[0-9]$/.test(e.key)) {
      const arr = digits.slice(); arr[i] = e.key;
      onChange(arr.join("").replace(/ /g, ""));
      if (i < 3) refs[i + 1].current?.focus();
    }
  };

  return (
    <div className="otp-row">
      {[0, 1, 2, 3].map(i => (
        <input key={i} ref={refs[i]} className="otp-input" type="text" inputMode="numeric"
          maxLength={1} value={digits[i] === " " ? "" : digits[i]}
          onChange={() => {}} onKeyDown={e => handleKey(i, e)} onFocus={e => e.target.select()} />
      ))}
    </div>
  );
};

const ResetPassword = ({ onBack, onSuccess }) => {
  const [step, setStep] = useState("otp"); // otp → newpass → done
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [error, setError] = useState("");

  if (step === "done") return (
    <div className="auth-bg">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <QariLogo />
        <div className="success-icon" style={{ width: 72, height: 72 }}><CheckCircle size={34} /></div>
        <h1 className="auth-title">Password Reset!</h1>
        <p className="auth-subtitle">Successfully updated. Redirecting to login...</p>
        <div style={{ marginTop: 20, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
          <div style={{ height: "100%", background: "#c9a84c", borderRadius: 2, animation: "progressBar 2s linear forwards" }} />
        </div>
        <style>{`@keyframes progressBar { from{width:0} to{width:100%} }`}</style>
      </div>
    </div>
  );

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <QariLogo />
        <button className="auth-back" onClick={onBack}><ArrowLeft size={15} /> Back</button>
        {step === "otp" ? (
          <>
            <h1 className="auth-title">Enter Reset Code</h1>
            <p className="auth-subtitle">Enter the 4-digit code sent to your email</p>
            {error && <div className="auth-err">{error}</div>}
            <form onSubmit={e => {
              e.preventDefault();
              if (otp.length < 4) { setError("Please enter all 4 digits."); return; }
              setError(""); setStep("newpass");
            }}>
              <OtpInput value={otp} onChange={setOtp} />
              <p className="auth-hint">Didn't get the code? <span className="auth-link" style={{ marginLeft: 4 }}>Resend</span></p>
              <button type="submit" className="btn-primary" style={{ marginTop: 20 }}>Verify Code</button>
            </form>
          </>
        ) : (
          <>
            <h1 className="auth-title">New Password</h1>
            <p className="auth-subtitle">Create a strong new password for your account</p>
            {error && <div className="auth-err">{error}</div>}
            <form onSubmit={e => {
              e.preventDefault();
              if (password.length < 6) { setError("Minimum 6 characters."); return; }
              if (password !== confirm) { setError("Passwords do not match."); return; }
              setError(""); setStep("done"); setTimeout(onSuccess, 2000);
            }}>
              <div className="auth-input-wrap">
                <Lock className="auth-input-icon" size={15} />
                <input className="auth-input" type={showPw ? "text" : "password"} placeholder="New Password" style={{ paddingRight: 42 }} value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" className="auth-eye" onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              <div className="auth-input-wrap">
                <Lock className="auth-input-icon" size={15} />
                <input className="auth-input" type={showCf ? "text" : "password"} placeholder="Confirm Password" style={{ paddingRight: 42 }} value={confirm} onChange={e => setConfirm(e.target.value)} />
                <button type="button" className="auth-eye" onClick={() => setShowCf(!showCf)}>{showCf ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              {password && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, transition: "background 0.2s", background: password.length >= i * 2 ? (password.length >= 8 ? "#3d7a52" : "#c9a84c") : "rgba(255,255,255,0.1)" }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    {password.length < 4 ? "Too short" : password.length < 6 ? "Weak" : password.length < 8 ? "Fair" : "Strong"}
                  </div>
                </div>
              )}
              <button type="submit" className="btn-primary">Reset Password</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

/* ================================================================
   pages/Overview.jsx
   ================================================================ */
const growthData = [
  { day:"Thu",free:180,premium:130 }, { day:"Wed",free:220,premium:310 },
  { day:"Sat",free:150,premium:210 }, { day:"Mon",free:280,premium:380 },
  { day:"Fri",free:160,premium:240 }, { day:"Sun",free:140,premium:420 },
  { day:"Tue",free:200,premium:310 },
];
const revData = [
  { day:"Sun",rev:500 }, { day:"Mon",rev:620 }, { day:"Fri",rev:450 },
  { day:"Tue",rev:800 }, { day:"Wed",rev:600 }, { day:"Sat",rev:700 }, { day:"Thu",rev:680 }
];
const activityData = [
  { name:"Fatima Hassan", action:"Completed Surah Al-Baqarah revision", time:"30 min ago" },
  { name:"Aisha Binti Yusuf", action:"Achieved 97% accuracy on Surah Yasin", time:"1 hour ago" },
  { name:"Ahmad Al-Farsi", action:"Started memorizing Surah Al-Mulk", time:"2 hours ago" },
];

const overviewStyles = `
  .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
  .stat-card { background:#ffffff; border-radius:14px; padding:20px; border:1px solid #e8eae8; }
  .stat-card.dark { background:#1a3a2a; border-color:#1a3a2a; }
  .stat-card-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
  .stat-label { font-size:12px; font-weight:500; color:#5a6b5e; }
  .stat-card.dark .stat-label { color:rgba(255,255,255,0.6); }
  .stat-icon { width:30px; height:30px; border-radius:8px; background:#f0f4f1; display:flex; align-items:center; justify-content:center; color:#5a6b5e; }
  .stat-card.dark .stat-icon { background:rgba(255,255,255,0.12); color:rgba(255,255,255,0.8); }
  .stat-value { font-family:'Playfair Display',serif; font-size:30px; font-weight:700; color:#1a2a1e; line-height:1; }
  .stat-card.dark .stat-value { color:#ffffff; }
  .stat-note { font-size:11px; color:#5a6b5e; margin-top:5px; }
  .stat-card.dark .stat-note { color:rgba(255,255,255,0.45); }
  .charts-row { display:grid; grid-template-columns:1.4fr 1fr; gap:16px; margin-bottom:24px; }
  .chart-legend { display:flex; gap:16px; margin-top:6px; }
  .legend-item { display:flex; align-items:center; gap:5px; font-size:12px; color:#5a6b5e; }
  .legend-dot { width:8px; height:8px; border-radius:50%; }
  .bottom-row { display:grid; grid-template-columns:1.2fr 1fr; gap:16px; }
  .activity-item { display:flex; align-items:flex-start; justify-content:space-between; padding:12px 0; border-bottom:1px solid #e8eae8; }
  .activity-item:last-child { border-bottom:none; }
  .activity-name { font-size:13px; font-weight:600; color:#1a2a1e; }
  .activity-action { font-size:12px; color:#5a6b5e; margin-top:2px; }
  .activity-time { font-size:11px; color:#888b88; white-space:nowrap; }
`;

const Overview = () => (
  <>
    <style>{overviewStyles}</style>
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome in Qari app Dashboard</p>
      </div>
      <div className="stats-grid">
        {[
          { label:"Total Users", value:"5,000", note:"50 Increased from last Week", dark:true, icon:<Users size={15}/> },
          { label:"Total Earn", value:"$28,400", note:"8 Revenue across all regions", icon:<DollarSign size={15}/> },
          { label:"Premium Users", value:"3,200", note:"20 Increased from last Week", icon:<UserCheck size={15}/> },
          { label:"Free Users", value:"1,800", note:"On Discuss", icon:<UserX size={15}/> },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.dark ? "dark" : ""}`}>
            <div className="stat-card-top"><span className="stat-label">{s.label}</span><div className="stat-icon">{s.icon}</div></div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-note">{s.note}</div>
          </div>
        ))}
      </div>
      <div className="charts-row">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">User Growth Trend</div>
              <div className="chart-legend">
                <div className="legend-item"><div className="legend-dot" style={{background:"#1a3a2a"}} /> Free</div>
                <div className="legend-item"><div className="legend-dot" style={{background:"#c9a84c"}} /> Premium</div>
              </div>
            </div>
            <select className="period-select"><option>Last 7 Days</option></select>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={growthData} barGap={4}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#5a6b5e"}} />
              <YAxis hide />
              <Tooltip cursor={{fill:"rgba(0,0,0,0.03)"}} contentStyle={{borderRadius:8,border:"1px solid #e8eae8",fontSize:12}} />
              <Bar dataKey="free" fill="#1a3a2a" radius={[4,4,0,0]} maxBarSize={20} />
              <Bar dataKey="premium" fill="#c9a84c" radius={[4,4,0,0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Revenue Growth</div>
            <select className="period-select"><option>Last 7 Days</option></select>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revData}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2d5a3d" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2d5a3d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#5a6b5e"}} />
              <YAxis hide />
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eae8" vertical={false} />
              <Tooltip contentStyle={{borderRadius:8,border:"1px solid #e8eae8",fontSize:12}} />
              <Area type="monotone" dataKey="rev" stroke="#2d5a3d" strokeWidth={2} fill="url(#rg)" dot={{fill:"#2d5a3d",r:4}} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bottom-row">
        <div className="card">
          <div className="card-header"><div className="card-title">Recent Activity</div></div>
          {activityData.map((a, i) => (
            <div key={i} className="activity-item">
              <div><div className="activity-name">{a.name}</div><div className="activity-action">{a.action}</div></div>
              <div className="activity-time">{a.time}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{textAlign:"center",color:"#888b88",fontSize:13}}>
            <TrendingUp size={32} style={{marginBottom:8,opacity:0.3,display:"block",margin:"0 auto 8px"}} />
            More analytics coming soon
          </div>
        </div>
      </div>
    </div>
  </>
);

/* ================================================================
   pages/UserManagement.jsx
   ================================================================ */
const AVATAR_COLORS = ["#2d5a3d","#1a3a2a","#5a3d2d","#2d3d5a","#5a2d4a","#3d5a2d","#5a4a2d","#2d4a5a","#4a2d5a","#5a2d2d"];
const USERS_DATA = [
  { ini:"AR", name:"Ahmed Rahman",   email:"ahmed@example.com",  plan:"premium", joined:"2025-12-01" },
  { ini:"FK", name:"Fatima Khan",    email:"fatima@example.com", plan:"premium", joined:"2025-11-15" },
  { ini:"OH", name:"Omar Hassan",    email:"omar@example.com",   plan:"basic",   joined:"2026-01-10" },
  { ini:"AB", name:"Aisha Begum",    email:"aisha@example.com",  plan:"premium", joined:"2026-01-20" },
  { ini:"YA", name:"Yusuf Ali",      email:"yusuf@example.com",  plan:"basic",   joined:"2025-12-28" },
  { ini:"MS", name:"Maryam Siddiq",  email:"maryam@example.com", plan:"basic",   joined:"2026-02-01" },
  { ini:"IN", name:"Ibrahim Noor",   email:"ibrahim@example.com",plan:"premium", joined:"2025-10-05" },
  { ini:"KA", name:"Khadija Amin",   email:"khadija@example.com",plan:"basic",   joined:"2026-02-10" },
  { ini:"BF", name:"Bilal Farooq",   email:"bilal@example.com",  plan:"premium", joined:"2025-09-14" },
  { ini:"ZM", name:"Zainab Mirza",   email:"zainab@example.com", plan:"basic",   joined:"2026-02-16" },
];

const umStyles = `
  .um-search-row { display:flex; gap:12px; align-items:center; margin-bottom:20px; }
  .search-wrap { position:relative; flex:1; }
  .s-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#888b88; pointer-events:none; }
  .search-input { width:100%; padding:11px 14px 11px 40px; border:1px solid #e8eae8; border-radius:10px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1a2a1e; background:#ffffff; outline:none; transition:border-color 0.15s; }
  .search-input:focus { border-color:#2d5a3d; }
  .btn-filter { display:flex; align-items:center; gap:6px; padding:11px 18px; border:1px solid #e8eae8; border-radius:10px; background:#ffffff; font-size:13px; font-weight:500; color:#5a6b5e; cursor:pointer; font-family:'DM Sans',sans-serif; white-space:nowrap; }
  .btn-filter:hover { background:#f0f4f1; }
  .um-table-wrap { background:#ffffff; border-radius:14px; border:1px solid #e8eae8; overflow:hidden; }
  .um-table { width:100%; border-collapse:collapse; }
  .um-table th { text-align:left; padding:12px 20px; font-size:11px; font-weight:600; letter-spacing:0.8px; text-transform:uppercase; color:#888b88; border-bottom:1px solid #e8eae8; }
  .um-table td { padding:14px 20px; border-bottom:1px solid #e8eae8; }
  .um-table tr:last-child td { border-bottom:none; }
  .um-table tbody tr:hover td { background:#f8faf8; }
  .user-cell { display:flex; align-items:center; gap:12px; }
  .u-av { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:white; flex-shrink:0; }
  .u-name { font-size:13px; font-weight:600; color:#1a2a1e; }
  .u-email { font-size:12px; color:#5a6b5e; }
  .joined-date { font-size:13px; color:#5a6b5e; }
  .action-btn { background:none; border:none; cursor:pointer; color:#888b88; padding:4px; border-radius:6px; display:flex; align-items:center; transition:background 0.1s; }
  .action-btn:hover { background:#f0f4f1; color:#1a2a1e; }
  .pagination { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; border-top:1px solid #e8eae8; }
  .pagination-info { font-size:12px; color:#5a6b5e; }
  .pagination-pages { display:flex; gap:4px; align-items:center; }
  .page-btn { width:30px; height:30px; border-radius:6px; border:1px solid #e8eae8; background:#ffffff; cursor:pointer; font-size:13px; color:#5a6b5e; display:flex; align-items:center; justify-content:center; font-family:'DM Sans',sans-serif; transition:all 0.1s; }
  .page-btn.active { background:#1a3a2a; color:white; border-color:#1a3a2a; }
  .page-btn:hover:not(.active) { background:#f0f4f1; }
`;

const UserManagement = () => {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = USERS_DATA.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <style>{umStyles}</style>
      <div className="page-content">
        <div className="page-header">
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">View, manage, and monitor all users</p>
        </div>
        <div className="um-search-row">
          <div className="search-wrap">
            <Search size={15} className="s-icon" />
            <input className="search-input" placeholder="Search users by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn-filter"><Filter size={14} /> Filter</button>
        </div>
        <div className="um-table-wrap">
          <table className="um-table">
            <thead>
              <tr><th>User</th><th>Plan</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={i}>
                  <td>
                    <div className="user-cell">
                      <div className="u-av" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{u.ini}</div>
                      <div><div className="u-name">{u.name}</div><div className="u-email">{u.email}</div></div>
                    </div>
                  </td>
                  <td><span className={`badge ${u.plan}`}>{u.plan[0].toUpperCase() + u.plan.slice(1)}</span></td>
                  <td><span className="joined-date">{u.joined}</span></td>
                  <td><button className="action-btn"><MoreVertical size={16} /></button></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign:"center", color:"#888b88", padding:32, fontSize:13 }}>No users found</td></tr>
              )}
            </tbody>
          </table>
          <div className="pagination">
            <div className="pagination-info">Showing 1 to 10 of 42 results</div>
            <div className="pagination-pages">
              <button className="page-btn"><ChevronLeft size={14} /></button>
              {[1, 2, 3, "…", 8].map((p, i) => (
                <button key={i} className={`page-btn ${p === currentPage ? "active" : ""}`} onClick={() => typeof p === "number" && setCurrentPage(p)}>{p}</button>
              ))}
              <button className="page-btn"><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/* ================================================================
   pages/ProfileSetting.jsx
   ================================================================ */
const profileStyles = `
  .profile-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .profile-card { background:#ffffff; border-radius:14px; border:1px solid #e8eae8; overflow:hidden; }
  .profile-card-header { background:#1a3a2a; padding:16px 20px; display:flex; align-items:center; justify-content:space-between; }
  .profile-card-title { display:flex; align-items:center; gap:12px; }
  .p-avatar { width:36px; height:36px; border-radius:8px; background:rgba(255,255,255,0.12); display:flex; align-items:center; justify-content:center; color:white; }
  .p-name { font-size:14px; font-weight:600; color:white; }
  .p-role { font-size:11px; color:rgba(255,255,255,0.5); }
  .edit-btn { background:none; border:none; color:rgba(255,255,255,0.65); cursor:pointer; display:flex; align-items:center; gap:5px; font-size:12px; font-family:'DM Sans',sans-serif; transition:color 0.15s; }
  .edit-btn:hover { color:#e8c97a; }
  .profile-card-body { padding:20px; }
  .field-label { font-size:11px; font-weight:600; color:#5a6b5e; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px; }
  .field-input { width:100%; padding:10px 14px; border:1px solid #e8eae8; border-radius:8px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1a2a1e; background:#f0f4f1; outline:none; margin-bottom:14px; transition:border-color 0.15s,background 0.15s; }
  .field-input:focus { border-color:#2d5a3d; background:#ffffff; }
  .field-wrap { position:relative; }
  .field-wrap .field-input { margin-bottom:0; padding-right:42px; }
  .field-eye { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:#888b88; cursor:pointer; display:flex; align-items:center; }
`;

const ProfileCard = ({ role, name, email }) => {
  const [showPw, setShowPw] = useState(false);
  const [editing, setEditing] = useState(false);
  const [emailVal, setEmailVal] = useState(email);

  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <div className="profile-card-title">
          <div className="p-avatar"><Users size={18} /></div>
          <div><div className="p-name">{role}</div><div className="p-role">{name}</div></div>
        </div>
        <button className="edit-btn" onClick={() => setEditing(!editing)}>
          <Edit2 size={12} /> {editing ? "Save" : "Edit"}
        </button>
      </div>
      <div className="profile-card-body">
        <div className="field-label">Email</div>
        <input className="field-input" type="email" value={emailVal} onChange={e => setEmailVal(e.target.value)} readOnly={!editing} />
        <div className="field-label">Password</div>
        <div className="field-wrap">
          <input className="field-input" type={showPw ? "text" : "password"} defaultValue="••••••••••" readOnly={!editing} />
          <button className="field-eye" onClick={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProfileSetting = () => (
  <>
    <style>{profileStyles}</style>
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Profile Setting</h1>
        <p className="page-subtitle">Manage Super Admin & Sub Admin Profile</p>
      </div>
      <div className="profile-grid">
        <ProfileCard role="Super Admin" name="Totok Michael" email="tmichael20@mail.com" />
        <ProfileCard role="Sub Admin" name="Devon Lane" email="devonlane20@mail.com" />
      </div>
    </div>
  </>
);

/* ================================================================
   DashboardLayout  (wraps Sidebar + TopBar + active page)
   ================================================================ */
const DashboardLayout = ({ onLogout }) => {
  const [activePage, setActivePage] = useState("overview");
  const pages = {
    overview: <Overview />,
    users: <UserManagement />,
    profile: <ProfileSetting />,
  };
  return (
    <div className="app-root">
      <Sidebar activePage={activePage} setActivePage={setActivePage} onLogout={onLogout} />
      <div className="main-area">
        <TopBar />
        {pages[activePage]}
      </div>
    </div>
  );
};

/* ================================================================
   App — root router
   auth routes: "login" | "forgot" | "reset"
   ================================================================ */
export default function App() {
  const [authRoute, setAuthRoute] = useState("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      {isLoggedIn ? (
        <DashboardLayout onLogout={() => { setIsLoggedIn(false); setAuthRoute("login"); }} />
      ) : authRoute === "login" ? (
        <Login onLogin={() => setIsLoggedIn(true)} onForgotPassword={() => setAuthRoute("forgot")} />
      ) : authRoute === "forgot" ? (
        <ForgotPassword onBack={() => setAuthRoute("login")} onOtpSent={() => setAuthRoute("reset")} />
      ) : (
        <ResetPassword onBack={() => setAuthRoute("forgot")} onSuccess={() => setAuthRoute("login")} />
      )}
    </>
  );
}
