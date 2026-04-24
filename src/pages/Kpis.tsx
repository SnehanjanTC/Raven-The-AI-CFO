import React, { useMemo, useState, useEffect } from 'react';
import { Plus, Trash2, Save, Play, AlertCircle, Sparkles, Variable, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDemoSummary, isDemoDataLoaded, formatCurrency } from '@/lib/demo-data';

const STORAGE_KEY = 'raven_custom_kpis';

type KPI = {
  id: string;
  name: string;
  description?: string;
  formula: string;
  unit: 'currency' | 'percent' | 'number' | 'months';
  createdAt: string;
};

type VarMap = Record<string, number>;

const VARIABLE_DOCS: Array<{ name: keyof ReturnType<typeof buildVars>; label: string }> = [
  { name: 'mrr', label: 'Monthly Recurring Revenue (₹)' },
  { name: 'arr', label: 'Annualized Run Rate (₹)' },
  { name: 'burn', label: 'Monthly burn (₹)' },
  { name: 'cash', label: 'Cash balance (₹)' },
  { name: 'runway', label: 'Runway (months)' },
  { name: 'grossMargin', label: 'Gross margin (%)' },
  { name: 'revenue', label: 'Total revenue last period (₹)' },
  { name: 'expenses', label: 'Total expenses last period (₹)' },
];

function buildVars(): VarMap {
  if (isDemoDataLoaded()) {
    const s: any = getDemoSummary();
    return {
      mrr: Number(s.mrr) || 0,
      arr: Number(s.arrProjection) || 0,
      burn: Number(s.monthlyBurn) || 0,
      cash: Number(s.cashBalance) || 0,
      runway: Number(s.runway) || 0,
      grossMargin: Number(s.grossMargin) || 0,
      revenue: (Number(s.mrr) || 0) * 3,
      expenses: (Number(s.monthlyBurn) || 0) * 3,
    };
  }
  return {
    mrr: 800000, arr: 9600000, burn: 520000, cash: 9360000,
    runway: 18, grossMargin: 62.5, revenue: 2400000, expenses: 1560000,
  };
}

const SAFE_FORMULA = /^[a-zA-Z0-9_+\-*/().,\s]+$/;

function evaluateFormula(formula: string, vars: VarMap): { value: number | null; error?: string } {
  const trimmed = formula.trim();
  if (!trimmed) return { value: null, error: 'Formula is empty' };
  if (!SAFE_FORMULA.test(trimmed)) {
    return { value: null, error: 'Formula contains invalid characters' };
  }
  try {
    const argNames = Object.keys(vars);
    const argValues = argNames.map((k) => vars[k]);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...argNames, `"use strict"; return (${trimmed});`);
    const result = fn(...argValues);
    if (typeof result !== 'number' || !isFinite(result)) {
      return { value: null, error: 'Result is not a finite number' };
    }
    return { value: result };
  } catch (e: any) {
    return { value: null, error: e?.message || 'Evaluation failed' };
  }
}

function formatValue(n: number, unit: KPI['unit']): string {
  if (unit === 'currency') return formatCurrency(n);
  if (unit === 'percent') return `${(Math.round(n * 100) / 100).toFixed(2)}%`;
  if (unit === 'months') return `${Math.round(n * 10) / 10} mo`;
  return (Math.round(n * 100) / 100).toLocaleString();
}

