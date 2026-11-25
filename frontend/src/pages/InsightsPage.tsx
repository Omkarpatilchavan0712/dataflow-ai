import React, { useState, useEffect } from 'react';
import { Sparkles, Database, TrendingUp, AlertTriangle, Info, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { analyticsApi, datasetsApi, getErrorMessage } from '../lib/api';
import InsightCard from '../components/dashboard/InsightCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { Dataset, Insight } from '../types';

export default function InsightsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDatasets, setLoadingDatasets] = useState(true);

  useEffect(() => {
    loadDatasets();
  }, []);

  useEffect(() => {
    if (selectedDataset) loadInsights(selectedDataset.id);
  }, [selectedDataset]);

  const loadDatasets = async () => {
    try {
      const response = await datasetsApi.list();
      const ready = response.data.filter((d: Dataset) => d.status === 'ready');
      setDatasets(ready);
      if (ready.length > 0) setSelectedDataset(ready[0]);
    } catch {
      toast.error('Failed to load datasets');
    } finally {
      setLoadingDatasets(false);
    }
  };

  const loadInsights = async (datasetId: number) => {
    setLoading(true);
    try {
      const response = await analyticsApi.insights(datasetId);
      setInsights(response.data.insights || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const grouped = {
    info: insights.filter((i) => i.severity === 'info'),
    warning: insights.filter((i) => i.severity === 'warning'),
    success: insights.filter((i) => i.severity === 'success'),
    danger: insights.filter((i) => i.severity === 'danger'),
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles size={22} className="text-brand-600" />
            AI Insights
          </h1>
          <p className="text-sm text-slate-500">AI-generated insights backed by actual data calculations</p>
        </div>
      </div>

      {/* Dataset selector */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <Database size={16} className="text-slate-400" />
          <label className="text-sm text-slate-600 shrink-0">Dataset:</label>
          {loadingDatasets ? (
            <LoadingSpinner size="sm" />
          ) : datasets.length === 0 ? (
            <span className="text-sm text-slate-400">No datasets available. Upload one first.</span>
          ) : (
            <select
              className="flex-1 input py-1.5"
              value={selectedDataset?.id || ''}
              onChange={(e) => setSelectedDataset(datasets.find((d) => d.id === parseInt(e.target.value)) || null)}
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.row_count?.toLocaleString()} rows)</option>
              ))}
            </select>
          )}
          {selectedDataset && (
            <button onClick={() => loadInsights(selectedDataset.id)} className="btn-secondary text-sm">
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" message="Generating insights..." />
        </div>
      ) : insights.length === 0 ? (
        <div className="card p-10 text-center">
          <Sparkles size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No insights available. Select a ready dataset.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Info', count: grouped.info.length, icon: Info, color: 'text-blue-600 bg-blue-50' },
              { label: 'Warnings', count: grouped.warning.length, icon: AlertTriangle, color: 'text-orange-600 bg-orange-50' },
              { label: 'Positive', count: grouped.success.length, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Issues', count: grouped.danger.length, icon: XCircle, color: 'text-red-600 bg-red-50' },
            ].map((item) => (
              <div key={item.label} className="card p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${item.color}`}>
                  <item.icon size={16} />
                </div>
                <div className="text-xl font-bold text-slate-900">{item.count}</div>
                <div className="text-xs text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>

          {/* Insights list */}
          <div className="space-y-3">
            {insights.map((insight, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <InsightCard insight={insight} />
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
