import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  Menu,
  Bell,
  ChevronRight,
  Search,
} from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';

/* ── Route label map ── */
const ROUTE_LABELS: Record<string, string> = {
  '/':           'Workspace',

  '/workspace':  'Workspace',
  '/upload':     'Upload Data',
  '/datasets':   'My Datasets',
  '/dashboards': 'My Dashboards',
  '/insights':   'AI Insights',
  '/chat':       'AI Chat',
  '/reports':    'Reports',
  '/settings':   'Settings',
  '/profile':    'Profile',
};

function getBreadcrumbs(pathname: string): { label: string; path: string }[] {
  const crumbs: { label: string; path: string }[] = [{ label: 'DataFlow AI', path: '/' }];

  // Match exact route first
  if (ROUTE_LABELS[pathname]) {
    if (pathname !== '/') {
      crumbs.push({ label: ROUTE_LABELS[pathname], path: pathname });
    }
    return crumbs;
  }

  // Build from path segments for nested routes like /datasets/42
  const segments = pathname.split('/').filter(Boolean);
  let current = '';
  for (const seg of segments) {
    current += `/${seg}`;
    const label = ROUTE_LABELS[current] || (
      // If segment is an ID (number), show generic label
      /^\d+$/.test(seg) ? `#${seg}` : seg.charAt(0).toUpperCase() + seg.slice(1)
    );
    crumbs.push({ label, path: current });
  }
  return crumbs;
}

function getPageTitle(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'Workspace';

  const baseRoute = `/${segments[0]}`;
  if (ROUTE_LABELS[baseRoute]) return ROUTE_LABELS[baseRoute];

  const seg = segments[0];
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

export default function AppLayout() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!isAuthenticated) return null;

  const breadcrumbs = getBreadcrumbs(location.pathname);
  const pageTitle   = getPageTitle(location.pathname);

  const initials = (() => {
    if (!user) return '?';
    if (user.full_name) {
      const parts = user.full_name.trim().split(' ');
      return parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
    }
    return user.username.slice(0, 2).toUpperCase();
  })();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ── Desktop sidebar ── */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Top bar ── */}
        <header className="shrink-0 flex items-center gap-4 h-14 px-4 lg:px-6 bg-white border-b border-slate-200">

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb + title */}
          <div className="min-w-0 flex-1">
            {/* Breadcrumb */}
            <nav className="hidden sm:flex items-center gap-1 text-xs text-slate-400 mb-0.5">
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.path} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300" />}
                  {i < breadcrumbs.length - 1 ? (
                    <button
                      onClick={() => navigate(crumb.path)}
                      className="hover:text-slate-600 transition-colors"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-slate-500 font-medium">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>

            {/* Page title — mobile only (breadcrumb replaces it on sm+) */}
            <h1 className="sm:hidden text-base font-semibold text-slate-800 leading-tight truncate">
              {pageTitle}
            </h1>
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search button */}
            <button
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-400 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors"
              onClick={() => {/* search modal placeholder */}}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="text-xs">Search…</span>
              <kbd className="ml-1 text-[10px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded border border-slate-200 font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Notifications */}
            <button
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]" />
              {/* Unread badge */}
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
            </button>

            {/* User avatar */}
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="User settings"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name || user.username}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <span className="hidden md:block text-sm font-medium text-slate-700 max-w-[100px] truncate">
                {user?.full_name || user?.username}
              </span>
            </button>
          </div>
        </header>

        {/* ── Page content ── */}
        <main
          className={cn(
            'flex-1 overflow-y-auto',
            'p-4 lg:p-6'
          )}
        >
          <Outlet />
        </main>
      </div>

      {/* ── Toast notifications ── */}
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1e293b',
            fontSize: '14px',
            fontWeight: 500,
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            boxShadow: '0 4px 24px -4px rgba(0,0,0,0.12)',
            padding: '12px 16px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
            style: { borderLeft: '3px solid #10b981' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
            style: { borderLeft: '3px solid #ef4444' },
          },
          loading: {
            iconTheme: { primary: '#2563eb', secondary: '#fff' },
            style: { borderLeft: '3px solid #2563eb' },
          },
        }}
      />
    </div>
  );
}
