import React, { useState, useEffect, useRef } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Component Imports
import Login from './components/Login';
import DashboardOverview from './components/DashboardOverview';
import UploadData from './components/UploadData';
import AdminPanel from './components/AdminPanel';
import DesignDashboard from './components/DesignDashboard';
import Analytics from './components/Analytics';
import DashboardDesigner from './components/DashboardDesigner';

/* ─────────────────────────────────────────
   Sidebar navigation item definitions
───────────────────────────────────────── */
const NAV_ITEMS = [
  {
    section: 'Main',
    links: [
      { to: '/',         label: 'Dashboard',          icon: '📊', exact: true  },
      { to: '/upload',   label: 'Data Upload',         icon: '📂'              },
      { to: '/analytics',label: 'AI Analytics',        icon: '🤖'              },
      { to: '/designer', label: 'Dashboard Designer',  icon: '🎨'              },
    ],
  },
  {
    section: 'Management',
    adminOnly: true,
    links: [
      { to: '/admin', label: 'User Management', icon: '👥', adminOnly: true },
    ],
  },
];

/* ─────────────────────────────────────────
   Page title lookup (for topbar breadcrumb)
───────────────────────────────────────── */
const PAGE_META = {
  '/':         { title: 'Dashboard',         crumb: 'Home / Overview'             },
  '/upload':   { title: 'Data Upload',        crumb: 'Home / Data Upload'         },
  '/analytics':{ title: 'AI Analytics',       crumb: 'Home / AI Analytics'        },
  '/designer': { title: 'Dashboard Designer', crumb: 'Home / Dashboard Designer'  },
  '/admin':    { title: 'User Management',    crumb: 'Home / Admin / Users'        },
};

/* ─────────────────────────────────────────
   Theme Toggle Button
───────────────────────────────────────── */
function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      className="theme-toggle"
      onClick={onToggle}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <div className="theme-toggle-thumb">
        {theme === 'dark' ? '🌙' : '☀️'}
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────
   Sidebar
───────────────────────────────────────── */
function Sidebar({ role, username, onLogout }) {
  const location = useLocation();

  const isActive = (to, exact) =>
    exact ? location.pathname === to : location.pathname.startsWith(to) && (to !== '/' || location.pathname === '/');

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon" aria-hidden="true">📊</div>
        <div>
          <div className="brand-name">SME Insight</div>
          <div className="brand-tagline">Business Intelligence</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((section) => {
          if (section.adminOnly && role !== 'Admin') return null;
          const visibleLinks = section.links.filter(
            (l) => !l.adminOnly || role === 'Admin'
          );
          if (visibleLinks.length === 0) return null;

          return (
            <React.Fragment key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {visibleLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`nav-link ${isActive(link.to, link.exact) ? 'active' : ''}`}
                  title={link.label}
                >
                  <span className="nav-icon" aria-hidden="true">{link.icon}</span>
                  <span>{link.label}</span>
                  {link.badge && <span className="nav-badge">{link.badge}</span>}
                </Link>
              ))}
            </React.Fragment>
          );
        })}
      </nav>

      {/* User / logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={onLogout} title="Log out" role="button" tabIndex={0}>
          <div className="user-avatar">
            {username ? username.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{username || 'User'}</div>
            <div className="user-role">{role || 'Member'} · Log out</div>
          </div>
          <span className="user-chevron" aria-hidden="true">→</span>
        </div>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────
   Topbar
───────────────────────────────────────── */
function Topbar({ username, role, theme, onToggleTheme, onLogout }) {
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const dropdownRef = useRef(null);

  const meta = PAGE_META[location.pathname] || { title: 'SME Insight', crumb: 'Home' };

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="topbar">
      {/* Page title */}
      <div className="topbar-title">
        <div className="topbar-page-name">{meta.title}</div>
        <div className="topbar-breadcrumb">{meta.crumb}</div>
      </div>

      <div className="topbar-actions">
        {/* Search */}
        <div className="topbar-search" role="search">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input
            type="text"
            placeholder="Search datasets, insights…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            aria-label="Search"
          />
        </div>

        {/* Notifications */}
        <button className="icon-btn notif-dot" title="Notifications" aria-label="Notifications">
          🔔
        </button>

        {/* Help */}
        <button className="icon-btn" title="Help & docs" aria-label="Help">
          ❓
        </button>

        {/* Theme toggle */}
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />

        {/* Profile dropdown */}
        <div className="profile-container" ref={dropdownRef}>
          <button
            className="profile-button"
            onClick={() => setDropdownOpen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            aria-label="User menu"
          >
            <div className="avatar">
              {username ? username.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="profile-name">{username || 'User'}</span>
            <span aria-hidden="true" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>▾</span>
          </button>

          {dropdownOpen && (
            <div className="dropdown-menu" role="menu">
              <button className="dropdown-item" role="menuitem">
                <span aria-hidden="true">👤</span> Profile
              </button>
              <button className="dropdown-item" role="menuitem">
                <span aria-hidden="true">⚙️</span> Settings
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item danger"
                onClick={onLogout}
                role="menuitem"
              >
                <span aria-hidden="true">🚪</span> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────
   Main App (authenticated shell)
───────────────────────────────────────── */
function MainApp() {
  const [token,    setToken]    = useState(localStorage.getItem('sme_token')    || null);
  const [role,     setRole]     = useState(localStorage.getItem('sme_role')     || null);
  const [username, setUsername] = useState(localStorage.getItem('sme_username') || '');
  const [datasets, setDatasets] = useState([]);

  // Theme: 'light' | 'dark'. Default follows OS preference.
  const systemPrefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('sme_theme');
  const [theme, setTheme] = useState(savedTheme || (systemPrefersDark ? 'dark' : 'light'));

  // Apply theme class to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sme_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (token) fetchDashboardData(token);
  }, [token]);

  const fetchDashboardData = async (activeToken) => {
    try {
      const res = await axios.get('https://pwn0nbjt-5000.asse.devtunnels.ms/dashboard-data', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      setDatasets(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
      if (err.response?.status === 403) handleLogout();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sme_token');
    localStorage.removeItem('sme_role');
    localStorage.removeItem('sme_username');
    setToken(null);
    setRole(null);
    setUsername('');
  };

  const toggleTheme = () =>
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  /* Unauthenticated: show login */
  if (!token) {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <Login
              setToken={setToken}
              setRole={setRole}
              setUsername={setUsername}
              fetchDashboardData={fetchDashboardData}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          }
        />
      </Routes>
    );
  }

  return (
    <div className="app-container">
      {/* ── Left Sidebar ── */}
      <Sidebar role={role} username={username} onLogout={handleLogout} />

      {/* ── Right Panel (topbar + main) ── */}
      <div className="right-panel">
        <Topbar
          username={username}
          role={role}
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
        />

        <main className="main-content" id="main-content" tabIndex={-1}>
          <Routes>
            <Route path="/"         element={<DashboardOverview datasets={datasets} token={token} />} />
            <Route path="/upload"   element={<UploadData token={token} fetchDashboardData={fetchDashboardData} />} />
            <Route path="/analytics"element={<Analytics datasets={datasets} token={token} />} />
            <Route path="/design"   element={<DesignDashboard datasets={datasets} />} />
            <Route path="/admin"    element={<AdminPanel token={token} role={role} datasets={datasets} />} />
            <Route path="/designer" element={<DashboardDesigner datasets={datasets} token={token} />} />
            <Route path="*"         element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Root export (wraps in Router)
───────────────────────────────────────── */
export default function App() {
  return (
    <Router>
      <MainApp />
    </Router>
  );
}