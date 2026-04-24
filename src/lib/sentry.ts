/**
 * Sentry error tracking initialization for Raven frontend
 * Captures unhandled exceptions, promise rejections, and user interactions
 */

/**
 * Initialize Sentry error tracking
 * Only initializes if VITE_SENTRY_DSN is configured
 *
 * Should be called early in application lifecycle (in App.tsx)
 */
export function initSentry(): void {
  // Only initialize if DSN is configured
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.debug('Sentry DSN not configured, error tracking disabled');
    return;
  }

  // Dynamically import Sentry to avoid bundling it if unused
  import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      // Integrations
      integrations: [
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

      // Ignore certain errors that are not actionable
      beforeSend(event, hint) {
        // Ignore network errors (often user connection issues)
        if (event.exception) {
          const error = hint.originalException;
          if (error instanceof Error) {
            if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
              return null;
            }
          }
        }

        // Ignore browser extension errors
        if (event.exception) {
          const orig = hint.originalException;
          const stack = orig instanceof Error ? (orig.stack || '') : '';
          if (stack.includes('chrome-extension://') || stack.includes('moz-extension://')) {
            return null;
          }
        }

        return event;
      },
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      Sentry.captureException(event.reason);
    });

    console.debug('Sentry error tracking initialized');
  });
}

/**
 * Manually capture an exception
 * @param error - The error to capture
 * @param context - Additional context to include
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  import('@sentry/react').then((Sentry) => {
    if (context) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value as Record<string, unknown>);
        });
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  });
}

/**
 * Manually capture a message
 * @param message - The message to capture
 * @param level - The severity level (fatal, error, warning, info, debug)
 */
export function captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'): void {
  import('@sentry/react').then((Sentry) => {
    Sentry.captureMessage(message, level);
  });
}

/**
 * Set user context for error tracking
 * @param userId - The user ID
 * @param email - The user email
 * @param name - The user name
 */
export function setSentryUser(userId: string, email?: string, name?: string): void {
  import('@sentry/react').then((Sentry) => {
    Sentry.setUser({
      id: userId,
      email,
      username: name,
    });
  });
}

/**
 * Clear user context
 */
export function clearSentryUser(): void {
  import('@sentry/react').then((Sentry) => {
    Sentry.setUser(null);
  });
}

/**
 * Create an error boundary component with Sentry integration
 * Usage: Wrap your app with <SentryErrorBoundary fallback={<ErrorPage />}>...</SentryErrorBoundary>
 */
export async function createSentryErrorBoundary() {
  const { ErrorBoundary } = await import('@sentry/react');
  return ErrorBoundary;
}
