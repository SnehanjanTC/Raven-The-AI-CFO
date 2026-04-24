import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Bell,
  Menu,
  Settings,
  LogOut,
  ChevronDown,
  MessageSquare,
  Grid3X3,
  FileText,
  List,
  Plug,
  Calculator,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/shared/contexts';
import { useSession } from '@/hooks/useSession';
import api from '@/lib/api';
import CSVUploader from '@/components/CSVUploader';

interface TopNavProps {
  onMenuClick: () => void;
  onCommandBarOpen: () => void;
  onAIChatOpen: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  type?: 'info' | 'warning' | 'success';
}

/**
 * Route-to-title mapping for dynamic page titles
 */
const ROUTE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/agents': 'Agents',
  '/scenarios': 'Scenarios',
  '/reports': 'Reports',
  '/memory': 'Memory',
  '/integrations': 'Integrations',
  '/settings': 'Settings',
  '/ledger': 'Ledger',
};

/**
 * TopNav - Modernized, minimal top navigation bar for AI-first financial platform
 *
 * Features:
 * - Glassmorphism design with backdrop blur
 * - Responsive layout (full width on mobile, margin on lg+)
 * - Dynamic page title based on current route
 * - Command bar trigger
 * - AI Chat button with pulsing indicator
 * - Notification dropdown with badge
 * - User avatar dropdown
 */
