import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Column {
  name: string;
  detected_type: string;
  sample_values: string[];
}

interface PreviewData {
  file_id: string;
  columns: Column[];
  preview_rows: Record<string, string>[];
  total_rows: number;
  suggested_mapping: {
    date_col?: string;
    amount_col?: string;
    description_col?: string;
    category_col?: string;
  };
}

interface CSVUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (count: number) => void;
}

export const CSVUploader: React.FC<CSVUploaderProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'confirm'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const droppedFile = files[0];
      if (droppedFile.name.endsWith('.csv')) {
        handleFileSelect(droppedFile);
      } else {
        setError('Please drop a CSV file');
      }
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a CSV file (.csv). Other formats aren\'t supported yet.');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File exceeds the 5MB limit. Try splitting into smaller files.');
      return;
    }

    setFile(selectedFile);
    setError(null);
    uploadPreview(selectedFile);
  };

  const uploadPreview = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('raven_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/v1/csv/upload', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.detail || 'Upload failed';

        // Provide user-friendly context for common errors
        if (errorMessage.toLowerCase().includes('size') || errorMessage.toLowerCase().includes('too large')) {
          throw new Error('File exceeds the 5MB limit. Try splitting into smaller files.');
        } else if (errorMessage.toLowerCase().includes('format') || errorMessage.toLowerCase().includes('csv')) {
          throw new Error('Please upload a CSV file (.csv). Other formats aren\'t supported yet.');
        } else if (errorMessage.toLowerCase().includes('parse') || errorMessage.toLowerCase().includes('read')) {
          throw new Error('Couldn\'t read this file. Check that it\'s a valid CSV with headers.');
        }
        throw new Error(errorMessage);
      }

      const data: PreviewData = await response.json();
      setPreview(data);

      // Initialize mapping with suggestions
      setMapping({
        date_col: data.suggested_mapping.date_col || '',
        amount_col: data.suggested_mapping.amount_col || '',
        description_col: data.suggested_mapping.description_col || '',
        category_col: data.suggested_mapping.category_col || '',
      });

      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (key: string, value: string) => {
    setMapping((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirmImport = async () => {
    if (!preview) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('raven_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/v1/csv/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          file_id: preview.file_id,
          mapping,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.detail || 'Import failed';

        // Provide user-friendly context for common errors
        if (errorMessage.toLowerCase().includes('size') || errorMessage.toLowerCase().includes('too large')) {
          throw new Error('File exceeds the 5MB limit. Try splitting into smaller files.');
        } else if (errorMessage.toLowerCase().includes('format') || errorMessage.toLowerCase().includes('csv')) {
          throw new Error('Please upload a CSV file (.csv). Other formats aren\'t supported yet.');
        } else if (errorMessage.toLowerCase().includes('parse') || errorMessage.toLowerCase().includes('read')) {
          throw new Error('Couldn\'t read this file. Check that it\'s a valid CSV with headers.');
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setStep('confirm');

      // Show success and call callback after a delay
      setTimeout(() => {
        onImportComplete(result.imported);
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setMapping({});
    setError(null);
    setLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[49]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div
              className={cn(
                'w-full max-w-2xl',
                'rounded-2xl',
                'bg-gradient-to-b from-[#141419]/95 to-[#050508]/95',
                'border border-white/[0.08]',
                'backdrop-blur-xl',
                'shadow-2xl',
                'p-6 sm:p-8'
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-100">Import Transactions</h2>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors"
                  disabled={loading}
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              {/* Step: Upload */}
              {step === 'upload' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="relative"
                >
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                      'rounded-xl border-2 border-dashed',
                      'px-6 py-12',
                      'transition-all duration-200',
                      'cursor-pointer',
                      'flex flex-col items-center justify-center gap-3',
                      dragActive
                        ? 'border-primary bg-primary/10'
                        : 'border-white/[0.12] hover:border-white/[0.2]',
                      loading && 'opacity-50'
                    )}
                  >
                    <Upload
                      className={cn(
                        'h-8 w-8 transition-colors',
                        dragActive ? 'text-primary' : 'text-slate-400'
                      )}
                    />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-200">
                        Drag and drop your CSV here
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        or click to select
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileSelect(e.target.files[0]);
                        }
                      }}
                      onClick={(e) => {
                        e.currentTarget.click();
                      }}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className={cn(
                        'mt-4 px-4 py-2 rounded-lg',
                        'bg-white/[0.08] hover:bg-white/[0.12]',
                        'border border-white/[0.08]',
                        'text-xs font-medium text-slate-300',
                        'transition-all duration-200',
                        loading && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      Select CSV File
                    </button>
                  </div>

                  {/* File size hint */}
                  <p className="text-xs text-slate-500 mt-4 text-center">
                    Maximum file size: 5MB
                  </p>

                  {/* Error message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                    >
                      <p className="text-xs text-red-400">{error}</p>
                    </motion.div>
                  )}

                  {/* Loading state with overlay */}
                  <AnimatePresence>
                    {loading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                          'absolute inset-0 rounded-xl',
                          'bg-gradient-to-b from-black/40 to-black/60',
                          'flex flex-col items-center justify-center gap-4',
                          'backdrop-blur-sm'
                        )}
                      >
                        <div className="flex justify-center">
                          <div
                            className="w-12 h-12 rounded-full border-2 border-slate-600"
                            style={{
                              borderTopColor: 'var(--color-primary, #00F0A0)',
                              animation: 'spin 1s linear infinite',
                            }}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-slate-200">
                            Processing...
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Step: Preview & Mapping */}
              {step === 'preview' && preview && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Preview table */}
                  <div className="overflow-x-auto rounded-lg border border-white/[0.08] bg-white/[0.02]">
                    <table className="w-full text-xs">
                      <thead className="border-b border-white/[0.08]">
                        <tr>
                          {preview.columns.map((col) => (
                            <th
                              key={col.name}
                              className="px-3 py-2 text-left text-slate-400 font-medium"
                            >
                              {col.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.preview_rows.map((row, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                          >
                            {preview.columns.map((col) => (
                              <td key={col.name} className="px-3 py-2 text-slate-300">
                                {row[col.name] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mapping selectors */}
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-slate-200">
                      Column Mapping
                    </p>

                    {[
                      { key: 'date_col', label: 'Date Column' },
                      { key: 'amount_col', label: 'Amount Column' },
                      { key: 'description_col', label: 'Description Column' },
                      { key: 'category_col', label: 'Category Column' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-xs font-medium text-slate-400 block mb-1.5">
                          {label}
                        </label>
                        <div className="relative">
                          <select
                            value={mapping[key] || ''}
                            onChange={(e) => handleMappingChange(key, e.target.value)}
                            className={cn(
                              'w-full px-3 py-2 rounded-lg',
                              'bg-white/[0.04] border border-white/[0.08]',
                              'text-xs text-slate-200',
                              'focus:outline-none focus:border-primary/50 focus:bg-white/[0.06]',
                              'transition-all duration-200',
                              'appearance-none'
                            )}
                          >
                            <option value="">Select a column...</option>
                            {preview.columns.map((col) => (
                              <option key={col.name} value={col.name}>
                                {col.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="h-3.5 w-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-blue-300">
                      Found {preview.total_rows} transaction(s) in this file
                    </p>
                  </div>

                  {/* Error message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                    >
                      <p className="text-xs text-red-400">{error}</p>
                    </motion.div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setStep('upload');
                        setPreview(null);
                      }}
                      disabled={loading}
                      className={cn(
                        'flex-1 px-4 py-2 rounded-lg',
                        'bg-white/[0.04] hover:bg-white/[0.08]',
                        'border border-white/[0.08]',
                        'text-xs font-medium text-slate-300',
                        'transition-all duration-200',
                        loading && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      disabled={loading || !mapping.date_col || !mapping.amount_col}
                      className={cn(
                        'flex-1 px-4 py-2 rounded-lg',
                        'bg-primary hover:bg-primary/90',
                        'text-xs font-medium text-white',
                        'transition-all duration-200',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {loading ? 'Importing...' : 'Import'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step: Confirm/Success */}
              {step === 'confirm' && preview && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="mb-4">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                      <svg
                        className="w-8 h-8 text-green-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">
                    Import Complete!
                  </h3>
                  <p className="text-sm text-slate-400">
                    Your transactions have been imported successfully.
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CSVUploader;
