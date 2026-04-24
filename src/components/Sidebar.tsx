import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  Users,
  LineChart,
  FileText,
  Cpu,
  Blocks,
  Table as TableIcon,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/shared/contexts';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Agents', path: '/agents' },
  { icon: LineChart, label: 'Scenarios', path: '/scenarios' },
  { icon: FileText, label: 'Reports', path: '/reports' },
  { icon: Cpu, label: 'Memory', path: '/memory' },
  { icon: Blocks, label: 'Integrations', path: '/integrations' },
  { icon: TableIcon, label: 'Ledger', path: '/ledger' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCopilotClick?: () => void;
  onExpandChange?: (expanded: boolean) => void;
}

export function Sidebar({ isOpen, onClose, onExpandChange }: SidebarProps) {
  const { signOut, session } = useAuth();
  const [hovered, setHovered] = React.useState(false);

  React.useEffect(() => {
    onExpandChange?.(hovered);
  }, [hovered, onExpandChange]);

  const userEmail = session?.user?.email || 'User';
  const userInitial = userEmail.charAt(0).toUpperCase();

  const expanded = hovered;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-64 z-50 lg:hidden',
          'bg-[#111110] border-r border-white/[0.04]',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 h-16 px-5 border-b border-white/5">
            <span className="text-lg font-bold text-white">Fin</span>
            <span className="text-lg font-bold text-primary">OS</span>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                    isActive
                      ? 'text-primary bg-primary/[0.06]'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.03]'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-primary' : '')} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-white/5 p-3 space-y-1">
            <NavLink
              to="/settings"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                  isActive ? 'text-primary bg-primary/[0.06]' : 'text-slate-500 hover:text-slate-200'
                )
              }
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Settings</span>
            </NavLink>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-error transition-colors w-full"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
            <div className="flex items-center gap-3 px-3 pt-3 border-t border-white/5">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {userInitial}
              </div>
              <span className="text-xs text-slate-500 truncate">{userEmail}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar — hover to expand */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'hidden lg:flex fixed left-0 top-0 h-screen z-50 flex-col',
          'bg-[#111110]/95 backdrop-blur-xl border-r border-white/[0.04]',
          'transition-all duration-300 ease-in-out overflow-hidden',
          expanded ? 'w-[220px]' : 'w-[72px]'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-5 border-b border-white/5 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg font-bold text-white flex-shrink-0">F</span>
            <span
              className={cn(
                'text-lg font-bold text-slate-400 whitespace-nowrap transition-all duration-300',
                expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              )}
            >
              inOS
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 h-10 rounded-lg transition-all duration-200 overflow-hidden',
                  expanded ? 'px-3' : 'px-0 justify-center',
                  isActive
                    ? 'text-primary bg-primary/[0.06]'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                  )}
                  <item.icon
                    className={cn(
                      'w-[18px] h-[18px] flex-shrink-0 transition-colors',
                      isActive ? 'text-primary' : ''
                    )}
                  />
                  <span
                    className={cn(
                      'text-[13px] font-medium whitespace-nowrap transition-all duration-300',
                      expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/5 p-3 space-y-1">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 h-10 rounded-lg transition-all duration-200 overflow-hidden',
                expanded ? 'px-3' : 'px-0 justify-center',
                isActive
                  ? 'text-primary bg-primary/[0.06]'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                )}
                <Settings className={cn('w-[18px] h-[18px] flex-shrink-0', isActive ? 'text-primary' : '')} />
                <span
                  className={cn(
                    'text-[13px] font-medium whitespace-nowrap transition-all duration-300',
                    expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                  )}
                >
                  Settings
                </span>
              </>
            )}
          </NavLink>

          <button
            onClick={() => signOut()}
            className={cn(
              'flex items-center gap-3 h-10 rounded-lg text-slate-500 hover:text-error transition-all duration-200 w-full overflow-hidden',
              expanded ? 'px-3' : 'px-0 justify-center'
            )}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            <span
              className={cn(
                'text-[13px] font-medium whitespace-nowrap transition-all duration-300',
                expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
              )}
            >
              Sign Out
            </span>
          </button>

          {/* User */}
          <div className={cn(
            'flex items-center gap-3 pt-3 border-t border-white/5 overflow-hidden',
            expanded ? 'px-2' : 'px-0 justify-center'
          )}>
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
              {userInitial}
            </div>
            <span
              className={cn(
                'text-xs text-slate-500 truncate transition-all duration-300',
                expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
              )}
            >
              {userEmail}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
