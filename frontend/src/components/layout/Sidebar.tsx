import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  Database,
  BarChart3,
  Sparkles,
  MessageSquare,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Workspace',    path: '/workspace',   icon: LayoutDashboard },
  { label: 'Upload Data',  path: '/upload',      icon: Upload          },
  { label: 'My Datasets',  path: '/datasets',    icon: Database        },
  { label: 'My Dashboards',path: '/dashboards',  icon: BarChart3       },
  { label: 'AI Insights',  path: '/insights',    icon: Sparkles        },
  { label: 'AI Chat',      path: '/chat',        icon: MessageSquare   },
  { label: 'Reports',      path: '/reports',     icon: FileText        },
  { label: 'Settings',     path: '/settings',    icon: Settings        },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleNav = (path: string) => {
    navigate(path);
    onMobileClose?.();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

  const displayName = user?.full_name || user?.username || 'User';
  const displaySub  = user?.company || user?.email || '';

  const isActive = (path: string) => {
    if (path === '/workspace') return location.pathname === '/workspace' || location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  /* ── sidebar inner content ── */
  const sidebarContent = (
    <aside
      className={cn(
        'flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-[280px]'
      )}
    >
      {/* ── Brand header ── */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-5 border-b border-slate-100',
          collapsed && 'justify-center px-0'
        )}
      >
        {/* Logo mark */}
        <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-md shadow-blue-200">
          <Zap className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
        </div>

        {!collapsed && (
          <div className="min-w-0">
            <span className="block text-[15px] font-bold text-slate-900 leading-tight tracking-tight">
              DataFlow <span className="text-blue-600">AI</span>
            </span>
            <span className="block text-[11px] text-slate-400 leading-tight">
              Analytics Platform
            </span>
          </div>
        )}

        {/* Collapse toggle — desktop only */}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="ml-auto shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-3 p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* ── Nav items ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {!collapsed && (
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Navigation
          </p>
        )}

        {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
          const active = isActive(path);
          return (
            <button
              key={path}
              onClick={() => handleNav(path)}
              title={collapsed ? label : undefined}
              className={cn(
                'group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon
                className={cn(
                  'shrink-0 w-[18px] h-[18px] transition-colors',
                  active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'
                )}
                strokeWidth={active ? 2.5 : 2}
              />

              {!collapsed && (
                <span className="truncate">{label}</span>
              )}

              {/* Active indicator dot */}
              {active && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── User profile footer ── */}
      <div className="border-t border-slate-100 p-3">
        {/* Profile row */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg p-2 mb-1',
            collapsed && 'justify-center'
          )}
        >
          {/* Avatar */}
          <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800 leading-tight">
                {displayName}
              </p>
              <p className="truncate text-[11px] text-slate-400 leading-tight">
                {displaySub}
              </p>
            </div>
          )}
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Log out' : undefined}
          className={cn(
            'group w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500',
            'hover:bg-red-50 hover:text-red-600 transition-all duration-150',
            collapsed && 'justify-center px-0'
          )}
        >
          <LogOut
            className="shrink-0 w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors"
            strokeWidth={2}
          />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full">
        {sidebarContent}
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full z-50">
            <aside className="flex flex-col h-full w-[280px] bg-white border-r border-slate-200 shadow-2xl">
              {/* Mobile header */}
              <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-100">
                <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-md shadow-blue-200">
                  <Zap className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[15px] font-bold text-slate-900 leading-tight tracking-tight">
                    DataFlow <span className="text-blue-600">AI</span>
                  </span>
                  <span className="block text-[11px] text-slate-400 leading-tight">
                    Analytics Platform
                  </span>
                </div>
                <button
                  onClick={onMobileClose}
                  className="ml-auto p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  aria-label="Close menu"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Navigation
                </p>
                {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
                  const active = isActive(path);
                  return (
                    <button
                      key={path}
                      onClick={() => handleNav(path)}
                      className={cn(
                        'group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        active
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )}
                    >
                      <Icon
                        className={cn(
                          'shrink-0 w-[18px] h-[18px]',
                          active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'
                        )}
                        strokeWidth={active ? 2.5 : 2}
                      />
                      <span className="truncate">{label}</span>
                      {active && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="border-t border-slate-100 p-3">
                <div className="flex items-center gap-3 rounded-lg p-2 mb-1">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
                    <p className="truncate text-[11px] text-slate-400">{displaySub}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="group w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  <LogOut className="shrink-0 w-4 h-4 text-slate-400 group-hover:text-red-500" strokeWidth={2} />
                  <span>Log out</span>
                </button>
              </div>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}
