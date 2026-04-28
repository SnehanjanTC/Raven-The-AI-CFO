import React, { Suspense, useEffect, useState, useCallback, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ChatLayout } from './layouts/ChatLayout';
import { CommandBar } from './components/CommandBar';
import { AIChatSidebar } from './components/AIChatSidebar';
import { Login } from './pages/Login';
import { NotificationProvider, useNotifications } from './components/NotificationProvider';
import { AuthProvider, useAuth, CompanyProfileProvider, useCompanyProfileContext } from '@/shared/contexts';
import { ErrorBoundary } from '@/shared/errors';
import { PageLoader } from '@/shared/ui';
import { initSentry } from '@/lib/sentry';

// Initialize Sentry error tracking early
initSentry();

// Lazy-loaded route components for code splitting
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Reports = React.lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Scenarios = React.lazy(() => import('./pages/Scenarios').then(m => ({ default: m.Scenarios })));
const Ledger = React.lazy(() => import('./pages/Ledger').then(m => ({ default: m.Ledger })));
const Chat = React.lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Integrations = React.lazy(() => import('./pages/Integrations').then(m => ({ default: m.Integrations })));
const Kpis = React.lazy(() => import('./pages/Kpis').then(m => ({ default: m.Kpis })));
const Privacy = React.lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Terms = React.lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Onboarding = lazy(() => import('@/pages/Onboarding'));

/**
 * Route guard: redirects new users to onboarding if their profile is empty.
 * Wraps authenticated route content.
 */
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading, completeness } = useCompanyProfileContext();
  const location = useLocation();

  // Don't redirect while profile is loading, or if already on onboarding/settings
  const skipPaths = ['/onboarding', '/settings', '/login', '/privacy', '/terms'];
  if (loading || skipPaths.some(p => location.pathname.startsWith(p))) {
    return <>{children}</>;
  }

  // Redirect if profile is essentially empty (no company name and completeness is 0)
  if (!profile.companyName && completeness === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiChatInitialMessage, setAiChatInitialMessage] = useState<string | undefined>();
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
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500 tracking-widest uppercase">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-on-primary focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to main content
      </a>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/chat" replace /> : <Login />}
        />
      {/* Privacy and Terms pages - no auth required */}
      <Route
        path="/privacy"
        element={
          <Suspense fallback={<PageLoader />}>
            <Privacy />
          </Suspense>
        }
      />
      <Route
        path="/terms"
        element={
          <Suspense fallback={<PageLoader />}>
            <Terms />
          </Suspense>
        }
      />
      <Route
        path="/onboarding"
        element={
          <Suspense fallback={<PageLoader />}>
            <Onboarding />
          </Suspense>
        }
      />
      {/* All authenticated routes share ChatLayout as the shell */}
      <Route
        path="/*"
        element={
          isAuthenticated ? (
            <OnboardingGuard>
            <ChatLayout
              commandBarOpen={commandBarOpen}
              onCommandBarOpenChange={setCommandBarOpen}
              aiChatOpen={aiChatOpen}
              onAIChatOpenChange={setAiChatOpen}
              aiChatInitialMessage={aiChatInitialMessage}
              onCopilotMessage={handleCopilotMessage}
              currentPage={currentPage}
            >
              <ErrorBoundary resetKey={currentPage}>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/scenarios" element={<Scenarios />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/ledger" element={<Ledger />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/integrations" element={<Integrations />} />
                    <Route path="/kpis" element={<Kpis />} />
                    <Route path="/" element={<Navigate to="/chat" replace />} />
                    <Route path="*" element={<Navigate to="/chat" replace />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </ChatLayout>
            </OnboardingGuard>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      </Routes>

      {/* Command Bar (⌘K) - shared across all routes */}
      {isAuthenticated && (
        <CommandBar
          isOpen={commandBarOpen}
          onClose={() => setCommandBarOpen(false)}
          onCopilotMessage={handleCopilotMessage}
        />
      )}

      {/* AI Chat Sidebar — page-aware */}
      {isAuthenticated && (
        <AIChatSidebar
          isOpen={aiChatOpen}
          onClose={() => { setAiChatOpen(false); setAiChatInitialMessage(undefined); }}
          initialMessage={aiChatInitialMessage}
          currentPage={currentPage}
        />
      )}
    </>
  );
}

function AuthNotificationBridge({ children }: { children: React.ReactNode }) {
  const { notify } = useNotifications();

  const handleAuthChange = useCallback((session: any) => {
    if (session) {
      notify({
        type: 'success',
        title: 'Session Active',
        message: 'Connected to Raven.',
      });
    }
  }, [notify]);

  return (
    <AuthProvider onAuthChange={handleAuthChange}>
      <CompanyProfileProvider>
        {children}
      </CompanyProfileProvider>
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
