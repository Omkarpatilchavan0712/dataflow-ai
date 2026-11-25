import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, Trash2, Search, RefreshCw, ExternalLink, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { dashboardsApi, getErrorMessage } from '../lib/api';
import { useDashboardStore } from '../store/dashboardStore';
import { formatRelativeTime } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

export default function DashboardsPage() {
  const navigate = useNavigate();
  const { dashboards, setDashboards } = useDashboardStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await dashboardsApi.list();
      setDashboards(r.data);
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await dashboardsApi.delete(id);
      setDashboards(dashboards.filter((d) => d.id !== id));
      toast.success('Dashboard deleted');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const filtered = dashboards.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.dataset_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboards</h1>
          <p className="text-sm text-slate-500">{dashboards.length} dashboard{dashboards.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={load} className="btn-secondary text-sm"><RefreshCw size={14} /></button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder="Search dashboards..." className="input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No Dashboards Yet"
          description="Upload a dataset to automatically generate your first dashboard."
          action={{ label: 'Upload Data', onClick: () => navigate('/upload') }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <motion.div key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="card hover:shadow-card-hover transition-shadow overflow-hidden">
              {/* Color header */}
              <div className="h-24 bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                <BarChart3 size={32} className="text-white/80" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 truncate">{d.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{d.dataset_name || 'Unknown dataset'}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <span>{d.chart_count} charts</span>
                  <span>·</span>
                  <span>{d.kpi_count} KPIs</span>
                  <span>·</span>
                  <span>{formatRelativeTime(d.updated_at)}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Link to={`/dashboards/${d.id}`} className="btn-primary text-xs flex-1 justify-center">
                    <ExternalLink size={12} /> Open
                  </Link>
                  <button onClick={() => handleDelete(d.id, d.name)} className="btn-ghost text-slate-400 hover:text-red-500">
                    <Trash2 size={14} />
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
