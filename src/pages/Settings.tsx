import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  KeyRound,
  Database,
  LogOut,
  Save,
  Trash2,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/shared/contexts';
import {
  isDemoDataLoaded,
  loadDemoData,
  clearDemoData,
  onDemoDataChange,
} from '@/lib/demo-data';
import { CompanyProfile, computeProfileCompleteness } from '@/types/company-profile';
import { companyProfileAPI } from '@/lib/company-profile-api';

type Tab = 'company' | 'profile' | 'ai' | 'data';

const ANTHROPIC_KEY_STORAGE = 'raven_anthropic_key';

export function Settings() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('company');

  return (
    <div className="max-w-5xl mx-auto pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your account, AI provider keys, and local data.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="md:w-56 shrink-0 flex md:flex-col gap-1">
          <TabButton active={tab === 'company'} onClick={() => setTab('company')} icon={<Building2 className="h-4 w-4" />} label="Company Profile" />
          <TabButton active={tab === 'profile'} onClick={() => setTab('profile')} icon={<UserIcon className="h-4 w-4" />} label="Profile & Account" />
          <TabButton active={tab === 'ai'} onClick={() => setTab('ai')} icon={<KeyRound className="h-4 w-4" />} label="AI & API Keys" />
          <TabButton active={tab === 'data'} onClick={() => setTab('data')} icon={<Database className="h-4 w-4" />} label="Data & Preferences" />
        </nav>

        <section className="flex-1 min-w-0">
          {tab === 'company' && <CompanyProfilePanel />}
          {tab === 'profile' && <ProfilePanel user={user} signOut={signOut} />}
          {tab === 'ai' && <AIKeyPanel />}
          {tab === 'data' && <DataPanel />}
        </section>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
        'transition-colors',
        active
          ? 'bg-white/[0.06] text-slate-100 border border-white/[0.08]'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 mb-4">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-white/[0.04] last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm text-slate-200">{value}</span>
    </div>
  );
}

interface EditableField {
  key: keyof CompanyProfile;
  label: string;
  type: 'text' | 'number' | 'select' | 'toggle' | 'date';
  options?: Array<{ value: string; label: string }>;
}

type SectionKey = 'basics' | 'business' | 'funding' | 'unitEconomics' | 'customers' | 'team' | 'goals' | 'compliance';

