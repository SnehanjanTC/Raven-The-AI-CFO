import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  LayoutDashboard,
  FileText,
  LineChart,
  Users,
  Settings,
  ArrowRight,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  onCopilotMessage?: (message: string) => void;
}

interface Action {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
  action: () => void;
}

export function CommandBar({ isOpen, onClose, onCopilotMessage }: CommandBarProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const actions: Action[] = [
    {
      id: 'dashboard',
      label: 'Go to Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      shortcut: '⇧D',
      action: () => {
        navigate('/dashboard');
        onClose();
      },
    },
    {
      id: 'copilot',
      label: 'Ask AI Copilot',
      icon: <Sparkles className="w-4 h-4" />,
      shortcut: '⇧A',
      action: () => {
        if (onCopilotMessage) {
          onCopilotMessage(searchQuery || 'Help me analyze my portfolio');
        }
        onClose();
      },
    },
    {
      id: 'report',
      label: 'Generate Report',
      icon: <FileText className="w-4 h-4" />,
      shortcut: '⇧R',
      action: () => {
        navigate('/reports');
        onClose();
      },
    },
    {
      id: 'scenario',
      label: 'Run Scenario',
      icon: <LineChart className="w-4 h-4" />,
      shortcut: '⇧S',
      action: () => {
        navigate('/scenarios');
        onClose();
      },
    },
    {
      id: 'agents',
      label: 'View Agents',
      icon: <Users className="w-4 h-4" />,
      shortcut: '⇧V',
      action: () => {
        navigate('/agents');
        onClose();
      },
    },
    {
      id: 'settings',
      label: 'Open Settings',
      icon: <Settings className="w-4 h-4" />,
      shortcut: '⇧,',
      action: () => {
        navigate('/settings');
        onClose();
      },
    },
  ];

  const filteredActions = actions.filter((action) =>
    action.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showAskAi = searchQuery.trim().length > 0 && !filteredActions.some(
    (action) => action.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedResults = showAskAi
    ? [
        {
          id: 'ask-ai',
          label: `Ask AI: ${searchQuery}`,
          icon: <Sparkles className="w-4 h-4" />,
          shortcut: '↵',
          action: () => {
            if (onCopilotMessage) {
              onCopilotMessage(searchQuery);
            }
            onClose();
          },
        },
        ...filteredActions,
      ]
    : filteredActions;

  const hasResults = displayedResults.length > 0 || searchQuery.trim().length === 0;

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const resultsToShow = searchQuery.trim().length === 0 ? actions : displayedResults;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < resultsToShow.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (resultsToShow[selectedIndex]) {
          resultsToShow[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  }, [selectedIndex, displayedResults, searchQuery, actions, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Highlight matching text in results
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={index} className="bg-white/20 font-semibold">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleBackdropClick}
      className={cn(
        'fixed inset-0 z-50 flex items-start justify-center pt-[20vh] transition-opacity duration-200',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        ref={containerRef}
        className={cn(
          'w-full max-w-xl transform transition-all duration-200',
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Command Bar Card */}
        <div
          className={cn(
            'rounded-2xl border border-white/[0.06]',
            'bg-[#1c1c1a]/95 backdrop-blur-xl',
            'shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(229,167,100,0.1)]',
            'overflow-hidden'
          )}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06]">
            <Search className="w-5 h-5 text-white/40 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI, search, or run a command..."
              className={cn(
                'flex-1 bg-transparent text-white text-base',
                'placeholder-white/40 outline-none',
                'font-medium'
              )}
            />
            <div className="flex items-center gap-2 ml-2">
              <kbd
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium',
                  'bg-white/[0.08] text-white/60',
                  'border border-white/[0.1]'
                )}
              >
                ESC
              </kbd>
            </div>
          </div>

          {/* Results Container */}
          <div className="max-h-[420px] overflow-y-auto">
            {searchQuery.trim().length === 0 ? (
              // Quick Actions Section
              <>
                <div className="px-4 py-3 mt-2">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-white/40">
                    Quick Actions
                  </p>
                </div>
                <div className="px-2 pb-2">
                  {actions.map((action, index) => (
                    <button
                      key={action.id}
                      onClick={() => action.action()}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg',
                        'transition-colors duration-150 text-left',
                        index === selectedIndex
                          ? 'bg-white/10 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="text-white/60 flex-shrink-0">
                          {action.icon}
                        </div>
                        <span className="font-medium truncate">
                          {action.label}
                        </span>
                      </div>
                      <kbd
                        className={cn(
                          'ml-3 px-2 py-1 rounded text-xs font-medium whitespace-nowrap flex-shrink-0',
                          'bg-white/[0.08] border border-white/[0.1]',
                          index === selectedIndex
                            ? 'text-white/80 bg-white/[0.12]'
                            : 'text-white/50'
                        )}
                      >
                        {action.shortcut}
                      </kbd>
                    </button>
                  ))}
                </div>
              </>
            ) : hasResults ? (
              // Search Results
              <div className="px-2 py-2">
                {displayedResults.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => result.action()}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-lg',
                      'transition-colors duration-150 text-left',
                      index === selectedIndex
                        ? 'bg-white/10 text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="text-white/60 flex-shrink-0">
                        {result.icon}
                      </div>
                      <span className="font-medium truncate">
                        {result.id === 'ask-ai'
                          ? result.label
                          : highlightMatch(result.label, searchQuery)}
                      </span>
                    </div>
                    <kbd
                      className={cn(
                        'ml-3 px-2 py-1 rounded text-xs font-medium whitespace-nowrap flex-shrink-0',
                        'bg-white/[0.08] border border-white/[0.1]',
                        index === selectedIndex
                          ? 'text-white/80 bg-white/[0.12]'
                          : 'text-white/50'
                      )}
                    >
                      {result.shortcut}
                    </kbd>
                  </button>
                ))}
              </div>
            ) : (
              // No Results
              <div className="px-4 py-12 flex flex-col items-center justify-center gap-3">
                <div className="text-white/30">
                  <ArrowRight className="w-8 h-8" />
                </div>
                <p className="text-sm text-white/50 text-center">
                  No actions found for "{searchQuery}"
                </p>
              </div>
            )}
          </div>

          {/* Footer Hint */}
          {(searchQuery.trim().length === 0 || hasResults) && (
            <div
              className={cn(
                'px-4 py-3 border-t border-white/[0.06]',
                'flex items-center justify-between text-xs text-white/40'
              )}
            >
              <div className="flex items-center gap-2">
                <Command className="w-3.5 h-3.5" />
                <span>to select</span>
              </div>
              <div className="flex items-center gap-2">
                <span>powered by FinOS</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
