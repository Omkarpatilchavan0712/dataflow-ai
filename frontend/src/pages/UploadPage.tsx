import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2, ArrowRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { datasetsApi, getErrorMessage } from '../lib/api';
import { formatFileSize, getFileTypeColor, cn } from '../lib/utils';

const SUPPORTED_TYPES = [
  { ext: '.csv', desc: 'Comma Separated Values' },
  { ext: '.xlsx/.xls', desc: 'Microsoft Excel' },
  { ext: '.json', desc: 'JSON Data' },
  { ext: '.xml', desc: 'XML Data' },
  { ext: '.parquet', desc: 'Apache Parquet' },
  { ext: '.html', desc: 'HTML Tables' },
  { ext: '.sql', desc: 'SQL INSERT Export' },
  { ext: '.zip', desc: 'ZIP with data files' },
  { ext: '.txt', desc: 'Delimited Text' },
];

const ACCEPTED: Record<string, string[]> = {
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/json': ['.json'],
  'text/xml': ['.xml'],
  'application/xml': ['.xml'],
  'text/html': ['.html', '.htm'],
  'text/plain': ['.txt'],
  'application/octet-stream': ['.parquet'],
  'application/zip': ['.zip'],
  'application/sql': ['.sql'],
};

interface UploadItem {
  id: string;
  file: File;
  name: string;
  status: 'pending' | 'uploading' | 'processing' | 'done' | 'error';
  progress: number;
  error?: string;
  datasetId?: number;
}

export default function UploadPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const updateItem = (id: string, updates: Partial<UploadItem>) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, ...updates } : item));
  };

  const onDrop = useCallback((accepted: File[]) => {
    const newItems: UploadItem[] = accepted.map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      name: file.name,
      status: 'pending',
      progress: 0,
    }));
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: 100 * 1024 * 1024, // 100MB
    onDropRejected: (rejected) => {
      rejected.forEach((r) => {
        const reason = r.errors[0]?.code === 'file-too-large'
          ? 'File too large (max 100MB)'
          : `Unsupported format: ${r.file.name}`;
        toast.error(reason);
      });
    },
  });

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const uploadAll = async () => {
    const pending = items.filter((i) => i.status === 'pending');
    if (pending.length === 0) return;
    setUploading(true);

    for (const item of pending) {
      updateItem(item.id, { status: 'uploading', progress: 0 });
      const fd = new FormData();
      fd.append('file', item.file);
      fd.append('name', item.name.replace(/\.[^/.]+$/, ''));

      try {
        const response = await datasetsApi.upload(fd, (pct) => {
          updateItem(item.id, { progress: pct });
        });
        updateItem(item.id, { status: 'processing', datasetId: response.data.id, progress: 100 });
        toast.success(`${item.name} uploaded. Processing...`);
      } catch (err) {
        updateItem(item.id, { status: 'error', error: getErrorMessage(err) });
        toast.error(`Failed to upload ${item.name}`);
      }
    }

    setUploading(false);
  };

  const goToDashboard = (datasetId: number) => {
    navigate(`/datasets/${datasetId}`);
  };

  const doneCount = items.filter((i) => i.status === 'done' || i.status === 'processing').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const errorCount = items.filter((i) => i.status === 'error').length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upload Data</h1>
        <p className="text-slate-500 mt-1">Upload your data files to generate automatic dashboards</p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-brand-500 bg-brand-50'
            : 'border-slate-200 bg-white hover:border-brand-400 hover:bg-slate-50'
        )}
      >
        <input {...getInputProps()} />
        <motion.div
          animate={{ scale: isDragActive ? 1.05 : 1 }}
          className="flex flex-col items-center"
        >
          <div className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors',
            isDragActive ? 'bg-brand-100' : 'bg-slate-100'
          )}>
            <Upload size={28} className={isDragActive ? 'text-brand-600' : 'text-slate-400'} />
          </div>
          <p className="text-base font-semibold text-slate-900 mb-1">
            {isDragActive ? 'Drop files here' : 'Drag & drop your files here'}
          </p>
          <p className="text-sm text-slate-500 mb-3">or click to browse</p>
          <p className="text-xs text-slate-400">
            CSV, Excel, JSON, XML, Parquet, HTML, SQL, ZIP, TXT · Max 100MB
          </p>
        </motion.div>
      </div>

      {/* File list */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                {items.length} file{items.length !== 1 ? 's' : ''} selected
                {errorCount > 0 && <span className="ml-2 text-red-500">({errorCount} failed)</span>}
              </h2>
              <div className="flex gap-2">
                <button onClick={() => setItems([])} className="btn-ghost text-xs text-red-500 hover:bg-red-50">
                  Clear all
                </button>
                {pendingCount > 0 && (
                  <button
                    onClick={uploadAll}
                    disabled={uploading}
                    className="btn-primary text-sm"
                  >
                    {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                    Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>

            {items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                    getFileTypeColor(item.file.name.split('.').pop() || '')
                  )}>
                    {item.file.name.split('.').pop()?.toUpperCase().slice(0, 3)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                      <span className="text-xs text-slate-400 shrink-0">{formatFileSize(item.file.size)}</span>
                    </div>

                    {item.status === 'uploading' && (
                      <div className="mt-1">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-brand-600 rounded-full"
                            animate={{ width: `${item.progress}%` }}
                            transition={{ duration: 0.2 }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Uploading {item.progress}%</p>
                      </div>
                    )}

                    {item.status === 'processing' && (
                      <p className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                        <Loader2 size={11} className="animate-spin" /> Processing data...
                      </p>
                    )}

                    {item.status === 'done' && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                        <CheckCircle size={11} /> Ready
                      </p>
                    )}

                    {item.status === 'error' && (
                      <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
                        <AlertCircle size={11} /> {item.error}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {(item.status === 'done' || item.status === 'processing') && item.datasetId && (
                      <button
                        onClick={() => goToDashboard(item.datasetId!)}
                        className="btn-secondary text-xs"
                      >
                        View
                        <ArrowRight size={12} />
                      </button>
                    )}
                    {item.status === 'pending' && (
                      <button onClick={() => removeItem(item.id)} className="btn-ghost text-slate-400 hover:text-red-500">
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {doneCount > 0 && (
              <div className="flex justify-end">
                <button onClick={() => navigate('/datasets')} className="btn-primary">
                  View All Datasets
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Supported formats info */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info size={15} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">Supported Formats</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SUPPORTED_TYPES.map((type) => (
            <div key={type.ext} className="flex items-center gap-2 text-xs text-slate-600">
              <FileText size={12} className="text-slate-400" />
              <span><span className="font-medium">{type.ext}</span> — {type.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
