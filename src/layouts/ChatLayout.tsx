import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Upload, Menu, MessageSquare, Grid3X3, FileText, List, Settings as SettingsIcon, Plug, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/shared/contexts';
import { useNavigate, useLocation } from 'react-router-dom';
import CSVUploader from '@/components/CSVUploader';
import { ConversationList } from '@/components/ConversationList';
import { useConversations, ConversationWithMessages } from '@/hooks/useConversations';
import { useSession } from '@/hooks/useSession';

interface ChatLayoutProps {
  children: React.ReactNode;
  onImportComplete?: (count: number) => void;
  onConversationSelect?: (id: string) => void;
  onNewConversation?: () => void;
  activeConversationId?: string;
  commandBarOpen?: boolean;
  onCommandBarOpenChange?: (open: boolean) => void;
  aiChatOpen?: boolean;
  onAIChatOpenChange?: (open: boolean) => void;
  aiChatInitialMessage?: string;
  onCopilotMessage?: (message: string) => void;
  currentPage?: string;
}

/**
 * ChatLayout - Minimalist chat-first layout for AI CFO
 *
 * Structure:
 * - Sticky top bar: logo (left), runway status (center), upload CSV + user avatar (right)
 * - Main content: centered column (max-width 680px), fills viewport
 * - Bottom: anchored input area
 */
