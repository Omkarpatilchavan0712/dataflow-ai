import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, BarChart3, Database, TrendingUp, ArrowRight, Clock, FileText, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { dashboardsApi, datasetsApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { formatRelativeTime, formatFileSize } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { Dataset, Dashboard } from '../types';

export default function WorkspacePage() {
  const { user } = useAuthStore();
  const { datasets, setDatasets, dashboards, setDashboards } = useDashboardStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [dRes, dbRes] = await Promise.allSettled([
          datasetsApi.list(),
          dashboardsApi.list(),
        ]);
        if (dRes.status === 'fulfilled') setDatasets(dRes.value.data);
        if (dbRes.status === 'fulfilled') setDashboards(dbRes.value.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const recentDatasets = datasets.slice(0, 3);
  const recentDashboards = dashboards.slice(0, 3);
  const readyDatasets = datasets.filter((d) => d.status === 'ready').length;
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}, {user?.full_name?.split(' ')[0] || user?.username}! 👋
          </h1>
          <p className="text-slate-500 mt-1">Your DataFlow AI workspace</p>
        </div>
        <Link to="/upload" className="btn-primary">
          <Upload size={16} />
          Upload New Data
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Datasets', value: datasets.length, icon: Database, color: 'text-blue-600 bg-blue-50', href: '/datasets' },
          { label: 'Ready Datasets', value: readyDatasets, icon: FileText, color: 'text-emerald-600 bg-emerald-50', href: '/datasets' },
          { label: 'Dashboards', value: dashboards.length, icon: BarChart3, color: 'text-purple-600 bg-purple-50', href: '/dashboards' },
          { label: 'AI Insights', value: readyDatasets * 5, icon: Zap, color: 'text-orange-600 bg-orange-50', href: '/insights' },
        ].map((stat) => (
          <Link key={stat.label} to={stat.href}>
            <motion.div whileHover={{ y: -2 }} className="card p-5 cursor-pointer hover:shadow-card-hover transition-shadow">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
                <stat.icon size={18} />
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-0.5">
                {loading ? <div className="skeleton h-7 w-10" /> : stat.value}
              </div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      {datasets.length === 0 && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-8 text-center bg-gradient-to-br from-brand-50 to-white">
          <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4">
            <Upload size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Upload Your First Dataset</h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Upload any data file — CSV, Excel, JSON, and more. DataFlow AI will automatically
            analyze it and generate a complete, interactive dashboard.
          </p>
          <Link to="/upload" className="btn-primary text-base px-6 py-2.5">
            <Upload size={16} /> Upload Data
          </Link>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Datasets */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent Datasets</h2>
            <Link to="/datasets" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)}
            </div>
          ) : recentDatasets.length === 0 ? (
            <div className="text-center py-6">
              <Database size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No datasets yet</p>
              <Link to="/upload" className="text-xs text-brand-600 mt-1 inline-block">Upload one →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentDatasets.map((d: Dataset) => (
                <Link key={d.id} to={`/datasets/${d.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{d.name}</p>
                    <p className="text-xs text-slate-400">{d.row_count?.toLocaleString()} rows · {formatRelativeTime(d.created_at)}</p>
                  </div>
                  <span className={`badge text-xs ${d.status === 'ready' ? 'badge-green' : d.status === 'processing' ? 'badge-blue' : 'badge-red'}`}>
                    {d.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Dashboards */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent Dashboards</h2>
            <Link to="/dashboards" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)}
            </div>
          ) : recentDashboards.length === 0 ? (
            <div className="text-center py-6">
              <BarChart3 size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No dashboards yet</p>
              <p className="text-xs text-slate-400">Upload data to auto-generate one</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentDashboards.map((d: any) => (
                <Link key={d.id} to={`/dashboards/${d.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                    <BarChart3 size={14} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{d.name}</p>
                    <p className="text-xs text-slate-400">{d.chart_count} charts · {formatRelativeTime(d.updated_at)}</p>
                  </div>
                  <span className="badge badge-blue text-xs">{d.theme}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { title: 'AI Chat', desc: 'Ask questions about your data', icon: Zap, href: '/chat', color: 'from-purple-500 to-indigo-500' },
          { title: 'AI Insights', desc: 'View auto-generated insights', icon: TrendingUp, href: '/insights', color: 'from-emerald-500 to-teal-500' },
          { title: 'Reports', desc: 'Export PDF reports', icon: FileText, href: '/reports', color: 'from-orange-500 to-amber-500' },
        ].map((item) => (
          <Link key={item.title} to={item.href}>
            <motion.div
              whileHover={{ y: -2 }}
              className={`card p-5 cursor-pointer bg-gradient-to-br ${item.color} text-white hover:shadow-card-hover transition-shadow`}
            >
              <item.icon size={22} className="mb-3 opacity-90" />
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-xs opacity-80">{item.desc}</p>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
