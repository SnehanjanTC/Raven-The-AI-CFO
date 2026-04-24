import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Activity,
  Zap,
  ShieldCheck,
  BarChart3,
  MessageSquare,
  Settings,
  Power,
  Sparkles,
  FileCheck,
  Calendar,
  Scale,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface AgentDetailProps {
  agent: any;
  onClose: () => void;
  onStatusToggle: (id: string) => void;
}

export function AgentDetail({ agent, onClose, onStatusToggle }: AgentDetailProps) {
  if (!agent) return null;

  const Icon = agent.icon;
  const [showConfigModal, setShowConfigModal] = useState(false);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        />

        {/* Panel */}
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-xl bg-surface-container-low border-l border-white/5 shadow-2xl flex flex-col h-full overflow-hidden"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-surface-container/30 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-lg", agent.bg, agent.color)}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-headline text-xl font-bold text-on-surface">{agent.name}</h2>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    agent.status === 'active' ? "bg-tertiary" : 
                    agent.status === 'syncing' ? "bg-yellow-400 animate-pulse" : 
                    "bg-slate-600"
                  )}></span>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    {agent.status === 'active' ? 'System Online' : 
                     agent.status === 'syncing' ? 'Syncing Data' : 
                     'System Standby'}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
            {/* Status & Quick Actions */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-high border border-white/5">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  agent.status === 'active' ? "bg-tertiary/10 text-tertiary" : 
                  agent.status === 'syncing' ? "bg-yellow-400/10 text-yellow-400" :
                  "bg-slate-800 text-slate-500"
                )}>
                  <Power className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface">Agent Status</p>
                  <p className="text-xs text-slate-500 uppercase tracking-tighter">Toggle autonomous execution</p>
                </div>
              </div>
              <button 
                onClick={() => onStatusToggle(agent.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                  agent.status === 'active' 
                    ? "bg-error/10 text-error hover:bg-error/20" 
                    : "bg-tertiary text-on-tertiary hover:opacity-90"
                )}
              >
                {agent.status === 'active' ? 'Deactivate Agent' : 'Activate Agent'}
              </button>
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container rounded-2xl p-5 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Efficiency</span>
                </div>
                <p className="text-2xl font-headline font-extrabold text-on-surface">{agent.efficiency ?? '—'}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-tertiary font-bold">
                  <TrendingUp className="w-3 h-3" />
                  {agent.efficiencyDelta ?? 'No data yet'}
                </div>
              </div>
              <div className="bg-surface-container rounded-2xl p-5 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-tertiary" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Latency</span>
                </div>
                <p className="text-2xl font-headline font-extrabold text-on-surface">{agent.latency ?? '—'}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-tertiary font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  {agent.latencyStatus ?? 'Measuring...'}
                </div>
              </div>
            </div>

            {/* Performance Insights */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Strategic Insights</h3>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-surface-container-highest/30 rounded-2xl p-6 border border-primary/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                <p className="text-sm text-on-surface leading-relaxed italic">
                  "{agent.insight || 'No insights available. Connect data sources to enable analysis.'}"
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase">SIF Validated Analysis</span>
                </div>
              </div>
            </div>

            {/* Indian Compliance Details — shown only for compliance agents */}
            {agent.complianceDetails && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                    <Scale className="w-4 h-4" /> Regulatory Compliance
                  </h3>
                  {agent.region && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                      {agent.region === 'IN' ? '🇮🇳 India' : agent.region}
                    </span>
                  )}
                </div>

                {/* Framework & Act */}
                <div className="bg-surface-container rounded-2xl p-5 border border-white/5 space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Governing Framework</p>
                    <p className="text-sm font-bold text-on-surface">{agent.complianceDetails.framework}</p>
                  </div>
                  {agent.complianceDetails.governingAct && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Applicable Act / Sections</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{agent.complianceDetails.governingAct}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-surface-container-high/50 rounded-xl p-3 border border-white/5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Filing Frequency</p>
                      <p className="text-xs font-bold text-on-surface">{agent.complianceDetails.filingFrequency}</p>
                    </div>
                    {agent.complianceDetails.nextDeadline && (
                      <div className="bg-surface-container-high/50 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Next Deadline</p>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-error" />
                          <p className="text-xs font-bold text-error">{new Date(agent.complianceDetails.nextDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section-wise Compliance Status */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Section-wise Status</p>
                  {agent.complianceDetails.sections.map((sec: any) => (
                    <div key={sec.label} className="flex items-center justify-between p-3 bg-surface-container rounded-xl border border-white/5 group hover:bg-surface-container-high transition-colors">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          sec.status === 'compliant' ? "bg-tertiary" :
                          sec.status === 'pending' ? "bg-yellow-400" :
                          sec.status === 'overdue' ? "bg-error animate-pulse" :
                          "bg-slate-600"
                        )} />
                        <span className="text-xs font-medium text-slate-300 truncate">{sec.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-xs text-slate-400 text-right">{sec.value}</span>
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                          sec.status === 'compliant' ? "bg-tertiary/10 text-tertiary" :
                          sec.status === 'pending' ? "bg-yellow-400/10 text-yellow-400" :
                          sec.status === 'overdue' ? "bg-error/10 text-error" :
                          "bg-slate-800 text-slate-500"
                        )}>
                          {sec.status === 'na' ? 'N/A' : sec.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Overdue Warning */}
                {agent.complianceDetails.sections.some((s: any) => s.status === 'overdue') && (
                  <div className="bg-error/5 border border-error/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-error mb-1">Action Required</p>
                      <p className="text-xs text-error/70 leading-relaxed">
                        {agent.complianceDetails.sections.filter((s: any) => s.status === 'overdue').length} item(s) overdue.
                        Immediate attention needed to avoid penalties and interest under the governing act.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Detailed Metrics */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Operational Metrics</h3>
              <div className="space-y-3">
                {[
                  { label: 'Data Integrity', value: '—', progress: 0, color: 'bg-primary' },
                  { label: 'Execution Accuracy', value: '—', progress: 0, color: 'bg-tertiary' },
                  { label: 'Resource Utilization', value: '—', progress: 0, color: 'bg-secondary' },
                ].map((m) => (
                  <div key={m.label} className="bg-surface-container p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-slate-300">{m.label}</span>
                      <span className="text-xs font-bold text-on-surface">{m.value}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", m.color)} style={{ width: `${m.progress}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity Logs */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recent Activity</h3>
              <div className="space-y-4">
                {agent.status === 'active' ? (
                  [
                    { time: '—', event: 'No activity recorded yet.', status: 'info' },
                  ].map((log, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-1.5",
                          log.status === 'success' ? "bg-tertiary" :
                          log.status === 'warning' ? "bg-error" : "bg-primary"
                        )}></div>
                      </div>
                      <div className="flex-1 pb-4 border-b border-white/5 group-last:border-none">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs font-bold text-on-surface">{log.event}</p>
                          <span className="text-xs font-mono text-slate-500">{log.time}</span>
                        </div>
                        <p className="text-xs text-slate-500 uppercase tracking-tighter">System Information</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-slate-500 uppercase tracking-tighter">No activity recorded yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-8 border-t border-white/5 bg-surface-container/50 flex gap-4">
            <button
              onClick={() => {
                // Navigate to /settings for configure
                window.location.href = '/settings';
              }}
              className="flex-1 py-3 bg-surface-container-highest text-on-surface font-bold rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Configure
            </button>
            <button
              onClick={() => {
                // Navigate to /reports for full report
                window.location.href = '/reports';
              }}
              className="flex-1 py-3 bg-primary text-on-primary font-bold rounded-xl hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Full Report
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
