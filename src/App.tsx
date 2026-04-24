import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { CommandBar } from './components/CommandBar';
import { AIChatSidebar } from './components/AIChatSidebar';
import { Login } from './pages/Login';
import { NotificationProvider, useNotifications } from './components/NotificationProvider';
import { AuthProvider, useAuth } from '@/shared/contexts';
import { ErrorBoundary } from '@/shared/errors';
import { PageLoader } from '@/shared/ui';

// Lazy-loaded route components for code splitting
const Home = React.lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Copilot = React.lazy(() => import('./pages/Copilot').then(m => ({ default: m.Copilot })));
const Agents = React.lazy(() => import('./pages/Agents').then(m => ({ default: m.Agents })));
const Reports = React.lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Scenarios = React.lazy(() => import('./pages/Scenarios').then(m => ({ default: m.Scenarios })));
const Memory = React.lazy(() => import('./pages/Memory').then(m => ({ default: m.Memory })));
const Integrations = React.lazy(() => import('./pages/Integrations').then(m => ({ default: m.Integrations })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Ledger = React.lazy(() => import('./pages/Ledger').then(m => ({ default: m.Ledger })));

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiChatInitialMessage, setAiChatInitialMessage] = useState<string | undefined>();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const location = useLocation();
  const currentPage = location.pathname;

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandBarOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCopilotMessage = useCallback((message: string) => {
    setCommandBarOpen(false);
    setAiChatInitialMessage(message);
    setAiChatOpen(true);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111110] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500 tracking-widest uppercase">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/*"
        element={
          isAuthenticated ? (
            <div className="min-h-screen bg-background text-on-background font-body">
              {/* Slim icon sidebar */}
              <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                onExpandChange={setSidebarExpanded}
              />

              {/* Main content area — offset by sidebar width */}
              <div className={`min-h-screen flex flex-col transition-all duration-300 ${sidebarExpanded ? 'lg:ml-[220px]' : 'lg:ml-[72px]'}`}>
                <TopNav
                  onMenuClick={() => setSidebarOpen(true)}
                  onCommandBarOpen={() => setCommandBarOpen(true)}
                  onAIChatOpen={() => setAiChatOpen(true)}
                />

                <main className="flex-1 pb-8 px-4 md:px-8 overflow-x-hidden">
                  <ErrorBoundary resetKey={currentPage}>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/copilot" element={<Copilot />} />
                        <Route path="/agents" element={<Agents />} />
                        <Route path="/scenarios" element={<Scenarios />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/memory" element={<Memory />} />
                        <Route path="/integrations" element={<Integrations />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/ledger" element={<Ledger />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </Suspense>
                  </ErrorBoundary>
                </main>
              </div>

              {/* Command Bar (⌘K) */}
              <CommandBar
                isOpen={commandBarOpen}
                onClose={() => setCommandBarOpen(false)}
                onCopilotMessage={handleCopilotMessage}
              />

              {/* AI Chat Sidebar — page-aware */}
              <AIChatSidebar
                isOpen={aiChatOpen}
                onClose={() => { setAiChatOpen(false); setAiChatInitialMessage(undefined); }}
                initialMessage={aiChatInitialMessage}
                currentPage={currentPage}
              />
            </div>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function AuthNotificationBridge({ children }: { children: React.ReactNode }) {
  const { notify } = useNotifications();

  const handleAuthChange = useCallback((session: any) => {
    if (session) {
      notify({
        type: 'success',
        title: 'Session Active',
        message: 'Connected to FinOS.',
      });
    }
  }, [notify]);

  return (
    <AuthProvider onAuthChange={handleAuthChange}>
      {children}
    </AuthProvider>
  );
}

function App() {
  return (
    <Router>
      <NotificationProvider>
        <AuthNotificationBridge>
          <AppContent />
        </AuthNotificationBridge>
      </NotificationProvider>
    </Router>
  );
}

export default App;