export const TopNav: React.FC<TopNavProps> = ({
  onMenuClick,
  onCommandBarOpen,
  onAIChatOpen,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { sessionData } = useSession();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isCSVUploaderOpen, setIsCSVUploaderOpen] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Get current page title from route
  const getPageTitle = () => {
    const path = location.pathname;
    return ROUTE_TITLES[path] || 'Home';
  };

  // Fetch notifications on mount and set up polling
  useEffect(() => {
    let stopped = false;
    const fetchNotifications = async () => {
      if (stopped) return;
      try {
        const response = await api.notifications.list();
        const items = Array.isArray(response) ? response : (response as any)?.data || [];
        setNotifications(items);
        const unread = items.filter(
          (n: Notification) => !n.read
        ).length;
        setUnreadCount(unread);
      } catch {
        // Silently ignore — backend may be unavailable
      }
    };

    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => { stopped = true; clearInterval(interval); };
  }, []);

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  };

  const handleUserMenuClick = () => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
  };

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
    setShowUserMenu(false);
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    const name = user?.full_name || user?.email || 'U';
    const parts = name.split(/[\s@]/);
    return (parts[0]?.[0] + (parts[1]?.[0] || '')).toUpperCase();
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40',
        'bg-background/60 backdrop-blur-2xl',
        'border-b border-white/[0.04]',
        'w-full'
      )}
    >
      <div className="h-14 px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className={cn(
            'lg:hidden inline-flex items-center justify-center',
            'h-10 w-10 rounded-lg',
            'text-slate-400 hover:text-slate-200',
            'bg-white/[0.03] hover:bg-white/[0.06]',
            'transition-colors duration-200'
          )}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 min-w-fit">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">R</span>
          </div>
          <span className="text-sm font-semibold text-slate-200 hidden sm:inline">Raven</span>
        </div>

        {/* Primary nav (center) */}
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { path: '/chat', label: 'Chat', Icon: MessageSquare },
            { path: '/dashboard', label: 'Dashboard', Icon: Grid3X3 },
            { path: '/kpis', label: 'KPIs', Icon: Calculator },
            { path: '/reports', label: 'Reports', Icon: FileText },
            { path: '/ledger', label: 'Ledger', Icon: List },
            { path: '/integrations', label: 'Integrations', Icon: Plug },
          ].map(({ path, label, Icon }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                  'text-xs font-medium transition-all duration-200',
                  active
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-white/[0.04] border border-transparent'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Upload CSV button */}
        <button
          onClick={() => setIsCSVUploaderOpen(true)}
          className={cn(
            'hidden sm:flex items-center gap-2',
            'px-3 py-1.5 rounded-lg',
            'bg-white/[0.04] hover:bg-white/[0.06]',
            'border border-white/[0.06] hover:border-white/[0.08]',
            'text-slate-300 hover:text-slate-200',
            'text-xs font-medium',
            'transition-all duration-200'
          )}
          title="Upload CSV"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>Upload</span>
        </button>

        {/* AI Chat button */}
        <button
          onClick={onAIChatOpen}
          className={cn(
            'relative inline-flex items-center justify-center',
            'h-10 w-10 rounded-full',
            'bg-[#00F0A0]/10 hover:bg-[#00F0A0]/20',
            'border border-[#00F0A0]/20 hover:border-[#00F0A0]/30',
            'text-[#00F0A0]',
            'transition-all duration-200',
            'group'
          )}
          aria-label="Open AI chat"
        >
          <Sparkles className="h-4 w-4" />
          {/* Pulsing indicator dot */}
          <span
            className={cn(
              'absolute top-1 right-1',
              'h-2 w-2 rounded-full',
              'bg-[#00F0A0]',
              'animate-pulse'
            )}
          />
        </button>

        {/* Notifications button */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={handleNotificationClick}
            className={cn(
              'relative inline-flex items-center justify-center',
              'h-10 w-10 rounded-lg',
              'text-slate-400 hover:text-slate-200',
              'bg-white/[0.03] hover:bg-white/[0.06]',
              'transition-colors duration-200',
              'group',
              showNotifications && 'bg-white/[0.06] text-slate-200'
            )}
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {/* Notification badge */}
            {unreadCount > 0 && (
              <span
                className={cn(
                  'absolute top-0 right-0',
                  'h-2 w-2 rounded-full',
                  'bg-[#FF6B6B]'
                )}
              />
            )}
          </button>

          {/* Notifications dropdown */}
          {showNotifications && (
            <div
              className={cn(
                'absolute right-0 top-full mt-2',
                'w-80 rounded-xl',
                'bg-[#141419]/95 border border-white/[0.06]',
                'backdrop-blur-xl',
                'shadow-lg',
                'overflow-hidden'
              )}
            >
              {/* Dropdown header */}
              <div className="px-4 py-3 border-b border-white/[0.04]">
                <h3 className="text-sm font-semibold text-slate-200">
                  Notifications
                </h3>
              </div>

              {/* Notifications list */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'px-4 py-3 border-b border-white/[0.04]',
                        'hover:bg-white/[0.03] transition-colors',
                        !notification.read && 'bg-white/[0.02]'
                      )}
                    >
                      <div className="flex gap-3">
                        {!notification.read && (
                          <div
                            className={cn(
                              'h-2 w-2 rounded-full flex-shrink-0 mt-1.5',
                              'bg-[#00F0A0]'
                            )}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-500 mt-1.5">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-slate-400">No notifications</p>
                  </div>
                )}
              </div>

              {/* Dropdown footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-3 border-t border-white/[0.04]">
                  <button
                    className={cn(
                      'w-full px-3 py-1.5 rounded-lg',
                      'text-xs font-medium',
                      'text-slate-400 hover:text-slate-200',
                      'hover:bg-white/[0.04]',
                      'transition-colors'
                    )}
                  >
                    View all
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User avatar and dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={handleUserMenuClick}
            className={cn(
              'relative inline-flex items-center justify-center gap-2',
              'h-10 px-2 rounded-lg',
              'text-slate-200',
              'bg-white/[0.03] hover:bg-white/[0.06]',
              'transition-colors duration-200',
              'group',
              showUserMenu && 'bg-white/[0.06]'
            )}
            aria-label="User menu"
          >
            {/* Avatar */}
            <div
              className={cn(
                'h-8 w-8 rounded-full',
                'bg-gradient-to-br from-[#00F0A0] to-[#00CC88]',
                'flex items-center justify-center',
                'text-xs font-semibold text-white'
              )}
            >
              {getUserInitials()}
            </div>

            {/* Chevron icon */}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-slate-400 transition-transform',
                showUserMenu && 'rotate-180'
              )}
            />
          </button>

          {/* User menu dropdown */}
          {showUserMenu && (
            <div
              className={cn(
                'absolute right-0 top-full mt-2',
                'w-48 rounded-xl',
                'bg-[#141419]/95 border border-white/[0.06]',
                'backdrop-blur-xl',
                'shadow-lg',
                'overflow-hidden'
              )}
            >
              {/* User info */}
              <div className="px-4 py-3 border-b border-white/[0.04]">
                <p className="text-sm font-semibold text-slate-200">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {user?.email || 'user@example.com'}
                </p>
              </div>

              {/* Menu items */}
              <div className="py-2">
                <button
                  onClick={handleSettingsClick}
                  className={cn(
                    'w-full px-4 py-2.5 text-left',
                    'flex items-center gap-3',
                    'text-sm text-slate-300',
                    'hover:bg-white/[0.06] hover:text-slate-200',
                    'transition-colors'
                  )}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </button>

                <button
                  onClick={handleLogout}
                  className={cn(
                    'w-full px-4 py-2.5 text-left',
                    'flex items-center gap-3',
                    'text-sm text-slate-300',
                    'hover:bg-white/[0.06] hover:text-red-400',
                    'transition-colors',
                    'border-t border-white/[0.04]'
                  )}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Ticker (bottom row) — mirrors ChatLayout */}
      <div
        className={cn(
          'h-11 px-4 lg:px-6 border-t border-white/[0.04]',
          'flex items-center gap-6 overflow-x-auto',
          'bg-white/[0.02] text-xs text-slate-400'
        )}
      >
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-slate-500">MRR</span>
          <span className="font-semibold text-slate-200">
            {sessionData?.metrics_snapshot?.mrr?.value || '₹8.00L'}
          </span>
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap border-l border-white/[0.06] pl-6">
          <span className="text-slate-500">Burn</span>
          <span className="font-semibold text-slate-200">
            {sessionData?.metrics_snapshot?.burn?.value || '₹5.20L'}
          </span>
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap border-l border-white/[0.06] pl-6">
          <span className="text-slate-500">Runway</span>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-primary">
              {sessionData?.metrics_snapshot?.runway?.value || '18 mo'}
            </span>
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </div>
        </div>
      </div>

      <CSVUploader
        isOpen={isCSVUploaderOpen}
        onClose={() => setIsCSVUploaderOpen(false)}
        onImportComplete={() => setIsCSVUploaderOpen(false)}
      />
    </header>
  );
};

export default TopNav;
