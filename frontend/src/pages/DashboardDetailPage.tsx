import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Share2, Download, Palette, Edit3, MoreVertical,
  RefreshCw, Trash2, Eye, Settings
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardView from '../components/dashboard/DashboardView';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { dashboardsApi, getErrorMessage } from '../lib/api';
import { useDashboardStore } from '../store/dashboardStore';
import type { Dashboard } from '../types';

const THEMES = [
  { id: 'light', label: 'Modern Light', bg: 'bg-white', text: 'text-slate-900' },
  { id: 'dark', label: 'Dark Professional', bg: 'bg-slate-900', text: 'text-white' },
  { id: 'blue', label: 'Midnight Blue', bg: 'bg-blue-950', text: 'text-blue-100' },
  { id: 'minimal', label: 'Minimal White', bg: 'bg-gray-50', text: 'text-gray-900' },
];

export default function DashboardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentDashboard, setCurrentDashboard, updateDashboard } = useDashboardStore();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    const dashId = parseInt(id || '0');
    if (!dashId) return;
    fetchDashboard(dashId);
  }, [id]);

  const fetchDashboard = async (dashId: number) => {
    setLoading(true);
    try {
      const response = await dashboardsApi.get(dashId);
      const d = response.data as Dashboard;
      setDashboard(d);
      setTitle(d.name);
      setCurrentDashboard(d);
    } catch (err) {
      toast.error(getErrorMessage(err));
      navigate('/dashboards');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updates: Partial<Dashboard>) => {
    if (!dashboard) return;
    setSaving(true);
    try {
      await dashboardsApi.update(dashboard.id, updates);
      setDashboard((prev) => prev ? { ...prev, ...updates } : prev);
      updateDashboard(dashboard.id, updates);
      toast.success('Dashboard saved');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTitleSave = async () => {
    if (!dashboard || !title.trim()) return;
    setEditingTitle(false);
    await handleSave({ name: title.trim() });
  };

  const handleThemeChange = async (theme: string) => {
    setShowThemes(false);
    setDashboard((prev) => prev ? { ...prev, theme } : prev);
    await handleSave({ theme });
  };

  const handleDelete = async () => {
    if (!dashboard) return;
    if (!window.confirm(`Delete "${dashboard.name}"? This cannot be undone.`)) return;
    try {
      await dashboardsApi.delete(dashboard.id);
      toast.success('Dashboard deleted');
      navigate('/dashboards');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleShare = async () => {
    if (!dashboard) return;
    try {
      const response = await dashboardsApi.togglePublic(dashboard.id);
      const { is_public, public_token } = response.data;
      if (is_public && public_token) {
        const url = `${window.location.origin}/share/${public_token}`;
        await navigator.clipboard.writeText(url);
        toast.success('Share link copied to clipboard!');
      } else {
        toast.success('Dashboard is now private');
      }
      setDashboard((prev) => prev ? { ...prev, is_public, public_token } : prev);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleExportPDF = () => {
    if (!dashboard) return;
    const token = localStorage.getItem('dataflow-auth');
    let authToken = '';
    try { authToken = JSON.parse(token || '{}').state?.token || ''; } catch {}
    
    // Create a form to trigger authenticated download
    const url = dashboardsApi.exportPdf(dashboard.id);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Generating PDF report...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" message="Loading dashboard..." />
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/dashboards')} className="btn-ghost mt-0.5">
            <ArrowLeft size={16} />
          </button>
          <div>
            {editingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                className="text-2xl font-bold text-slate-900 bg-transparent border-b-2 border-brand-500 outline-none"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{dashboard.name}</h1>
                <button onClick={() => setEditingTitle(true)} className="text-slate-400 hover:text-slate-600">
                  <Edit3 size={16} />
                </button>
              </div>
            )}
            {dashboard.dataset_name && (
              <p className="text-sm text-slate-500 mt-0.5">
                Dataset: {dashboard.dataset_name} · {dashboard.dataset_row_count?.toLocaleString()} rows
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {saving && <span className="text-xs text-slate-500 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Saving...</span>}

          <div className="relative">
            <button onClick={() => setShowThemes(!showThemes)} className="btn-secondary">
              <Palette size={15} />
              Theme
            </button>
            {showThemes && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-modal z-20 p-1">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleThemeChange(t.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-50 flex items-center gap-2 ${dashboard.theme === t.id ? 'text-brand-600 font-medium' : 'text-slate-700'}`}
                  >
                    <div className={`w-4 h-4 rounded border border-slate-200 ${t.bg}`} />
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleShare} className="btn-secondary">
            <Share2 size={15} />
            {dashboard.is_public ? 'Shared' : 'Share'}
          </button>

          <button onClick={handleExportPDF} className="btn-secondary">
            <Download size={15} />
            Export PDF
          </button>

          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="btn-secondary">
              <MoreVertical size={15} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-slate-200 shadow-modal z-20 p-1">
                <button
                  onClick={() => { setShowMenu(false); navigate(`/datasets/${dashboard.dataset_id}`); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Eye size={14} /> View Dataset
                </button>
                <button
                  onClick={() => { setShowMenu(false); handleDelete(); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 size={14} /> Delete Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard content */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <DashboardView
          dashboard={dashboard}
          onSave={handleSave}
          readOnly={false}
        />
      </motion.div>
    </div>
  );
}
