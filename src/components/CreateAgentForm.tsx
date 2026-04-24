import React, { useState } from 'react';
import { 
  X, 
  Wallet, 
  LineChart, 
  Droplets, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Scale,
  Plus,
  Bot,
  Shield,
  Zap,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface CreateAgentFormProps {
  onClose: () => void;
  onSave: (agent: any) => void;
}

const ICONS = [
  { id: 'wallet', icon: Wallet, label: 'Finance' },
  { id: 'chart', icon: LineChart, label: 'Analytics' },
  { id: 'droplet', icon: Droplets, label: 'Liquidity' },
  { id: 'shield', icon: Shield, label: 'Security' },
  { id: 'zap', icon: Zap, label: 'Performance' },
  { id: 'globe', icon: Globe, label: 'Global' },
  { id: 'scale', icon: Scale, label: 'Compliance' },
  { id: 'bot', icon: Bot, label: 'General' },
];

const TYPES = [
  { id: 'strategic', label: 'Strategic', color: 'text-tertiary', bg: 'bg-tertiary/10' },
  { id: 'analytical', label: 'Analytical', color: 'text-primary', bg: 'bg-primary/10' },
  { id: 'high-priority', label: 'High Priority', color: 'text-tertiary', bg: 'bg-tertiary/10' },
  { id: 'standard', label: 'Standard', color: 'text-slate-500', bg: 'bg-surface-container-highest' },
];

export function CreateAgentForm({ onClose, onSave }: CreateAgentFormProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [type, setType] = useState('standard');
  const [selectedIconId, setSelectedIconId] = useState('bot');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role) return;

    const selectedIcon = ICONS.find(i => i.id === selectedIconId)?.icon || Bot;
    const selectedType = TYPES.find(t => t.id === type) || TYPES[3];

    const newAgent = {
      id: crypto.randomUUID(),
      name,
      role,
      status: 'active',
      lastActive: new Date().toISOString(),
      type,
      icon_name: selectedIconId,
      bg: selectedType.bg,
      color: selectedType.color,
      insight: ''
    };

    onSave(newAgent);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        />

        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-lg bg-surface-container-low border border-white/5 rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <h2 className="font-headline text-xl font-bold text-on-surface">Deploy New Agent</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Agent Designation</label>
                <span className="text-[8px] font-mono text-primary/50">ID: {crypto.randomUUID().substring(0, 8).toUpperCase()}</span>
              </div>
              <input 
                autoFocus
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., AUDIT SENTINEL"
                className="w-full bg-surface-container-high border border-white/5 rounded-xl px-4 py-3 text-on-surface placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-headline font-bold uppercase tracking-tight"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operational Directive</label>
              <input 
                type="text" 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Real-time compliance monitoring"
                className="w-full bg-surface-container-high border border-white/5 rounded-xl px-4 py-3 text-on-surface placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                required
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Strategic Classification</label>
              <div className="grid grid-cols-2 gap-3">
                {TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={cn(
                      "px-4 py-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2",
                      type === t.id 
                        ? "bg-primary/10 border-primary/30 text-primary" 
                        : "bg-surface-container-high border-white/5 text-slate-400 hover:bg-surface-container-highest"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visual Identity</label>
              <div className="grid grid-cols-4 gap-3">
                {ICONS.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setSelectedIconId(i.id)}
                    className={cn(
                      "aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 transition-all",
                      selectedIconId === i.id 
                        ? "bg-tertiary/10 border-tertiary/30 text-tertiary" 
                        : "bg-surface-container-high border-white/5 text-slate-500 hover:bg-surface-container-highest"
                    )}
                  >
                    <i.icon className="w-5 h-5" />
                    <span className="text-[8px] font-bold uppercase tracking-tighter">{i.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-surface-container-highest text-on-surface font-bold rounded-xl hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 py-3 bg-primary text-on-primary font-bold rounded-xl hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
                disabled={!name || !role}
              >
                Initialize Agent
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