export const ChatLayout: React.FC<ChatLayoutProps> = ({
  children,
  onImportComplete,
  onConversationSelect,
  onNewConversation,
  activeConversationId,
  commandBarOpen,
  onCommandBarOpenChange,
  aiChatOpen,
  onAIChatOpenChange,
  aiChatInitialMessage,
  onCopilotMessage,
  currentPage,
}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionData } = useSession();
  const [isCSVUploaderOpen, setIsCSVUploaderOpen] = useState(false);
  const [isConversationListOpen, setIsConversationListOpen] = useState(false);
  const {
    conversations,
    createConversation,
    deleteConversation,
  } = useConversations();

  const isChatRoute = location.pathname === '/chat';

  // Navigation items for top bar
  const navItems = [
    { path: '/chat', label: 'Chat', icon: MessageSquare },
    { path: '/dashboard', label: 'Dashboard', icon: Grid3X3 },
    { path: '/kpis', label: 'KPIs', icon: Calculator },
    { path: '/reports', label: 'Reports', icon: FileText },
    { path: '/ledger', label: 'Ledger', icon: List },
    { path: '/integrations', label: 'Integrations', icon: Plug },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    const name = user?.full_name || user?.email || 'U';
    const parts = name.split(/[\s@]/);
    return (parts[0]?.[0] + (parts[1]?.[0] || '')).toUpperCase();
  };

  const handleImportComplete = (count: number) => {
    if (onImportComplete) {
      onImportComplete(count);
    }
  };

  const handleNewConversation = async () => {
    const newId = await createConversation();
    if (newId && onNewConversation) {
      onNewConversation();
      if (onConversationSelect) {
        onConversationSelect(newId);
      }
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-on-background font-body">
      {/* Conversation List Sidebar - only on chat route */}
      {isChatRoute && (
        <>
          <ConversationList
            isOpen={isConversationListOpen}
            onClose={() => setIsConversationListOpen(false)}
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={(id) => {
              setIsConversationListOpen(false);
              if (onConversationSelect) {
                onConversationSelect(id);
              }
            }}
            onNew={handleNewConversation}
            onDelete={deleteConversation}
          />

          {/* Mobile Navigation Drawer */}
          {isConversationListOpen && (
            <div className="md:hidden fixed inset-0 top-14 z-[44] bg-black/40" onClick={() => setIsConversationListOpen(false)} />
          )}
        </>
      )}

      {/* Top Bar */}
      <header
        className={cn(
          'sticky top-0 z-40',
          'bg-background/60 backdrop-blur-2xl',
          'border-b border-white/[0.04]'
        )}
      >
        {/* Top row: Logo + Nav + Upload + Avatar */}
        <div
          className={cn(
            'h-14 px-4 lg:px-6',
            'flex items-center justify-between gap-4'
          )}
        >
          {/* Menu button + Logo (left) */}
          <div className="flex items-center gap-2 min-w-fit">
            {isChatRoute && (
              <button
                onClick={() => setIsConversationListOpen(!isConversationListOpen)}
                className={cn(
                  'p-2 rounded-lg',
                  'lg:hidden',
                  'h-10 w-10 inline-flex items-center justify-center',
                  'bg-white/[0.04] hover:bg-white/[0.06]',
                  'border border-white/[0.06]',
                  'text-slate-300 hover:text-slate-200',
                  'transition-all duration-200'
                )}
                title="Toggle conversations"
              >
                <Menu className="h-4 w-4" />
              </button>
            )}
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">R</span>
            </div>
            <span className="text-sm font-semibold text-slate-200 hidden sm:inline">Raven</span>
          </div>

          {/* Navigation items (center) */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <motion.button
                  key={item.path}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(item.path)}
                  aria-label={`Navigate to ${item.label}`}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                    'text-xs font-medium transition-all duration-200',
                    active
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-slate-400 hover:text-slate-300 hover:bg-white/[0.04]'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Upload CSV + User Avatar (right) */}
          <div className="flex items-center gap-3 min-w-fit">
          {/* Upload CSV button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsCSVUploaderOpen(true)}
            aria-label="Upload CSV file"
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
          </motion.button>

          {/* Upload button (compact, mobile) */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCSVUploaderOpen(true)}
            aria-label="Upload CSV file"
            className={cn(
              'sm:hidden inline-flex items-center justify-center',
              'h-11 w-11 rounded-lg',
              'bg-white/[0.04] hover:bg-white/[0.06]',
              'border border-white/[0.06]',
              'text-slate-300 hover:text-slate-200',
              'transition-colors duration-200'
            )}
            title="Upload CSV"
          >
            <Upload className="h-4 w-4" />
          </motion.button>

          {/* User avatar button with menu */}
          <div className="relative group">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="User menu"
              className={cn(
                'inline-flex items-center justify-center',
                'h-10 w-10 rounded-full',
                'bg-gradient-to-br from-[#00F0A0] to-[#00CC88]',
                'text-xs font-semibold text-[#001A0F]',
                'hover:ring-2 hover:ring-[#00F0A0]/40',
                'transition-all duration-200'
              )}
              title="User menu"
            >
              {getUserInitials()}
            </motion.button>

            {/* User menu dropdown */}
            <div
              className={cn(
                'absolute right-0 top-full mt-2',
                'w-48 rounded-lg',
                'bg-[#141419]/95 border border-white/[0.06]',
                'backdrop-blur-xl',
                'shadow-lg',
                'overflow-hidden',
                'invisible group-hover:visible',
                'opacity-0 group-hover:opacity-100',
                'transition-all duration-200'
              )}
            >
              {/* User info */}
              <div className="px-4 py-3 border-b border-white/[0.04]">
                <p className="text-xs font-semibold text-slate-200">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {user?.email || 'user@example.com'}
                </p>
              </div>

              {/* Settings link */}
              <button
                onClick={() => navigate('/settings')}
                className={cn(
                  'w-full px-4 py-2.5 text-left',
                  'flex items-center gap-3',
                  'text-xs text-slate-300',
                  'hover:bg-white/[0.06] hover:text-slate-200',
                  'transition-colors'
                )}
              >
                <SettingsIcon className="h-3.5 w-3.5" />
                <span>Settings</span>
              </button>

              {/* Sign Out button */}
              <button
                onClick={handleLogout}
                className={cn(
                  'w-full px-4 py-2.5 text-left',
                  'flex items-center gap-3',
                  'text-xs text-slate-300',
                  'hover:bg-white/[0.06] hover:text-red-400',
                  'transition-colors',
                  'border-t border-white/[0.04]'
                )}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
          </div>
        </div>

        {/* Metrics Ticker (bottom row) */}
        <div
          className={cn(
            'h-11 px-4 lg:px-6 border-t border-white/[0.04]',
            'flex items-center gap-3 lg:gap-6 overflow-x-auto',
            'bg-white/[0.02] text-xs text-slate-400',
            'relative'
          )}
          style={{
            WebkitMaskImage: 'linear-gradient(to right, black 0%, black calc(100% - 20px), transparent 100%)',
            maskImage: 'linear-gradient(to right, black 0%, black calc(100% - 20px), transparent 100%)',
          }}
        >
          {/* MRR */}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-[10px] text-slate-500">MRR</span>
            <span className="font-semibold text-xs sm:text-sm text-slate-200">
              {sessionData?.metrics_snapshot?.mrr?.value || '₹8.00L'}
            </span>
          </div>

          {/* Burn Rate */}
          <div className="flex items-center gap-2 whitespace-nowrap border-l border-white/[0.06] pl-6">
            <span className="text-[10px] text-slate-500">Burn</span>
            <span className="font-semibold text-xs sm:text-sm text-slate-200">
              {sessionData?.metrics_snapshot?.burn?.value || '₹5.20L'}
            </span>
          </div>

          {/* Runway */}
          <div className="flex items-center gap-2 whitespace-nowrap border-l border-white/[0.06] pl-6">
            <span className="text-[10px] text-slate-500">Runway</span>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs sm:text-sm text-primary">
                {sessionData?.metrics_snapshot?.runway?.value || '18 mo'}
              </span>
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 overflow-y-auto">
        <div className={cn(
          "flex justify-center",
          isChatRoute ? "pt-8 pb-32" : "pt-6 pb-8 px-4 md:px-8"
        )}>
          <div className={cn(
            "w-full",
            isChatRoute ? "max-w-[680px] px-4 lg:px-0" : "max-w-7xl"
          )}>
            {children}
          </div>
        </div>
      </main>

      {/* CSV Uploader Modal */}
      <CSVUploader
        isOpen={isCSVUploaderOpen}
        onClose={() => setIsCSVUploaderOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
};

export default ChatLayout;
