import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ConversationWithMessages } from '@/hooks/useConversations';

interface ConversationListProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ConversationWithMessages[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => Promise<void>;
}

/**
 * ConversationList - Slide-out sidebar for managing conversations
 *
 * Features:
 * - Slides in from left with Framer Motion AnimatePresence
 * - Search input to filter by title
 * - List sorted by most recent first
 * - Active conversation highlighted
 * - Hover to show delete button
 * - Inline confirmation prompt before delete (prevents double-delete)
 * - Empty state message
 * - Responsive: 280px on desktop, full-width on mobile
 * - Backdrop blur overlay on mobile
 */
export const ConversationList: React.FC<ConversationListProps> = ({
  isOpen,
  onClose,
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredConversations = conversations.filter((conv) =>
    (conv.title || 'Untitled').toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

    // Format as "Jan 15"
    const monthShort = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${monthShort} ${day}`;
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await onDelete(id);
      setDeleteConfirmId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const sidebarVariants = {
    hidden: { x: '-100%', opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.3 } },
    exit: { x: '-100%', opacity: 0, transition: { duration: 0.2 } },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop overlay (mobile) */}
          <motion.div
            key="backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
            className="fixed inset-0 z-[44] bg-black/40 backdrop-blur-sm lg:hidden"
          />

          {/* Sidebar */}
          <motion.div
            key="sidebar"
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'fixed top-0 left-0 z-45 h-screen',
              'w-full lg:w-[280px]',
              'bg-[#141419]/95 border-r border-white/[0.06]',
              'backdrop-blur-2xl',
              'overflow-hidden flex flex-col'
            )}
          >
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-4 border-b border-white/[0.06]">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-sm font-semibold text-slate-200">Conversations</h2>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onNew}
                    className={cn(
                      'p-1.5 rounded-lg',
                      'bg-primary/20 hover:bg-primary/30',
                      'text-primary hover:text-primary/90',
                      'transition-colors duration-200'
                    )}
                    title="New conversation"
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className={cn(
                      'p-1.5 rounded-lg lg:hidden',
                      'bg-white/[0.04] hover:bg-white/[0.08]',
                      'text-slate-400 hover:text-slate-200',
                      'transition-colors duration-200'
                    )}
                    title="Close conversations"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    'w-full pl-9 pr-3 py-1.5 rounded-lg',
                    'bg-white/[0.04] border border-white/[0.08]',
                    'text-xs text-slate-200 placeholder-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent',
                    'transition-all duration-200'
                  )}
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-4 flex items-center justify-center min-h-32">
                  <p className="text-xs text-slate-500 text-center">
                    {searchTerm
                      ? 'No conversations match your search'
                      : 'No conversations yet. Start chatting!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredConversations.map((conv) => {
                    const isActive = conv.id === activeId;
                    const title = conv.title || 'Untitled';
                    const date = formatDate(conv.updated_at);
                    const isConfirming = deleteConfirmId === conv.id;

                    return (
                      <div key={conv.id} className="group relative">
                        <AnimatePresence mode="wait">
                          {isConfirming ? (
                            <motion.div
                              key="confirm"
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className={cn(
                                'w-full px-3 py-2.5 rounded-lg',
                                'bg-red-500/20 border border-red-500/30',
                                'flex items-center justify-between gap-2'
                              )}
                            >
                              <span className="text-xs text-red-200 font-medium">Delete?</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleDelete(conv.id)}
                                  disabled={isDeleting}
                                  className={cn(
                                    'p-1 rounded-md',
                                    'bg-red-500/30 text-red-200 hover:bg-red-500/40',
                                    'transition-colors duration-200',
                                    isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                                  )}
                                  title="Confirm delete"
                                >
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  disabled={isDeleting}
                                  className={cn(
                                    'p-1 rounded-md',
                                    'bg-white/[0.1] text-slate-200 hover:bg-white/[0.15]',
                                    'transition-colors duration-200',
                                    isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                                  )}
                                  title="Cancel delete"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.button
                              key="normal"
                              whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
                              onClick={() => {
                                onSelect(conv.id);
                                if (window.innerWidth < 1024) {
                                  onClose();
                                }
                              }}
                              className={cn(
                                'w-full px-3 py-2.5 rounded-lg text-left relative',
                                'transition-all duration-200',
                                isActive
                                  ? 'bg-primary/20 border border-primary/30'
                                  : 'border border-transparent hover:bg-white/[0.04]'
                              )}
                            >
                              <div className="flex items-start justify-between gap-2 min-w-0">
                                <div className="flex-1 min-w-0">
                                  <p className={cn('text-xs font-medium truncate', isActive ? 'text-slate-100' : 'text-slate-200')} title={title}>
                                    {title}
                                  </p>
                                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                    {conv.last_message || 'No messages'}
                                  </p>
                                </div>
                                <span className={cn('text-[10px] flex-shrink-0', isActive ? 'text-slate-300' : 'text-slate-600')}>
                                  {date}
                                </span>
                              </div>

                              <motion.button
                                initial={{ opacity: 0, x: -10 }}
                                whileHover={{ opacity: 1, x: 0 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(conv.id);
                                }}
                                className={cn(
                                  'absolute right-2 top-2.5 p-1.5 rounded-lg',
                                  'text-slate-500 hover:text-red-400',
                                  'bg-white/[0.04] hover:bg-red-500/10',
                                  'border border-transparent hover:border-red-500/20',
                                  'transition-all duration-200',
                                  'opacity-0 group-hover:opacity-100'
                                )}
                                title="Delete conversation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </motion.button>
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConversationList;
