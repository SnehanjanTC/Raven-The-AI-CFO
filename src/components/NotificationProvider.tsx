import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Zap, 
  Bell,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'ai';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
}

interface NotificationContextType {
  notify: (n: Omit<Notification, 'id'>) => void;
  remove: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const remove = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const notify = useCallback((n: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { ...n, id }]);
    
    if (n.duration !== 0) {
      setTimeout(() => remove(id), n.duration || 5000);
    }
  }, [remove]);

  return (
    <NotificationContext.Provider value={{ notify, remove }}>
      {children}
      <div className="fixed bottom-8 right-8 z-[200] space-y-4 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto"
            >
              <div className={cn(
                "relative overflow-hidden rounded-2xl border p-5 shadow-2xl backdrop-blur-xl transition-all",
                n.type === 'success' ? "bg-tertiary/10 border-tertiary/20" :
                n.type === 'error' ? "bg-error/10 border-error/20" :
                n.type === 'ai' ? "bg-primary/10 border-primary/20" :
                "bg-surface-container-high/80 border-white/10"
              )}>
                {/* Glow Effect */}
                <div className={cn(
                  "absolute -top-10 -right-10 w-24 h-24 blur-3xl opacity-20",
                  n.type === 'success' ? "bg-tertiary" :
                  n.type === 'error' ? "bg-error" :
                  n.type === 'ai' ? "bg-primary" : "bg-slate-400"
                )}></div>

                <div className="flex gap-4 relative z-10">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    n.type === 'success' ? "bg-tertiary/20 text-tertiary" :
                    n.type === 'error' ? "bg-error/20 text-error" :
                    n.type === 'ai' ? "bg-primary/20 text-primary" :
                    "bg-slate-800 text-slate-400"
                  )}>
                    {n.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                    {n.type === 'error' && <AlertCircle className="w-5 h-5" />}
                    {n.type === 'info' && <Info className="w-5 h-5" />}
                    {n.type === 'warning' && <Bell className="w-5 h-5" />}
                    {n.type === 'ai' && <Sparkles className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest mb-1">{n.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>
                  </div>

                  <button 
                    onClick={() => remove(n.id)}
                    className="text-slate-600 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Progress Bar */}
                {n.duration !== 0 && (
                  <motion.div 
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: (n.duration || 5000) / 1000, ease: 'linear' }}
                    className={cn(
                      "absolute bottom-0 left-0 h-0.5 w-full origin-left",
                      n.type === 'success' ? "bg-tertiary/40" :
                      n.type === 'error' ? "bg-error/40" :
                      n.type === 'ai' ? "bg-primary/40" : "bg-slate-500/40"
                    )}
                  />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
}
