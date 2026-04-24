import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  Bell,
  Menu,
  Settings,
  LogOut,
  Command,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/shared/contexts';
import api from '@/lib/api';

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

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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
        'h-14',
        'bg-background/60 backdrop-blur-2xl',
        'border-b border-white/[0.04]',
        'w-full'
      )}
    >
      <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
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

        {/* Page title */}
        <div className="hidden sm:flex items-center">
          <span className="text-sm font-medium text-slate-400">
            {getPageTitle()}
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Command bar trigger */}
        <button
          onClick={onCommandBarOpen}
          className={cn(
            'hidden md:flex items-center gap-2',
            'px-3 py-1.5 rounded-xl',
            'bg-white/[0.04] border border-white/[0.06]',
            'text-slate-400 hover:text-slate-300',
            'hover:bg-white/[0.06] hover:border-white/[0.08]',
            'transition-all duration-200',
            'group'
          )}
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">Search or ask AI...</span>
          <div className="ml-2 flex items-center gap-1 pl-2 border-l border-white/[0.1]">
            <Command className="h-3 w-3" />
            <span className="text-xs text-slate-500">K</span>
          </div>
        </button>

        {/* Mobile command bar trigger (compact) */}
        <button
          onClick={onCommandBarOpen}
          className={cn(
            'md:hidden inline-flex items-center justify-center',
            'h-10 w-10 rounded-lg',
            'text-slate-400 hover:text-slate-200',
            'bg-white/[0.03] hover:bg-white/[0.06]',
            'transition-colors duration-200'
          )}
          aria-label="Open command bar"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* AI Chat button */}
        <button
          onClick={onAIChatOpen}
          className={cn(
            'relative inline-flex items-center justify-center',
            'h-10 w-10 rounded-full',
            'bg-[#e5a764]/10 hover:bg-[#e5a764]/20',
            'border border-[#e5a764]/20 hover:border-[#e5a764]/30',
            'text-[#e5a764]',
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
              'bg-[#e5a764]',
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
                  'bg-[#e8866a]'
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
                'bg-[#1c1c1a]/95 border border-white/[0.06]',
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
                              'bg-[#e5a764]'
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
                'bg-gradient-to-br from-[#e5a764] to-[#c4a882]',
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
                'bg-[#1c1c1a]/95 border border-white/[0.06]',
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
    </header>
  );
};

export default TopNav;
