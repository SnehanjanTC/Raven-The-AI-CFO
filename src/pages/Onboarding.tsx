import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  Building2,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  FileText,
  Zap,
  Briefcase,
  Cpu,
  ShoppingCart,
  Layers,
  Wrench,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { companyProfileAPI } from '@/lib/company-profile-api';
import type { CompanyProfile } from '@/types/company-profile';

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

export function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for all steps
  const [formData, setFormData] = useState<Partial<CompanyProfile>>({
    companyName: '',
    entityType: undefined,
    incorporationDate: '',
    industryVertical: undefined,
    industrySubSector: '',
    businessModel: undefined,
    revenueModel: undefined,
    avgDealSize: undefined,
    avgContractLengthMonths: undefined,
    fundingStage: undefined,
    lastRaiseAmount: undefined,
    totalCapitalRaised: undefined,
    cashReserves: undefined,
    monthlyBurnRate: undefined,
    runwayTargetMonths: undefined,
    customerType: undefined,
    customerSegment: undefined,
    avgContractValue: undefined,
    monthlyChurnRate: undefined,
    teamSize: undefined,
    engineeringHeadcount: undefined,
    salesHeadcount: undefined,
    opsHeadcount: undefined,
    contractorCount: undefined,
    nextFundraiseDate: '',
    profitabilityTargetDate: '',
    revenueTarget3m: undefined,
    revenueTarget6m: undefined,
    revenueTarget12m: undefined,
    exitStrategy: undefined,
    operatingStates: [],
    hasGSTRegistration: false,
    hasTANRegistration: false,
    gstin: '',
    pan: '',
    auditorAppointed: false,
    currentFY: '2025-26',
    stage: 'early',
  });

  const handleFieldChange = (field: keyof CompanyProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep((currentStep + 1) as OnboardingStep);
      setError(null);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as OnboardingStep);
      setError(null);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      setError(null);
      await companyProfileAPI.update(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Progress Bar */}
      <div className="sticky top-0 z-10 bg-slate-950 border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <React.Fragment key={step}>
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                    step < currentStep
                      ? 'bg-[#00F0A0] text-black'
                      : step === currentStep
                      ? 'bg-[#00F0A0]/20 border border-[#00F0A0] text-[#00F0A0]'
                      : 'bg-white/[0.06] text-slate-400'
                  )}
                >
                  {step < currentStep ? <Check className="h-4 w-4" /> : step}
                </div>
                {step < 6 && (
                  <div
                    className={cn(
                      'flex-1 h-1 rounded-full transition-colors',
                      step < currentStep ? 'bg-[#00F0A0]' : 'bg-white/[0.06]'
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Step {currentStep} of 6
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-300 font-medium">Error</p>
              <p className="text-xs text-red-200/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {currentStep === 1 && <Step1CompanyBasics data={formData} onChange={handleFieldChange} />}
        {currentStep === 2 && <Step2BusinessModel data={formData} onChange={handleFieldChange} />}
        {currentStep === 3 && <Step3FundingCash data={formData} onChange={handleFieldChange} />}
        {currentStep === 4 && <Step4Customers data={formData} onChange={handleFieldChange} />}
        {currentStep === 5 && <Step5GoalsTeam data={formData} onChange={handleFieldChange} />}
        {currentStep === 6 && <Step6Compliance data={formData} onChange={handleFieldChange} />}

        {/* Footer Actions */}
        <div className="mt-8 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-slate-200 text-sm transition"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
          </div>
          <button
            onClick={() => handleNext()}
            className="text-xs text-slate-400 hover:text-slate-300 transition"
          >
            Skip for now
          </button>
          <div>
            {currentStep < 6 ? (
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00F0A0] hover:bg-[#00D890] text-black text-sm font-medium transition"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00F0A0] hover:bg-[#00D890] disabled:opacity-50 text-black text-sm font-medium transition"
              >
                {loading ? 'Completing...' : 'Complete Setup'}
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== STEP 1: Company Basics ===== */
function Step1CompanyBasics({
  data,
  onChange,
}: {
  data: Partial<CompanyProfile>;
  onChange: (field: keyof CompanyProfile, value: any) => void;
}) {
  return (
    <Card
      title="Company Basics"
      description="Tell us about your company and its focus area."
      icon={<Building2 className="h-6 w-6 text-[#00F0A0]" />}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Company Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={data.companyName || ''}
            onChange={(e) => onChange('companyName', e.target.value)}
            placeholder="e.g., Acme Tech Solutions"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Entity Type
            </label>
            <select
              value={data.entityType || ''}
              onChange={(e) => onChange('entityType', e.target.value || undefined)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 focus:outline-none focus:border-[#00F0A0]/40"
            >
              <option value="">Select entity type</option>
              <option value="pvt_ltd">Pvt Ltd</option>
              <option value="llp">LLP</option>
              <option value="opc">OPC</option>
              <option value="partnership">Partnership</option>
              <option value="sole_proprietor">Sole Proprietor</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Incorporation Date
            </label>
            <input
              type="date"
              value={data.incorporationDate || ''}
              onChange={(e) => onChange('incorporationDate', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 focus:outline-none focus:border-[#00F0A0]/40"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Industry Vertical
          </label>
          <select
            value={data.industryVertical || ''}
            onChange={(e) => onChange('industryVertical', e.target.value || undefined)}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 focus:outline-none focus:border-[#00F0A0]/40"
          >
            <option value="">Select industry</option>
            <option value="fintech">FinTech</option>
            <option value="healthtech">HealthTech</option>
            <option value="edtech">EdTech</option>
            <option value="ecommerce">E-Commerce</option>
            <option value="saas">SaaS</option>
            <option value="marketplace">Marketplace</option>
            <option value="deeptech">DeepTech</option>
            <option value="agritech">AgriTech</option>
            <option value="cleantech">CleanTech</option>
            <option value="logistics">Logistics</option>
            <option value="media">Media</option>
            <option value="gaming">Gaming</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Sub-sector
          </label>
          <input
            type="text"
            value={data.industrySubSector || ''}
            onChange={(e) => onChange('industrySubSector', e.target.value)}
            placeholder="e.g., Open Banking, Embedded Finance"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
          />
        </div>
      </div>
    </Card>
  );
}

/* ===== STEP 2: Business Model ===== */
function Step2BusinessModel({
  data,
  onChange,
}: {
  data: Partial<CompanyProfile>;
  onChange: (field: keyof CompanyProfile, value: any) => void;
}) {
  const businessModels = [
    { id: 'saas', label: 'SaaS', icon: <Zap className="h-5 w-5" />, description: 'Software as a Service' },
    { id: 'marketplace', label: 'Marketplace', icon: <ShoppingCart className="h-5 w-5" />, description: 'Connect buyers & sellers' },
    { id: 'd2c', label: 'D2C', icon: <TrendingUp className="h-5 w-5" />, description: 'Direct to Consumer' },
    { id: 'services', label: 'Services', icon: <Briefcase className="h-5 w-5" />, description: 'Consulting & Services' },
    { id: 'hardware', label: 'Hardware', icon: <Cpu className="h-5 w-5" />, description: 'Physical Products' },
    { id: 'hybrid', label: 'Hybrid', icon: <Layers className="h-5 w-5" />, description: 'Multiple models' },
  ];

  return (
    <Card
      title="Business Model"
      description="How do you operate and monetize?"
      icon={<TrendingUp className="h-6 w-6 text-[#00F0A0]" />}
    >
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-3">
            Business Model
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {businessModels.map(model => (
              <CardSelect
                key={model.id}
                selected={data.businessModel === model.id}
                onClick={() => onChange('businessModel', model.id)}
                icon={model.icon}
                label={model.label}
                description={model.description}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Revenue Model
            </label>
            <select
              value={data.revenueModel || ''}
              onChange={(e) => onChange('revenueModel', e.target.value || undefined)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 focus:outline-none focus:border-[#00F0A0]/40"
            >
              <option value="">Select model</option>
              <option value="subscription">Subscription</option>
              <option value="transactional">Transactional</option>
              <option value="one_time">One-time</option>
              <option value="usage_based">Usage-based</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Average Deal Size (INR)
            </label>
            <input
              type="number"
              value={data.avgDealSize || ''}
              onChange={(e) => onChange('avgDealSize', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Average Contract Length (months)
          </label>
          <input
            type="number"
            value={data.avgContractLengthMonths || ''}
            onChange={(e) => onChange('avgContractLengthMonths', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
          />
        </div>
      </div>
    </Card>
  );
}

/* ===== STEP 3: Funding & Cash ===== */
function Step3FundingCash({
  data,
  onChange,
}: {
  data: Partial<CompanyProfile>;
  onChange: (field: keyof CompanyProfile, value: any) => void;
}) {
  const fundingStages = [
    { id: 'bootstrapped', label: 'Bootstrapped', description: 'Self-funded' },
    { id: 'pre_seed', label: 'Pre-seed', description: 'Friends & Family' },
    { id: 'seed', label: 'Seed', description: 'First institutional' },
    { id: 'series_a', label: 'Series A', description: 'Growth stage' },
    { id: 'series_b', label: 'Series B', description: 'Scale stage' },
    { id: 'series_c_plus', label: 'Series C+', description: 'Late stage' },
  ];

  return (
    <Card
      title="Funding & Cash"
      description="Your capital and runway status"
      icon={<DollarSign className="h-6 w-6 text-[#00F0A0]" />}
    >
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-3">
            Funding Stage
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {fundingStages.map(stage => (
              <CardSelect
                key={stage.id}
                selected={data.fundingStage === stage.id}
                onClick={() => onChange('fundingStage', stage.id)}
                label={stage.label}
                description={stage.description}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Last Raise Amount (INR)
            </label>
            <input
              type="number"
              value={data.lastRaiseAmount || ''}
              onChange={(e) => onChange('lastRaiseAmount', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Total Capital Raised (INR)
            </label>
            <input
              type="number"
              value={data.totalCapitalRaised || ''}
              onChange={(e) => onChange('totalCapitalRaised', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Cash Reserves (INR)
            </label>
            <input
              type="number"
              value={data.cashReserves || ''}
              onChange={(e) => onChange('cashReserves', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Monthly Burn Rate (INR)
            </label>
            <input
              type="number"
              value={data.monthlyBurnRate || ''}
              onChange={(e) => onChange('monthlyBurnRate', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Runway Target (months)
          </label>
          <input
            type="number"
            value={data.runwayTargetMonths || ''}
            onChange={(e) => onChange('runwayTargetMonths', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
          />
        </div>
      </div>
    </Card>
  );
}

/* ===== STEP 4: Customers ===== */
function Step4Customers({
  data,
  onChange,
}: {
  data: Partial<CompanyProfile>;
  onChange: (field: keyof CompanyProfile, value: any) => void;
}) {
  const customerTypes = [
    { id: 'b2b', label: 'B2B', description: 'Business to Business' },
    { id: 'b2c', label: 'B2C', description: 'Business to Consumer' },
    { id: 'b2b2c', label: 'B2B2C', description: 'Hybrid model' },
  ];

  return (
    <Card
      title="Customers"
      description="Your customer profile and dynamics"
      icon={<Users className="h-6 w-6 text-[#00F0A0]" />}
    >
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-3">
            Customer Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {customerTypes.map(type => (
              <CardSelect
                key={type.id}
                selected={data.customerType === type.id}
                onClick={() => onChange('customerType', type.id)}
                label={type.label}
                description={type.description}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Customer Segment
            </label>
            <select
              value={data.customerSegment || ''}
              onChange={(e) => onChange('customerSegment', e.target.value || undefined)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 focus:outline-none focus:border-[#00F0A0]/40"
            >
              <option value="">Select segment</option>
              <option value="enterprise">Enterprise</option>
              <option value="mid_market">Mid-market</option>
              <option value="smb">SMB</option>
              <option value="consumer">Consumer</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Average Contract Value (INR)
            </label>
            <input
              type="number"
              value={data.avgContractValue || ''}
              onChange={(e) => onChange('avgContractValue', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Monthly Churn Rate (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={data.monthlyChurnRate || ''}
            onChange={(e) => onChange('monthlyChurnRate', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
          />
        </div>
      </div>
    </Card>
  );
}

/* ===== STEP 5: Goals & Team ===== */
function Step5GoalsTeam({
  data,
  onChange,
}: {
  data: Partial<CompanyProfile>;
  onChange: (field: keyof CompanyProfile, value: any) => void;
}) {
  return (
    <Card
      title="Goals & Team"
      description="Your team composition and targets"
      icon={<Target className="h-6 w-6 text-[#00F0A0]" />}
    >
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Team Size
          </label>
          <input
            type="number"
            value={data.teamSize || ''}
            onChange={(e) => onChange('teamSize', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-3">
            Headcount by Department
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-2">Engineering</label>
              <input
                type="number"
                value={data.engineeringHeadcount || ''}
                onChange={(e) => onChange('engineeringHeadcount', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">Sales</label>
              <input
                type="number"
                value={data.salesHeadcount || ''}
                onChange={(e) => onChange('salesHeadcount', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">Ops & Biz Dev</label>
              <input
                type="number"
                value={data.opsHeadcount || ''}
                onChange={(e) => onChange('opsHeadcount', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Contractor Count
          </label>
          <input
            type="number"
            value={data.contractorCount || ''}
            onChange={(e) => onChange('contractorCount', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Next Fundraise Date
            </label>
            <input
              type="date"
              value={data.nextFundraiseDate || ''}
              onChange={(e) => onChange('nextFundraiseDate', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 focus:outline-none focus:border-[#00F0A0]/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Profitability Target Date
            </label>
            <input
              type="date"
              value={data.profitabilityTargetDate || ''}
              onChange={(e) => onChange('profitabilityTargetDate', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 focus:outline-none focus:border-[#00F0A0]/40"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-3">
            Revenue Targets
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-2">3-month (INR)</label>
              <input
                type="number"
                value={data.revenueTarget3m || ''}
                onChange={(e) => onChange('revenueTarget3m', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">6-month (INR)</label>
              <input
                type="number"
                value={data.revenueTarget6m || ''}
                onChange={(e) => onChange('revenueTarget6m', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">12-month (INR)</label>
              <input
                type="number"
                value={data.revenueTarget12m || ''}
                onChange={(e) => onChange('revenueTarget12m', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Exit Strategy
          </label>
          <select
            value={data.exitStrategy || ''}
            onChange={(e) => onChange('exitStrategy', e.target.value || undefined)}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 focus:outline-none focus:border-[#00F0A0]/40"
          >
            <option value="">Select strategy</option>
            <option value="ipo">IPO</option>
            <option value="acquisition">Acquisition</option>
            <option value="lifestyle">Lifestyle Business</option>
            <option value="undecided">Undecided</option>
          </select>
        </div>
      </div>
    </Card>
  );
}

/* ===== STEP 6: Compliance ===== */
function Step6Compliance({
  data,
  onChange,
}: {
  data: Partial<CompanyProfile>;
  onChange: (field: keyof CompanyProfile, value: any) => void;
}) {
  const states = ['MH', 'KA', 'DL', 'TN', 'UP', 'GJ', 'RJ', 'WB', 'AP', 'TS', 'KL', 'HR', 'PB', 'MP', 'Other'];

  const toggleState = (state: string) => {
    const current = data.operatingStates || [];
    const updated = current.includes(state)
      ? current.filter(s => s !== state)
      : [...current, state];
    onChange('operatingStates', updated);
  };

  return (
    <Card
      title="Compliance"
      description="Tax and operational compliance details"
      icon={<FileText className="h-6 w-6 text-[#00F0A0]" />}
    >
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-3">
            Operating States
          </label>
          <div className="flex flex-wrap gap-2">
            {states.map(state => (
              <button
                key={state}
                onClick={() => toggleState(state)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition',
                  (data.operatingStates || []).includes(state)
                    ? 'bg-[#00F0A0] text-black'
                    : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.08]'
                )}
              >
                {state}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-semibold text-slate-300">
                GST Registration
              </label>
              <p className="text-xs text-slate-500 mt-0.5">Goods and Services Tax</p>
            </div>
            <button
              onClick={() => onChange('hasGSTRegistration', !data.hasGSTRegistration)}
              className={cn(
                'relative h-6 w-11 rounded-full transition',
                data.hasGSTRegistration
                  ? 'bg-[#00F0A0]'
                  : 'bg-white/[0.06]'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition',
                  data.hasGSTRegistration && 'translate-x-5'
                )}
              />
            </button>
          </div>
        </div>

        {data.hasGSTRegistration && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              GSTIN
            </label>
            <input
              type="text"
              value={data.gstin || ''}
              onChange={(e) => onChange('gstin', e.target.value)}
              placeholder="15-digit GSTIN"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-semibold text-slate-300">
                TAN Registration
              </label>
              <p className="text-xs text-slate-500 mt-0.5">Tax Deduction Account Number</p>
            </div>
            <button
              onClick={() => onChange('hasTANRegistration', !data.hasTANRegistration)}
              className={cn(
                'relative h-6 w-11 rounded-full transition',
                data.hasTANRegistration
                  ? 'bg-[#00F0A0]'
                  : 'bg-white/[0.06]'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition',
                  data.hasTANRegistration && 'translate-x-5'
                )}
              />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            PAN
          </label>
          <input
            type="text"
            value={data.pan || ''}
            onChange={(e) => onChange('pan', e.target.value)}
            placeholder="10-character PAN"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-semibold text-slate-300">
                Auditor Appointed
              </label>
              <p className="text-xs text-slate-500 mt-0.5">Statutory auditor</p>
            </div>
            <button
              onClick={() => onChange('auditorAppointed', !data.auditorAppointed)}
              className={cn(
                'relative h-6 w-11 rounded-full transition',
                data.auditorAppointed
                  ? 'bg-[#00F0A0]'
                  : 'bg-white/[0.06]'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition',
                  data.auditorAppointed && 'translate-x-5'
                )}
              />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Current Financial Year
          </label>
          <input
            type="text"
            value={data.currentFY || ''}
            onChange={(e) => onChange('currentFY', e.target.value)}
            placeholder="2025-26"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0A0]/40"
          />
        </div>
      </div>
    </Card>
  );
}

/* ===== Reusable Components ===== */

function Card({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
      <div className="flex items-start gap-3 mb-6">
        {icon}
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <p className="text-sm text-slate-400 mt-1">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function CardSelect({
  selected,
  onClick,
  icon,
  label,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-3 rounded-lg border transition text-left',
        selected
          ? 'border-[#00F0A0] bg-[#00F0A0]/10'
          : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]'
      )}
    >
      {icon && <div className={cn('mb-2', selected ? 'text-[#00F0A0]' : 'text-slate-400')}>{icon}</div>}
      <p className={cn('text-xs font-semibold', selected ? 'text-[#00F0A0]' : 'text-slate-200')}>
        {label}
      </p>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </button>
  );
}

export default Onboarding;