function loadKpis(): KPI[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveKpis(list: KPI[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

const PRESETS: Array<Omit<KPI, 'id' | 'createdAt'>> = [
  { name: 'Gross Margin', formula: '(revenue - expenses) / revenue * 100', unit: 'percent', description: 'Revenue left after direct costs.' },
  { name: 'Rule of 40', formula: 'grossMargin + (mrr * 12 / arr - 1) * 100', unit: 'number', description: 'Growth + margin benchmark for SaaS.' },
  { name: 'Burn Multiple', formula: 'burn / mrr', unit: 'number', description: 'How efficiently you burn per ₹ of MRR.' },
  { name: 'Months to Default', formula: 'cash / burn', unit: 'months', description: 'Alternative runway calc.' },
];

export function Kpis() {
  const [vars, setVars] = useState<VarMap>(() => buildVars());
  const [kpis, setKpis] = useState<KPI[]>(() => loadKpis());

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formula, setFormula] = useState('');
  const [unit, setUnit] = useState<KPI['unit']>('number');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { saveKpis(kpis); }, [kpis]);
  useEffect(() => { setVars(buildVars()); }, []);

  const preview = useMemo(() => evaluateFormula(formula, vars), [formula, vars]);

  const reset = () => {
    setName(''); setDescription(''); setFormula(''); setUnit('number'); setEditingId(null);
  };

  const save = () => {
    if (!name.trim() || !formula.trim()) return;
    if (preview.error) return;
    if (editingId) {
      setKpis((list) => list.map((k) => k.id === editingId ? { ...k, name: name.trim(), description: description.trim(), formula: formula.trim(), unit } : k));
    } else {
      setKpis((list) => [
        ...list,
        { id: crypto.randomUUID(), name: name.trim(), description: description.trim(), formula: formula.trim(), unit, createdAt: new Date().toISOString() },
      ]);
    }
    reset();
  };

  const edit = (k: KPI) => {
    setEditingId(k.id); setName(k.name); setDescription(k.description || ''); setFormula(k.formula); setUnit(k.unit);
  };

  const remove = (id: string) => {
    setKpis((list) => list.filter((k) => k.id !== id));
    if (editingId === id) reset();
  };

  const applyPreset = (p: typeof PRESETS[number]) => {
    setName(p.name); setDescription(p.description || ''); setFormula(p.formula); setUnit(p.unit); setEditingId(null);
  };

  const insertVariable = (v: string) => {
    setFormula((f) => f + (f && !/[\s+\-*/(,]$/.test(f) ? ' ' : '') + v);
  };

  return (
    <div className="max-w-6xl mx-auto pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Custom KPI Builder</h1>
        <p className="text-sm text-slate-400 mt-1">
          Define your own metrics with formulas. Live-preview the value against {isDemoDataLoaded() ? 'your demo data' : 'sample defaults'}.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Builder */}
        <section className="lg:col-span-2 space-y-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-[#00F0A0]" />
              {editingId ? 'Edit KPI' : 'New KPI'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1.5">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Burn Multiple"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1.5">Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as KPI['unit'])}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 focus:outline-none focus:border-[#00F0A0]/40"
                >
                  <option value="number">Number</option>
                  <option value="percent">Percent (%)</option>
                  <option value="currency">Currency (₹)</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1.5">Description (optional)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this KPI measure?"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
              />
            </div>

            <div className="mb-2">
              <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1.5">Formula</label>
              <textarea
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="(revenue - expenses) / revenue * 100"
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {VARIABLE_DOCS.map((v) => (
                  <button
                    key={v.name}
                    onClick={() => insertVariable(v.name as string)}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-300 hover:bg-white/[0.08] transition"
                    title={v.label}
                  >
                    <Variable className="h-3 w-3 text-[#00F0A0]" />
                    <span className="font-mono">{v.name as string}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className={cn(
              'mt-4 px-4 py-3 rounded-lg border',
              preview.error
                ? 'bg-red-500/5 border-red-500/20'
                : preview.value === null
                  ? 'bg-white/[0.02] border-white/[0.06]'
                  : 'bg-[#00F0A0]/5 border-[#00F0A0]/20'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                  <Play className="h-3 w-3" />
                  Live preview
                </div>
                {preview.error ? (
                  <span className="inline-flex items-center gap-1 text-xs text-red-300">
                    <AlertCircle className="h-3 w-3" />
                    {preview.error}
                  </span>
                ) : preview.value !== null ? (
                  <span className="text-xl font-semibold text-[#00F0A0] font-mono">
                    {formatValue(preview.value, unit)}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Enter a formula to preview</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={save}
                disabled={!name.trim() || !formula.trim() || !!preview.error}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00F0A0] hover:bg-[#00D890] disabled:bg-white/[0.04] disabled:text-slate-500 disabled:cursor-not-allowed text-black text-sm font-medium transition"
              >
                <Save className="h-4 w-4" />
                {editingId ? 'Update KPI' : 'Save KPI'}
              </button>
              {editingId && (
                <button
                  onClick={reset}
                  className="px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 text-sm transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Presets */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#00F0A0]" />
              Starter templates
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="text-left px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] transition"
                >
                  <p className="text-sm text-slate-200">{p.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{p.formula}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Saved KPIs */}
        <aside className="lg:col-span-1">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 sticky top-20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-100">Your KPIs</h3>
              <span className="text-xs text-slate-500">{kpis.length}</span>
            </div>
            {kpis.length === 0 ? (
              <div className="text-center py-10">
                <Plus className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No custom KPIs yet. Start from a template →</p>
              </div>
            ) : (
              <div className="space-y-2">
                {kpis.map((k) => {
                  const result = evaluateFormula(k.formula, vars);
                  return (
                    <div
                      key={k.id}
                      className={cn(
                        'px-3 py-2 rounded-lg border transition',
                        editingId === k.id
                          ? 'bg-white/[0.06] border-[#00F0A0]/30'
                          : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-100 truncate">{k.name}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{k.formula}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {result.error ? (
                            <span className="text-xs text-red-300">error</span>
                          ) : result.value !== null ? (
                            <span className="text-sm font-mono text-[#00F0A0]">{formatValue(result.value, k.unit)}</span>
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => edit(k)}
                          className="flex-1 text-xs px-2 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 border border-white/[0.06]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(k.id)}
                          className="text-xs px-2 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Kpis;
