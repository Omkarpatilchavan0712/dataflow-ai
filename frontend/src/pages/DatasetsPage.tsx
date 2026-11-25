import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Database, Upload, Trash2, BarChart3, Search, RefreshCw, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { datasetsApi, dashboardsApi, getErrorMessage } from '../lib/api';
import { useDashboardStore } from '../store/dashboardStore';
import { formatFileSize, formatRelativeTime, getStatusColor, getFileTypeColor } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import type { Dataset } from '../types';

export default function DatasetsPage() {
  const navigate = useNavigate();
  const { datasets, setDatasets } = useDashboardStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const response = await datasetsApi.list();
      setDatasets(response.data);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (d: Dataset) => {
    if (!window.confirm(`Delete "${d.name}"?`)) return;
    try {
      await datasetsApi.delete(d.id);
      setDatasets(datasets.filter((ds) => ds.id !== d.id));
      toast.success('Dataset deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleCreateDashboard = async (d: Dataset) => {
    setCreating(d.id);
    try {
      const response = await dashboardsApi.create({ dataset_id: d.id, name: `${d.name} Dashboard` });
      navigate(`/dashboards/${response.data.id}`);
      toast.success('Dashboard created!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreating(null);
    }
  };

  const filtered = datasets.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.original_filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Datasets</h1>
          <p className="text-slate-500 text-sm mt-0.5">{datasets.length} dataset{datasets.length !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary text-sm">
            <RefreshCw size={14} />
          </button>
          <Link to="/upload" className="btn-primary text-sm">
            <Upload size={14} /> Upload New
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search datasets..."
          className="input pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        datasets.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No Datasets Yet"
            description="Upload your first data file to get started. We support CSV, Excel, JSON, and more."
            action={{ label: 'Upload Data', onClick: () => navigate('/upload') }}
          />
        ) : (
          <EmptyState icon={Search} title="No Results" description={`No datasets match "${search}"`} />
        )
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-4 hover:shadow-card-hover transition-shadow"
            >
              <div className="flex items-center gap-4 flex-wrap">
                {/* File type badge */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${getFileTypeColor(d.file_type)}`}>
                  {d.file_type?.toUpperCase().slice(0, 3)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/datasets/${d.id}`} className="text-base font-semibold text-slate-900 hover:text-brand-600 transition-colors">
                      {d.name}
                    </Link>
                    <span className={`badge text-xs ${getStatusColor(d.status)}`}>{d.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                    <span>{d.original_filename}</span>
                    <span>{formatFileSize(d.file_size)}</span>
                    {d.row_count > 0 && <span>{d.row_count.toLocaleString()} rows · {d.column_count} cols</span>}
                    <span>{formatRelativeTime(d.created_at)}</span>
                  </div>
                  {d.error_message && (
                    <p className="text-xs text-red-500 mt-1">{d.error_message}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/datasets/${d.id}`} className="btn-secondary text-sm">
                    <FileText size={13} /> View
                  </Link>
                  {d.status === 'ready' && (
                    <button
                      onClick={() => handleCreateDashboard(d)}
                      disabled={creating === d.id}
                      className="btn-primary text-sm"
                    >
                      {creating === d.id ? <LoadingSpinner size="sm" /> : <BarChart3 size={13} />}
                      Dashboard
                    </button>
                  )}
                  <button onClick={() => handleDelete(d)} className="btn-ghost text-slate-400 hover:text-red-500">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
