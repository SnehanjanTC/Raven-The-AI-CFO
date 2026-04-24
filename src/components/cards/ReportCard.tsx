import React from 'react';
import { Download, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ReportSection {
  title: string;
  preview: string;
}

interface ReportCardProps {
  title: string;
  type: 'board_update' | 'pnl' | 'investor_update';
  generatedAt?: string;
  sections: ReportSection[];
  onExport?: (format: 'pdf' | 'xlsx') => void;
}

/**
 * ReportCard - Report preview card with export buttons
 *
 * Features:
 * - Header: title + type badge
 * - Body: 2-3 summary sections with preview text
 * - Footer: export buttons (PDF, XLSX)
 * - Framer Motion entrance animation
 */
const ReportCardInner: React.FC<ReportCardProps> = ({
  title,
  type,
  generatedAt,
  sections,
  onExport,
}) => {
  const getTypeConfig = () => {
    switch (type) {
      case 'board_update':
        return {
          label: 'Board Update',
          bg: 'bg-blue-500/10',
          text: 'text-blue-300',
          border: 'border-blue-500/30',
        };
      case 'pnl':
        return {
          label: 'P&L Report',
          bg: 'bg-primary/10',
          text: 'text-primary',
          border: 'border-primary/30',
        };
      case 'investor_update':
        return {
          label: 'Investor Update',
          bg: 'bg-tertiary/10',
          text: 'text-tertiary',
          border: 'border-tertiary/30',
        };
    }
  };

  const typeConfig = getTypeConfig();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-white/[0.06]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {generatedAt && (
              <p className="text-xs text-slate-500 mt-0.5">
                Generated {new Date(generatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-semibold border',
            typeConfig.bg,
            typeConfig.text,
            typeConfig.border,
            'shrink-0'
          )}
        >
          {typeConfig.label}
        </div>
      </div>

      {/* Sections Preview */}
      <div className="px-5 py-5 space-y-4">
        {sections.map((section, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
          >
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              {section.title}
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">
              {section.preview}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Footer - Export Buttons */}
      <div className="border-t border-white/[0.06] p-5 flex gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onExport?.('pdf')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 text-xs font-semibold transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary/15 disabled:pointer-events-none'
          )}
        >
          <Download className="w-3.5 h-3.5" />
          PDF
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onExport?.('xlsx')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-tertiary/15 text-tertiary hover:bg-tertiary/25 border border-tertiary/30 text-xs font-semibold transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-tertiary/15 disabled:pointer-events-none'
          )}
        >
          <Download className="w-3.5 h-3.5" />
          XLSX
        </motion.button>
      </div>
    </motion.div>
  );
};

export const ReportCard = React.memo(ReportCardInner);
export default ReportCard;
