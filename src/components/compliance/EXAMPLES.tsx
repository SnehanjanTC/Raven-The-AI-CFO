/**
 * @file EXAMPLES.tsx
 * @description Practical usage examples for compliance components
 * These are reference implementations - adapt to your routing and state management
 */

import React, { useState } from 'react';
import { ComplianceCalendar, FilingWorkflow, ComplianceDashboard } from './index';
import type { FilingRecord, FilingStatus } from '@/domains/compliance/types';

/**
 * Example 1: Simple Dashboard Integration
 * Shows ComplianceDashboard on the main compliance page
 */
export function ComplianceDashboardPage() {
  const handleAgentClick = (agentId: string) => {
    console.log('Navigate to agent:', agentId);
    // window.location.href = `/agents/${agentId}`;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-headline font-bold text-white mb-2">Compliance Hub</h1>
          <p className="text-slate-400">Monitor filing deadlines and compliance health across all domains</p>
        </div>

        <ComplianceDashboard onAgentClick={handleAgentClick} />
      </div>
    </div>
  );
}

/**
 * Example 2: Calendar with Modal Workflow
 * Shows ComplianceCalendar with FilingWorkflow modal integration
 */
export function ComplianceCalendarPage() {
  const [selectedFiling, setSelectedFiling] = useState<FilingRecord | null>(null);

  const handleFilingClick = (filing: FilingRecord) => {
    setSelectedFiling(filing);
  };

  const handleStatusChange = async (id: string, newStatus: FilingStatus, details?: Partial<FilingRecord>) => {
    console.log('Updating filing:', { id, newStatus, details });
    // In a real app, call your API here
    // await updateFilingStatus(id, newStatus, details);
    // Then refetch or update local state
    setSelectedFiling(null);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-headline font-bold text-white mb-2">Compliance Calendar</h1>
          <p className="text-slate-400">View and manage all filing deadlines</p>
        </div>

        <ComplianceCalendar
          agentId={undefined}
          onFilingClick={handleFilingClick}
        />
      </div>

      {/* Filing Workflow Modal */}
      {selectedFiling && (
        <FilingWorkflow
          filing={selectedFiling}
          onClose={() => setSelectedFiling(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

/**
 * Example 3: Agent-Specific Calendar
 * Shows filings filtered to a specific agent (TDS, GST, etc.)
 */
export function AgentCompliancePage({ agentId }: { agentId: string }) {
  const [selectedFiling, setSelectedFiling] = useState<FilingRecord | null>(null);

  const agentNames: Record<string, string> = {
    'tds-agent': 'TDS Compliance',
    'gst-agent': 'GST Compliance',
    'ptax-agent': 'P-Tax Compliance',
    'gaap-agent': 'GAAP Compliance',
  };

  const handleStatusChange = async (id: string, newStatus: FilingStatus, details?: Partial<FilingRecord>) => {
    console.log('Updating filing:', { id, newStatus, details });
    // API call here
    setSelectedFiling(null);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-headline font-bold text-white mb-2">
            {agentNames[agentId] || agentId}
          </h1>
          <p className="text-slate-400">Deadlines and filings for this agent</p>
        </div>

        <ComplianceCalendar
          agentId={agentId}
          onFilingClick={(filing) => setSelectedFiling(filing)}
        />
      </div>

      {selectedFiling && (
        <FilingWorkflow
          filing={selectedFiling}
          onClose={() => setSelectedFiling(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

/**
 * Example 4: Embedded in Workspace
 * Shows components within an existing workspace/panel layout
 */
export function WorkspaceWithCompliance({ agentId }: { agentId: string }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar'>('overview');
  const [selectedFiling, setSelectedFiling] = useState<FilingRecord | null>(null);

  const handleStatusChange = async (id: string, newStatus: FilingStatus, details?: Partial<FilingRecord>) => {
    console.log('Updating filing:', { id, newStatus, details });
    setSelectedFiling(null);
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-white/5">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-on-surface'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'calendar'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-on-surface'
          }`}
        >
          Calendar
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <ComplianceDashboard onAgentClick={(id) => console.log('Navigate to:', id)} />
      )}

      {activeTab === 'calendar' && (
        <ComplianceCalendar
          agentId={agentId}
          onFilingClick={(filing) => setSelectedFiling(filing)}
        />
      )}

      {/* Filing Workflow Modal */}
      {selectedFiling && (
        <FilingWorkflow
          filing={selectedFiling}
          onClose={() => setSelectedFiling(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

/**
 * Example 5: Full-Screen Compliance Manager
 * Dedicated page for compliance management with all features
 */
export function ComplianceManagerPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined);
  const [selectedFiling, setSelectedFiling] = useState<FilingRecord | null>(null);
  const [showOverview, setShowOverview] = useState(true);

  const handleStatusChange = async (id: string, newStatus: FilingStatus, details?: Partial<FilingRecord>) => {
    console.log('Updating filing:', { id, newStatus, details });
    // API call
    setSelectedFiling(null);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-headline font-bold text-white mb-2">Compliance Manager</h1>
            <p className="text-slate-400">Manage filings across all compliance domains</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowOverview(true)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                showOverview
                  ? 'bg-primary text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setShowOverview(false)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                !showOverview
                  ? 'bg-primary text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Calendar
            </button>
          </div>
        </div>

        {/* Main Content */}
        {showOverview ? (
          <ComplianceDashboard onAgentClick={setSelectedAgentId} />
        ) : (
          <ComplianceCalendar
            agentId={selectedAgentId}
            onFilingClick={setSelectedFiling}
          />
        )}
      </div>

      {/* Filing Workflow Modal */}
      {selectedFiling && (
        <FilingWorkflow
          filing={selectedFiling}
          onClose={() => setSelectedFiling(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

/**
 * Example 6: With React Router Integration
 * Shows how to use with React Router for navigation
 *
 * Usage in router config:
 * ```
 * {
 *   path: '/compliance',
 *   element: <ComplianceManagerWithRouter />,
 *   children: [
 *     { path: 'overview', element: <ComplianceDashboardPage /> },
 *     { path: 'calendar', element: <ComplianceCalendarPage /> },
 *     { path: 'agents/:agentId', element: <AgentCompliancePage /> }
 *   ]
 * }
 * ```
 */
export function ComplianceManagerWithRouter() {
  const [selectedFiling, setSelectedFiling] = useState<FilingRecord | null>(null);

  const handleStatusChange = async (id: string, newStatus: FilingStatus, details?: Partial<FilingRecord>) => {
    console.log('Updating filing:', { id, newStatus, details });
    setSelectedFiling(null);
  };

  // In a real app, use useLocation, useNavigate, useParams
  const currentPath: string = '/compliance/overview';

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-white/5 p-6">
        <div className="max-w-7xl mx-auto flex gap-6">
          <a
            href="/compliance/overview"
            className={`font-semibold text-sm ${
              currentPath === '/compliance/overview' ? 'text-primary' : 'text-slate-400'
            }`}
          >
            Overview
          </a>
          <a
            href="/compliance/calendar"
            className={`font-semibold text-sm ${
              currentPath === '/compliance/calendar' ? 'text-primary' : 'text-slate-400'
            }`}
          >
            Calendar
          </a>
        </div>
      </nav>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Show appropriate component based on route */}
          <ComplianceDashboard onAgentClick={(agentId) => {
            // window.location.href = `/compliance/agents/${agentId}`;
          }} />
        </div>
      </div>

      {/* Modal */}
      {selectedFiling && (
        <FilingWorkflow
          filing={selectedFiling}
          onClose={() => setSelectedFiling(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

/**
 * Example 7: Minimal Integration
 * Bare-minimum integration for a sidebar widget
 */
export function ComplianceWidget() {
  const [selectedFiling, setSelectedFiling] = useState<FilingRecord | null>(null);

  return (
    <div className="bg-surface-container rounded-xl border border-white/5 p-4 space-y-4">
      <h3 className="text-sm font-bold text-white">Recent Filings</h3>

      <div className="h-64 overflow-y-auto custom-scrollbar">
        <ComplianceCalendar
          onFilingClick={setSelectedFiling}
        />
      </div>

      {selectedFiling && (
        <FilingWorkflow
          filing={selectedFiling}
          onClose={() => setSelectedFiling(null)}
          onStatusChange={async () => setSelectedFiling(null)}
        />
      )}
    </div>
  );
}

export default {
  ComplianceDashboardPage,
  ComplianceCalendarPage,
  AgentCompliancePage,
  WorkspaceWithCompliance,
  ComplianceManagerPage,
  ComplianceManagerWithRouter,
  ComplianceWidget,
};