function CompanyProfilePanel() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(new Set(['basics']));
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  const [savingSection, setSavingSection] = useState<SectionKey | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<SectionKey | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const data = await companyProfileAPI.get();
        setProfile(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load company profile');
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const toggleSection = (section: SectionKey) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleFieldChange = (key: keyof CompanyProfile, value: any) => {
    setProfile(prev => prev ? { ...prev, [key]: value } : null);
    setDirtyFields(prev => new Set(prev).add(key));
  };

  const handleSaveSection = async (section: SectionKey, fieldsInSection: (keyof CompanyProfile)[]) => {
    if (!profile) return;

    const dirty = Array.from(dirtyFields).filter(f => fieldsInSection.includes(f as keyof CompanyProfile));
    if (dirty.length === 0) return;

    setSavingSection(section);
    try {
      const updates: Partial<CompanyProfile> = {};
      dirty.forEach(field => {
        updates[field as keyof CompanyProfile] = profile[field as keyof CompanyProfile];
      });

      const updated = await companyProfileAPI.update(updates);
      setProfile(updated);
      setDirtyFields(prev => {
        const newDirty = new Set(prev);
        dirty.forEach(f => newDirty.delete(f));
        return newDirty;
      });
      setSaveSuccess(section);
      setTimeout(() => setSaveSuccess(null), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSavingSection(section);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#00F0A0]" />
          <p className="text-sm text-slate-400">Loading company profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <Card title="Error" description="Unable to load company profile">
        <div className="flex items-start gap-3 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      </Card>
    );
  }

  if (!profile) return null;

  const completeness = computeProfileCompleteness(profile);
  const completenessColor = completeness > 70 ? 'bg-green-500' : completeness > 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-500/5 border border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <Card title="Profile Completeness" description="Track how complete your company profile is.">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Profile Completeness: {completeness}%</span>
          </div>
          <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all duration-300', completenessColor)}
              style={{ width: `${completeness}%` }}
            />
          </div>
          {profile.lastReviewedAt && (
            <p className="text-xs text-slate-500 mt-2">
              Last reviewed: {new Date(profile.lastReviewedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </Card>

      <CompanyBasicsSection profile={profile} onFieldChange={handleFieldChange} onSave={() => handleSaveSection('basics', ['companyName', 'entityType', 'industryVertical', 'industrySubSector', 'incorporationDate'])} expanded={expandedSections.has('basics')} onToggle={() => toggleSection('basics')} saving={savingSection === 'basics'} saved={saveSuccess === 'basics'} dirtyCount={Array.from(dirtyFields).filter(f => ['companyName', 'entityType', 'industryVertical', 'industrySubSector', 'incorporationDate'].includes(f)).length} />

      <BusinessModelSection profile={profile} onFieldChange={handleFieldChange} onSave={() => handleSaveSection('business', ['businessModel', 'revenueModel', 'avgDealSize', 'avgContractLengthMonths'])} expanded={expandedSections.has('business')} onToggle={() => toggleSection('business')} saving={savingSection === 'business'} saved={saveSuccess === 'business'} dirtyCount={Array.from(dirtyFields).filter(f => ['businessModel', 'revenueModel', 'avgDealSize', 'avgContractLengthMonths'].includes(f)).length} />

      <FundingCashSection profile={profile} onFieldChange={handleFieldChange} onSave={() => handleSaveSection('funding', ['fundingStage', 'lastRaiseAmount', 'totalCapitalRaised', 'cashReserves', 'monthlyBurnRate', 'monthlyRevenue', 'runwayTargetMonths'])} expanded={expandedSections.has('funding')} onToggle={() => toggleSection('funding')} saving={savingSection === 'funding'} saved={saveSuccess === 'funding'} dirtyCount={Array.from(dirtyFields).filter(f => ['fundingStage', 'lastRaiseAmount', 'totalCapitalRaised', 'cashReserves', 'monthlyBurnRate', 'monthlyRevenue', 'runwayTargetMonths'].includes(f)).length} />

      <UnitEconomicsSection profile={profile} onFieldChange={handleFieldChange} onSave={() => handleSaveSection('unitEconomics', ['cac', 'ltv', 'paybackPeriodMonths', 'grossMarginTarget', 'netMarginTarget'])} expanded={expandedSections.has('unitEconomics')} onToggle={() => toggleSection('unitEconomics')} saving={savingSection === 'unitEconomics'} saved={saveSuccess === 'unitEconomics'} dirtyCount={Array.from(dirtyFields).filter(f => ['cac', 'ltv', 'paybackPeriodMonths', 'grossMarginTarget', 'netMarginTarget'].includes(f)).length} />

      <CustomersSection profile={profile} onFieldChange={handleFieldChange} onSave={() => handleSaveSection('customers', ['customerType', 'customerSegment', 'avgContractValue', 'monthlyChurnRate'])} expanded={expandedSections.has('customers')} onToggle={() => toggleSection('customers')} saving={savingSection === 'customers'} saved={saveSuccess === 'customers'} dirtyCount={Array.from(dirtyFields).filter(f => ['customerType', 'customerSegment', 'avgContractValue', 'monthlyChurnRate'].includes(f)).length} />

      <TeamSection profile={profile} onFieldChange={handleFieldChange} onSave={() => handleSaveSection('team', ['teamSize', 'engineeringHeadcount', 'salesHeadcount', 'opsHeadcount', 'contractorCount'])} expanded={expandedSections.has('team')} onToggle={() => toggleSection('team')} saving={savingSection === 'team'} saved={saveSuccess === 'team'} dirtyCount={Array.from(dirtyFields).filter(f => ['teamSize', 'engineeringHeadcount', 'salesHeadcount', 'opsHeadcount', 'contractorCount'].includes(f)).length} />

      <GoalsSection profile={profile} onFieldChange={handleFieldChange} onSave={() => handleSaveSection('goals', ['nextFundraiseDate', 'profitabilityTargetDate', 'revenueTarget3m', 'revenueTarget6m', 'revenueTarget12m', 'exitStrategy'])} expanded={expandedSections.has('goals')} onToggle={() => toggleSection('goals')} saving={savingSection === 'goals'} saved={saveSuccess === 'goals'} dirtyCount={Array.from(dirtyFields).filter(f => ['nextFundraiseDate', 'profitabilityTargetDate', 'revenueTarget3m', 'revenueTarget6m', 'revenueTarget12m', 'exitStrategy'].includes(f)).length} />

      <ComplianceSection profile={profile} onFieldChange={handleFieldChange} onSave={() => handleSaveSection('compliance', ['operatingStates', 'hasGSTRegistration', 'hasTANRegistration', 'gstin', 'pan', 'auditorAppointed', 'statutoryAuditRequired', 'currentFY'])} expanded={expandedSections.has('compliance')} onToggle={() => toggleSection('compliance')} saving={savingSection === 'compliance'} saved={saveSuccess === 'compliance'} dirtyCount={Array.from(dirtyFields).filter(f => ['operatingStates', 'hasGSTRegistration', 'hasTANRegistration', 'gstin', 'pan', 'auditorAppointed', 'statutoryAuditRequired', 'currentFY'].includes(f)).length} />
    </div>
  );
}

interface SectionProps {
  profile: CompanyProfile;
  onFieldChange: (key: keyof CompanyProfile, value: any) => void;
  onSave: () => Promise<void>;
  expanded: boolean;
  onToggle: () => void;
  saving: boolean;
  saved: boolean;
  dirtyCount: number;
}

function CompanyBasicsSection({ profile, onFieldChange, onSave, expanded, onToggle, saving, saved, dirtyCount }: SectionProps) {
  return (
    <Card title="">
      <div className="space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            Company Basics
            {dirtyCount > 0 && <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#00F0A0]/20 text-[#00F0A0] text-xs font-medium">{dirtyCount}</span>}
          </h3>
          <button className="text-slate-400 hover:text-slate-200 transition">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        {expanded && (
          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            <EditableField label="Company Name" value={profile.companyName || ''} onChange={(v) => onFieldChange('companyName', v)} type="text" />
            <EditableField label="Entity Type" value={profile.entityType || ''} onChange={(v) => onFieldChange('entityType', v)} type="select" options={[{ value: 'pvt_ltd', label: 'Pvt Ltd' }, { value: 'llp', label: 'LLP' }, { value: 'opc', label: 'OPC' }, { value: 'partnership', label: 'Partnership' }, { value: 'sole_proprietor', label: 'Sole Proprietor' }]} />
            <EditableField label="Industry Vertical" value={profile.industryVertical || ''} onChange={(v) => onFieldChange('industryVertical', v)} type="select" options={[{ value: 'fintech', label: 'Fintech' }, { value: 'healthtech', label: 'Healthtech' }, { value: 'edtech', label: 'Edtech' }, { value: 'ecommerce', label: 'Ecommerce' }, { value: 'saas', label: 'SaaS' }, { value: 'marketplace', label: 'Marketplace' }, { value: 'deeptech', label: 'Deeptech' }, { value: 'agritech', label: 'Agritech' }, { value: 'cleantech', label: 'Cleantech' }, { value: 'logistics', label: 'Logistics' }, { value: 'media', label: 'Media' }, { value: 'gaming', label: 'Gaming' }, { value: 'other', label: 'Other' }]} />
            <EditableField label="Sub-Sector" value={profile.industrySubSector || ''} onChange={(v) => onFieldChange('industrySubSector', v)} type="text" />
            <EditableField label="Incorporation Date" value={profile.incorporationDate || ''} onChange={(v) => onFieldChange('incorporationDate', v)} type="date" />
            <button onClick={onSave} disabled={saving || dirtyCount === 0} className={cn('mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition', dirtyCount > 0 ? 'bg-[#00F0A0] hover:bg-[#00D890] text-black' : 'bg-white/[0.03] text-slate-500 cursor-not-allowed')}>
              {saved ? <><Check className="h-4 w-4" /> Saved</> : saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : <><Save className="h-4 w-4" /> Save Changes</>}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

function BusinessModelSection({ profile, onFieldChange, onSave, expanded, onToggle, saving, saved, dirtyCount }: SectionProps) {
  return (
    <Card title="">
      <div className="space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            Business Model
            {dirtyCount > 0 && <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#00F0A0]/20 text-[#00F0A0] text-xs font-medium">{dirtyCount}</span>}
          </h3>
          <button className="text-slate-400 hover:text-slate-200 transition">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        {expanded && (
          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            <EditableField label="Business Model" value={profile.businessModel || ''} onChange={(v) => onFieldChange('businessModel', v)} type="select" options={[{ value: 'saas', label: 'SaaS' }, { value: 'marketplace', label: 'Marketplace' }, { value: 'd2c', label: 'D2C' }, { value: 'services', label: 'Services' }, { value: 'hardware', label: 'Hardware' }, { value: 'hybrid', label: 'Hybrid' }]} />
            <EditableField label="Revenue Model" value={profile.revenueModel || ''} onChange={(v) => onFieldChange('revenueModel', v)} type="select" options={[{ value: 'subscription', label: 'Subscription' }, { value: 'transactional', label: 'Transactional' }, { value: 'one_time', label: 'One-time' }, { value: 'usage_based', label: 'Usage-based' }, { value: 'hybrid', label: 'Hybrid' }]} />
            <EditableField label="Avg Deal Size" value={profile.avgDealSize || ''} onChange={(v) => onFieldChange('avgDealSize', v ? parseFloat(v) : undefined)} type="number" />
            <EditableField label="Avg Contract Length (months)" value={profile.avgContractLengthMonths || ''} onChange={(v) => onFieldChange('avgContractLengthMonths', v ? parseFloat(v) : undefined)} type="number" />
            <button onClick={onSave} disabled={saving || dirtyCount === 0} className={cn('mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition', dirtyCount > 0 ? 'bg-[#00F0A0] hover:bg-[#00D890] text-black' : 'bg-white/[0.03] text-slate-500 cursor-not-allowed')}>
              {saved ? <><Check className="h-4 w-4" /> Saved</> : saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : <><Save className="h-4 w-4" /> Save Changes</>}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

function FundingCashSection({ profile, onFieldChange, onSave, expanded, onToggle, saving, saved, dirtyCount }: SectionProps) {
  return (
    <Card title="">
      <div className="space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            Funding & Cash
            {dirtyCount > 0 && <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#00F0A0]/20 text-[#00F0A0] text-xs font-medium">{dirtyCount}</span>}
          </h3>
          <button className="text-slate-400 hover:text-slate-200 transition">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        {expanded && (
          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            <EditableField label="Funding Stage" value={profile.fundingStage || ''} onChange={(v) => onFieldChange('fundingStage', v)} type="select" options={[{ value: 'bootstrapped', label: 'Bootstrapped' }, { value: 'pre_seed', label: 'Pre-seed' }, { value: 'seed', label: 'Seed' }, { value: 'series_a', label: 'Series A' }, { value: 'series_b', label: 'Series B' }, { value: 'series_c_plus', label: 'Series C+' }]} />
            <EditableField label="Last Raise Amount" value={profile.lastRaiseAmount || ''} onChange={(v) => onFieldChange('lastRaiseAmount', v ? parseFloat(v) : undefined)} type="number" />
            <EditableField label="Total Capital Raised" value={profile.totalCapitalRaised || ''} onChange={(v) => onFieldChange('totalCapitalRaised', v ? parseFloat(v) : undefined)} type="number" />
            <EditableField label="Cash Reserves" value={profile.cashReserves || ''} onChange={(v) => onFieldChange('cashReserves', v ? parseFloat(v) : undefined)} type="number" />
            <EditableField label="Monthly Burn Rate" value={profile.monthlyBurnRate || ''} onChange={(v) => onFieldChange('monthlyBurnRate', v ? parseFloat(v) : undefined)} type="number" />
            <EditableField label="Monthly Revenue" value={profile.monthlyRevenue || ''} onChange={(v) => onFieldChange('monthlyRevenue', v ? parseFloat(v) : undefined)} type="number" />
            <EditableField label="Runway Target (months)" value={profile.runwayTargetMonths || ''} onChange={(v) => onFieldChange('runwayTargetMonths', v ? parseFloat(v) : undefined)} type="number" />
            <button onClick={onSave} disabled={saving || dirtyCount === 0} className={cn('mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition', dirtyCount > 0 ? 'bg-[#00F0A0] hover:bg-[#00D890] text-black' : 'bg-white/[0.03] text-slate-500 cursor-not-allowed')}>
              {saved ? <><Check className="h-4 w-4" /> Saved</> : saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : <><Save className="h-4 w-4" /> Save Changes</>}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

function UnitEconomicsSection({ profile, onFieldChange, onSave, expanded, onToggle, saving, saved, dirtyCount }: SectionProps) {
  return (
    <Card title="">
      <div className="space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            Unit Economics
            {dirtyCount > 0 && <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#00F0A0]/20 text-[#00F0A0] text-xs font-medium">{dirtyCount}</span>}
          </h3>
          <button className="text-slate-400 hover:text-slate-200 transition">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        {expanded && (
          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            <EditableField label="CAC" value={profile.cac || ''} onChange={(v) => onFieldChange('cac', v ? parseFloat(v) : undefined)} type="number" />
            <EditableField label="LTV" value={profile.ltv || ''} onChange={(v) => onFieldChange('ltv', v ? parseFloat(v) : undefined)} type="number" />
            <EditableField label="Payback Period (months)" value={profile.paybackPeriodMonths || ''} onChange={(v) => onFieldChange('paybackPeriodMonths', v ? parseFloat(v) : undefined)} type="number" />
            <EditableField label="Gross Margin Target (%)" value={profile.grossMarginTarget || ''} onChange={(v) => onFieldChange('grossMarginTarget', v ? parseFloat(v) : undefined)} type="number" />
            <EditableField label="Net Margin Target (%)" value={profile.netMarginTarget || ''} onChange={(v) => onFieldChange('netMarginTarget', v ? parseFloat(v) : undefined)} type="number" />
            <button onClick={onSave} disabled={saving || dirtyCount === 0} className={cn('mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition', dirtyCount > 0 ? 'bg-[#00F0A0] hover:bg-[#00D890] text-black' : 'bg-white/[0.03] text-slate-500 cursor-not-allowed')}>
              {saved ? <><Check className="h-4 w-4" /> Saved</> : saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : <><Save className="h-4 w-4" /> Save Changes</>}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

function CustomersSection({ profile, onFieldChange, onSave, expanded, onToggle, saving, saved, dirtyCount }: SectionProps) {
  return (
    <Card title="">
      <div className="space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            Customers
            {dirtyCount > 0 && <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#00F0A0]/20 text-[#00F0A0] text-xs font-medium">{dirtyCount}</span>}
          </h3>
          <button className="text-slate-400 hover:text-slate-200 transition">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        {expanded && (
          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            <EditableField label="Customer Type" value={profile.customerType || ''} onChange={(v) => onFieldChange('customerType', v)} type="select" options={[{ value: 'b2b', label: 'B2B' }, { value: 'b2c', label: 'B2C' }, { value: 'b2b2c', label: 'B2B2C' }]} />
            <EditableField label="Customer Segment" value={profile.customerSegment || ''} onChange={(v) => onFieldChange('customerSegment', v)} type="select" options={[{ value: 'enterprise', label: 'Enterprise' }, { value: 'mid_market', label: 'Mid-market' }, { value: 'smb', label: 'SMB' }, { value: 'consumer', label: 'Consumer' }]} />
            <EditableField label="ACV" value={profile.avgContractValue || ''} onChange={(v) => onFieldChange('avgContractValue', v ? parseFloat(v) : undefined)} type="number" />
            <EditableField label="Monthly Churn Rate (%)" value={profile.monthlyChurnRate || ''} onChange={(v) => onFieldChange('monthlyChurnRate', v ? parseFloat(v) : undefined)} type="number" />
            <button onClick={onSave} disabled={saving || dirtyCount === 0} className={cn('mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition', dirtyCount > 0 ? 'bg-[#00F0A0] hover:bg-[#00D890] text-black' : 'bg-white/[0.03] text-slate-500 cursor-not-allowed')}>
              {saved ? <><Check className="h-4 w-4" /> Saved</> : saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : <><Save className="h-4 w-4" /> Save Changes</>}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

function TeamSection({ profile, onFieldChange, onSave, expanded, onToggle, saving, saved, dirtyCount }: SectionProps) {
  return (
    <Card title="">
      <div className="space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            Team
            {dirtyCount > 0 && <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#00F0A0]/20 text-[#00F0A0] text-xs font-medium">{dirtyCount}</span>}
          </h3>
          <button className="text-slate-400 hover:text-slate-200 transition">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        {expanded && (
          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            <EditableField label="Team Size" value={profile.teamSize || ''} onChange={(v) => onFieldChange('teamSize', v ? parseFloat(v) : undefined)} type="number" />
            <EditableField label="Engineering Headcount" value={profile.engineeringHeadcount || ''} onChange={(v) => onFieldChange('engineeringHeadcount', v ? parseFloat(v) : undefined)} type="number" />
            <EditableField label="Sales Headcount" value={profile.salesHeadcount || ''} onChange={(v) => onFieldChange('salesHeadcount', v ? parseFloat(v) : undefined)} type="number" />
            <EditableField label="Operations Headcount" value={profile.opsHeadcount || ''} onChange={(v) => onFieldChange('opsHeadcount', v ? parseFloat(v) : undefined)} type="number" />
            <EditableField label="Contractors" value={profile.contractorCount || ''} onChange={(v) => onFieldChange('contractorCount', v ? parseFloat(v) : undefined)} type="number" />
            <button onClick={onSave} disabled={saving || dirtyCount === 0} className={cn('mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition', dirtyCount > 0 ? 'bg-[#00F0A0] hover:bg-[#00D890] text-black' : 'bg-white/[0.03] text-slate-500 cursor-not-allowed')}>
              {saved ? <><Check className="h-4 w-4" /> Saved</> : saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : <><Save className="h-4 w-4" /> Save Changes</>}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

function GoalsSection({ profile, onFieldChange, onSave, expanded, onToggle, saving, saved, dirtyCount }: SectionProps) {
  return (
    <Card title="">
      <div className="space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            Goals
            {dirtyCount > 0 && <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#00F0A0]/20 text-[#00F0A0] text-xs font-medium">{dirtyCount}</span>}
          </h3>
          <button className="text-slate-400 hover:text-slate-200 transition">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        {expanded && (
          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            <EditableField label="Next Fundraise Date" value={profile.nextFundraiseDate || ''} onChange={(v) => onFieldChange('nextFundraiseDate', v)} type="date" />
            <EditableField label="Profitability Target Date" value={profile.profitabilityTargetDate || ''} onChange={(v) => onFieldChange('profitabilityTargetDate', v)} type="date" />
            <EditableField label="Revenue Target (3m)" value={profile.revenueTarget3m || ''} onChange={(v) => onFieldChange('revenueTarget3m', v ? parseFloat(v) : undefined)} type="number" />
            <EditableField label="Revenue Target (6m)" value={profile.revenueTarget6m || ''} onChange={(v) => onFieldChange('revenueTarget6m', v ? parseFloat(v) : undefined)} type="number" />
            <EditableField label="Revenue Target (12m)" value={profile.revenueTarget12m || ''} onChange={(v) => onFieldChange('revenueTarget12m', v ? parseFloat(v) : undefined)} type="number" />
            <EditableField label="Exit Strategy" value={profile.exitStrategy || ''} onChange={(v) => onFieldChange('exitStrategy', v)} type="select" options={[{ value: 'ipo', label: 'IPO' }, { value: 'acquisition', label: 'Acquisition' }, { value: 'lifestyle', label: 'Lifestyle' }, { value: 'undecided', label: 'Undecided' }]} />
            <button onClick={onSave} disabled={saving || dirtyCount === 0} className={cn('mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition', dirtyCount > 0 ? 'bg-[#00F0A0] hover:bg-[#00D890] text-black' : 'bg-white/[0.03] text-slate-500 cursor-not-allowed')}>
              {saved ? <><Check className="h-4 w-4" /> Saved</> : saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : <><Save className="h-4 w-4" /> Save Changes</>}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

function ComplianceSection({ profile, onFieldChange, onSave, expanded, onToggle, saving, saved, dirtyCount }: SectionProps) {
  const operatingStatesStr = profile.operatingStates?.join(', ') || '';

  return (
    <Card title="">
      <div className="space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            Compliance
            {dirtyCount > 0 && <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#00F0A0]/20 text-[#00F0A0] text-xs font-medium">{dirtyCount}</span>}
          </h3>
          <button className="text-slate-400 hover:text-slate-200 transition">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        {expanded && (
          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            <EditableField label="Operating States" value={operatingStatesStr} onChange={(v) => onFieldChange('operatingStates', v ? v.split(',').map(s => s.trim()).filter(Boolean) : [])} type="text" />
            <EditableBoolField label="GST Registration" value={profile.hasGSTRegistration || false} onChange={(v) => onFieldChange('hasGSTRegistration', v)} />
            <EditableBoolField label="TAN Registration" value={profile.hasTANRegistration || false} onChange={(v) => onFieldChange('hasTANRegistration', v)} />
            <EditableField label="GSTIN" value={profile.gstin || ''} onChange={(v) => onFieldChange('gstin', v)} type="text" />
            <EditableField label="PAN" value={profile.pan || ''} onChange={(v) => onFieldChange('pan', v)} type="text" />
            <EditableBoolField label="Auditor Appointed" value={profile.auditorAppointed || false} onChange={(v) => onFieldChange('auditorAppointed', v)} />
            <EditableBoolField label="Statutory Audit Required" value={profile.statutoryAuditRequired || false} onChange={(v) => onFieldChange('statutoryAuditRequired', v)} />
            <EditableField label="Current FY" value={profile.currentFY || ''} onChange={(v) => onFieldChange('currentFY', v)} type="text" />
            <button onClick={onSave} disabled={saving || dirtyCount === 0} className={cn('mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition', dirtyCount > 0 ? 'bg-[#00F0A0] hover:bg-[#00D890] text-black' : 'bg-white/[0.03] text-slate-500 cursor-not-allowed')}>
              {saved ? <><Check className="h-4 w-4" /> Saved</> : saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : <><Save className="h-4 w-4" /> Save Changes</>}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

function EditableField({ label, value, onChange, type, options }: { label: string; value: any; onChange: (v: any) => void; type: 'text' | 'number' | 'select' | 'date'; options?: Array<{ value: string; label: string }> }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-b-0">
      <label className="text-xs uppercase tracking-wide text-slate-500">{label}</label>
      {type === 'select' ? (
        <select value={value || ''} onChange={(e) => onChange(e.target.value || undefined)} className="px-2 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-sm text-slate-200 focus:outline-none focus:border-[#00F0A0]/40">
          <option value="">—</option>
          {options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : type === 'date' ? (
        <input type="date" value={value || ''} onChange={(e) => onChange(e.target.value || undefined)} className="px-2 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-sm text-slate-200 focus:outline-none focus:border-[#00F0A0]/40" />
      ) : (
        <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value || undefined)} placeholder="—" className="px-2 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40" />
      )}
    </div>
  );
}

function EditableBoolField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-b-0">
      <label className="text-xs uppercase tracking-wide text-slate-500">{label}</label>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          'relative inline-flex h-5 w-9 items-center rounded-full transition',
          value ? 'bg-[#00F0A0]' : 'bg-white/[0.08]'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition',
            value ? 'translate-x-4' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}

function ProfilePanel({ user, signOut }: { user: any; signOut: () => Promise<void> }) {
  const initials = (() => {
    const name = user?.full_name || user?.email || 'U';
    const parts = name.split(/[\s@]/);
    return (parts[0]?.[0] + (parts[1]?.[0] || '')).toUpperCase();
  })();

  const providerLabel = user?.provider === 'google' ? 'Google'
    : user?.provider === 'azure' ? 'Microsoft'
    : user?.provider === 'email' ? 'Email & password'
    : '—';

  return (
    <>
      <Card title="Account" description="Your signed-in identity and session details.">
        <div className="flex items-center gap-4 mb-4">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#00F0A0] to-[#00CC88] flex items-center justify-center text-base font-semibold text-black">
              {initials}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-slate-100">
              {user?.full_name || 'User'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {user?.email || '—'}
            </p>
          </div>
        </div>

        <div className="divide-y divide-white/[0.04]">
          <Field label="Email" value={user?.email || '—'} />
          <Field label="Full name" value={user?.full_name || '—'} />
          <Field label="Provider" value={providerLabel} />
          <Field
            label="Session"
            value={
              <span className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs',
                'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              )}>
                <ShieldCheck className="h-3 w-3" />
                Authenticated
              </span>
            }
          />
        </div>
      </Card>

      <Card title="Sign out" description="End your current session on this device.">
        <button
          onClick={async () => { await signOut(); }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-sm transition"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </Card>
    </>
  );
}

function AIKeyPanel() {
  const envKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY || '';
  const hasEnvKey = !!envKey && !envKey.includes('your-') && envKey !== 'sk-ant-...';

  const [key, setKey] = useState(() => localStorage.getItem(ANTHROPIC_KEY_STORAGE) || '');
  const [reveal, setReveal] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = () => {
    const trimmed = key.trim();
    if (trimmed) localStorage.setItem(ANTHROPIC_KEY_STORAGE, trimmed);
    else localStorage.removeItem(ANTHROPIC_KEY_STORAGE);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const clear = () => {
    setKey('');
    localStorage.removeItem(ANTHROPIC_KEY_STORAGE);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <>
      <Card
        title="Anthropic Claude API Key"
        description="Used by the Copilot and AI-powered features. Stored locally in your browser."
      >
        {hasEnvKey && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-300">
            <Check className="h-3.5 w-3.5" />
            A key is already configured via <code className="font-mono">VITE_ANTHROPIC_API_KEY</code>. The env key takes precedence.
          </div>
        )}

        <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">API Key</label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type={reveal ? 'text' : 'password'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2 pr-10 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
            />
            <button
              type="button"
              onClick={() => setReveal(!reveal)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              aria-label={reveal ? 'Hide key' : 'Reveal key'}
            >
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button
            onClick={save}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#00F0A0] hover:bg-[#00D890] text-black text-sm font-medium transition"
          >
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? 'Saved' : 'Save'}
          </button>
          {key && (
            <button
              onClick={clear}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 text-sm transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-3 flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Keys are stored only in this browser's localStorage. Clear on shared machines. Get a key at{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-[#00F0A0] hover:underline">
            console.anthropic.com
          </a>
          .
        </p>
      </Card>

      <Card title="AI provider" description="Raven currently supports Anthropic Claude. Other providers coming soon.">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <Sparkles className="h-4 w-4 text-[#00F0A0]" />
          <div className="flex-1">
            <p className="text-sm text-slate-200">Anthropic Claude</p>
            <p className="text-xs text-slate-500">claude-opus / claude-sonnet</p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            Active
          </span>
        </div>
      </Card>
    </>
  );
}

function DataPanel() {
  const [demoLoaded, setDemoLoaded] = useState(isDemoDataLoaded());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return onDemoDataChange(() => setDemoLoaded(isDemoDataLoaded()));
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      if (demoLoaded) clearDemoData();
      else loadDemoData();
    } finally {
      setBusy(false);
    }
  };

  const clearLocal = () => {
    const confirmed = window.confirm(
      'Clear all locally cached data (demo data, AI key, guest session)? You will be signed out.'
    );
    if (!confirmed) return;
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <>
      <Card title="Demo data" description="Populate the app with example metrics, transactions, and team data.">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-200">
              Demo data is currently{' '}
              <span className={demoLoaded ? 'text-[#00F0A0]' : 'text-slate-400'}>
                {demoLoaded ? 'loaded' : 'not loaded'}
              </span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {demoLoaded
                ? 'Clear to see the empty state and connect real sources.'
                : 'Load to explore the product without connecting any integrations.'}
            </p>
          </div>
          <button
            onClick={toggle}
            disabled={busy}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition',
              demoLoaded
                ? 'border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-slate-200'
                : 'bg-[#00F0A0] hover:bg-[#00D890] text-black'
            )}
          >
            {demoLoaded ? 'Clear demo data' : 'Load demo data'}
          </button>
        </div>
      </Card>

      <Card title="Danger zone" description="Reset everything stored by Raven in this browser.">
        <button
          onClick={clearLocal}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-sm transition"
        >
          <Trash2 className="h-4 w-4" />
          Clear all local data
        </button>
      </Card>
    </>
  );
}

export default Settings;
