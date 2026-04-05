import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';
import {
  LayoutDashboard,
  Calendar,
  Settings,
  TrendingUp,
  LogOut,
  Sliders,
  Briefcase,
  User,
  MessageSquare
} from 'lucide-react';
import '../assets/styles/sidebar.css';
import logo from '../assets/logo.png.png';
import { usePlatform } from '../pages/platformContext';

// Map menu names to their routes
const menuRoutes = {
  'Dashboard': '/adminDashboard',
  'Bookings': '/adminBooking',
  'Manage Business': '/addBusiness',
  'AI Configuration': '/aiconfiguration',
  'Analytics': '/analytics',
  'Settings': '/settings',
  'Change Password': '/change-password',
  'Profile': '/profile',
  'Chatbot': '/chatbot'
};

// Map routes to menu names (for detecting active menu from URL)
const routeToMenu = {
  '/adminDashboard': 'Dashboard',
  '/adminBooking': 'Bookings',
  '/addBusiness': 'Manage Business',
  '/aiconfiguration': 'AI Configuration',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
  '/change-password': 'Change Password',
  '/profile': 'Profile',
  '/chatbot': 'Chatbot'
};

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { platformName } = usePlatform();

  const activeMenu = routeToMenu[location.pathname] || 'Dashboard';

  const handleMenuClick = (menuName) => {
    const route = menuRoutes[menuName];
    if (route) navigate(route);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('lastSavedConfig');
    Cookies.remove('access_token');
    navigate('/');  // ← was '/', now goes to login page
  };

  return (
    <aside className="sidebar-nav">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <img src={logo} alt="Logo" className="logo-image" />
          </div>
          <div className="sidebar-logo-text">
            {/* ── Platform name from context — updates everywhere instantly ── */}
            <div className="sidebar-logo-title">{platformName}</div>
            <div className="sidebar-logo-subtitle">ADMIN CONSOLE</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-menu">
        <button
          className={`menu-item ${activeMenu === 'Dashboard' ? 'active' : ''}`}
          onClick={() => handleMenuClick('Dashboard')}
        >
          <LayoutDashboard className="menu-icon" />
          <span>Dashboard Analytics</span>
        </button>
        <button
          className={`menu-item ${activeMenu === 'Bookings' ? 'active' : ''}`}
          onClick={() => handleMenuClick('Bookings')}
        >
          <Calendar className="menu-icon" />
          <span>Bookings</span>
        </button>
        <button
          className={`menu-item ${activeMenu === 'Manage Business' ? 'active' : ''}`}
          onClick={() => handleMenuClick('Manage Business')}
        >
          <Briefcase className="menu-icon" />
          <span>Manage Business</span>
        </button>
        <button
          className={`menu-item ${activeMenu === 'AI Configuration' ? 'active' : ''}`}
          onClick={() => handleMenuClick('AI Configuration')}
        >
          <Sliders className="menu-icon" />
          <span>AI Configuration</span>
        </button>
        <button className={`menu-item ${activeMenu === 'Chatbot' ? 'active' : ''}`} onClick={() => handleMenuClick('Chatbot')}>
          <MessageSquare className="menu-icon" />
          <span>Chatbot Configuration</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut className="logout-icon" />
          <span>Log Out</span>
        </button>

        <button className="profile-btn" onClick={() => handleMenuClick('Profile')}>
          <div className={`user-profile ${activeMenu === 'Profile' ? 'active' : ''}`}>
            <img
              src="https://i.pravatar.cc/150?img=12"
              alt="User"
              className="user-avatar"
            />
            <div className="user-info">
              <div className="user-name">Brock Dixon</div>
              <div className="user-role">Admin</div>
            </div>
            <div className="notification-badge">🔔</div>
          </div>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;