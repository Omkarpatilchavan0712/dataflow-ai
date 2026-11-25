import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, Download, Trash2, RefreshCw, Table2, AlertCircle, CheckCircle, Database, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { datasetsApi, dashboardsApi, getErrorMessage } from '../lib/api';
import { formatFileSize, formatDate, getStatusColor } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { Dataset } from '../types';

export default function DatasetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [preview, setPreview] = useState<{ columns: string[]; rows: any[][]; total_rows: number; total_pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'preview' | 'columns' | 'quality'>('preview');
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [creatingDashboard, setCreatingDashboard] = useState(false);

  useEffect(() => {
    const dsId = parseInt(id || '0');
    if (!dsId) return;
    fetchDataset(dsId);
    return () => { if (pollingInterval) clearInterval(pollingInterval); };
  }, [id]);

  const fetchDataset = async (dsId: number) => {
    setLoading(true);
    try {
      const response = await datasetsApi.get(dsId);
      const ds = response.data as Dataset;
      setDataset(ds);
      if (ds.status === 'ready') {
        fetchPreview(dsId, 1);
      } else if (ds.status === 'processing') {
        startPolling(dsId);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (dsId: number) => {
    const interval = setInterval(async () => {
      try {
        const response = await datasetsApi.get(dsId);
        const ds = response.data as Dataset;
        setDataset(ds);
        if (ds.status !== 'processing') {
          clearInterval(interval);
          setPollingInterval(null);
          if (ds.status === 'ready') {
            fetchPreview(dsId, 1);
            toast.success('Dataset processed successfully!');
          }
        }
      } catch {}
    }, 3000);
    setPollingInterval(interval);
  };

  const fetchPreview = async (dsId: number, pg: number) => {
    setPreviewLoading(true);
    try {
      const response = await datasetsApi.preview(dsId, pg, 50);
      setPreview(response.data);
      setPage(pg);
    } catch (err) {
      toast.error('Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!dataset) return;
    if (!window.confirm(`Delete "${dataset.name}"? This cannot be undone.`)) return;
    try {
      await datasetsApi.delete(dataset.id);
      toast.success('Dataset deleted');
      navigate('/datasets');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleCreateDashboard = async () => {
    if (!dataset) return;
    setCreatingDashboard(true);
    try {
      const response = await dashboardsApi.create({
        dataset_id: dataset.id,
        name: `${dataset.name} Dashboard`,
      });
      toast.success('Dashboard created!');
      navigate(`/dashboards/${response.data.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreatingDashboard(false);
    }
  };

  const handleSelectSheet = async (sheetName: string) => {
    if (!dataset) return;
    try {
      await datasetsApi.selectSheet(dataset.id, sheetName);
      toast.success(`Sheet "${sheetName}" selected. Reprocessing...`);
      fetchDataset(dataset.id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" message="Loading dataset..." /></div>;
  }

  if (!dataset) return null;

  const columnInfo = dataset.column_info || {};
  const analysis = dataset.summary_stats?.analysis;
  const quality = analysis?.data_quality;

  const semanticCounts = { numeric: 0, categorical: 0, datetime: 0, text: 0, boolean: 0 };
  Object.values(columnInfo).forEach((c) => { if (c.semantic_type in semanticCounts) semanticCounts[c.semantic_type as keyof typeof semanticCounts]++; });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/datasets')} className="btn-ghost mt-0.5"><ArrowLeft size={16} /></button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{dataset.name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-sm text-slate-500">{dataset.original_filename}</span>
              <span className={`badge text-xs ${getStatusColor(dataset.status)}`}>{dataset.status}</span>
              {dataset.status === 'processing' && <Loader2 size={12} className="text-blue-500 animate-spin" />}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {dataset.status === 'ready' && (
            <>
              <a href={datasetsApi.exportCsv(dataset.id)} className="btn-secondary text-sm" download>
                <Download size={14} /> CSV
              </a>
              <a href={datasetsApi.exportExcel(dataset.id)} className="btn-secondary text-sm" download>
                <Download size={14} /> Excel
              </a>
              <button onClick={handleCreateDashboard} disabled={creatingDashboard} className="btn-primary text-sm">
                {creatingDashboard ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
                Create Dashboard
              </button>
            </>
          )}
          <button onClick={handleDelete} className="btn-secondary text-sm text-red-600 hover:border-red-300">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Processing state */}
      {dataset.status === 'processing' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-8 text-center">
          <Loader2 size={32} className="text-brand-500 animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Processing Your Dataset</h2>
          <p className="text-slate-500">Analyzing data, detecting types, and generating insights...</p>
        </motion.div>
      )}

      {dataset.status === 'error' && (
        <div className="card p-5 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle size={18} />
            <span className="font-medium">Processing Failed</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{dataset.error_message}</p>
        </div>
      )}

      {/* Sheet selection (Excel) */}
      {dataset.sheet_names && dataset.sheet_names.length > 1 && (
        <div className="card p-4">
          <label className="label">Select Excel Sheet</label>
          <div className="flex gap-2 flex-wrap">
            {dataset.sheet_names.map((s) => (
              <button
                key={s}
                onClick={() => handleSelectSheet(s)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  dataset.selected_sheet === s
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {dataset.status === 'ready' && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Rows', value: dataset.row_count?.toLocaleString(), icon: Database, color: 'text-blue-600 bg-blue-50' },
              { label: 'Columns', value: dataset.column_count, icon: Table2, color: 'text-purple-600 bg-purple-50' },
              { label: 'File Size', value: formatFileSize(dataset.file_size), icon: Database, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Quality Score', value: `${quality?.quality_score || 0}%`, icon: CheckCircle, color: quality?.quality_score >= 90 ? 'text-emerald-600 bg-emerald-50' : 'text-orange-600 bg-orange-50' },
            ].map((stat) => (
              <div key={stat.label} className="card p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${stat.color}`}>
                  <stat.icon size={16} />
                </div>
                <div className="text-xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Column type breakdown */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Column Types</h3>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(semanticCounts).filter(([,v]) => v > 0).map(([type, count]) => (
                <span key={type} className="badge-blue text-xs">{count} {type}</span>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="card overflow-hidden">
            <div className="flex border-b border-slate-200">
              {(['preview', 'columns', 'quality'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-5 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                    activeTab === tab
                      ? 'text-brand-600 border-brand-600'
                      : 'text-slate-500 border-transparent hover:text-slate-700'
                  }`}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-4">
              {/* Preview tab */}
              {activeTab === 'preview' && (
                <div>
                  {previewLoading ? (
                    <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
                  ) : preview ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 border-b border-slate-200 w-10">#</th>
                              {preview.columns.slice(0, 15).map((col) => (
                                <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-slate-700 border-b border-slate-200 whitespace-nowrap max-w-32 truncate">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {preview.rows.map((row, i) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-2 text-xs text-slate-400">{(page - 1) * 50 + i + 1}</td>
                                {row.slice(0, 15).map((cell, j) => (
                                  <td key={j} className="px-3 py-2 text-xs text-slate-700 max-w-32 truncate">
                                    {cell === null || cell === undefined ? <span className="text-slate-300 italic">null</span> : String(cell)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Pagination */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500">
                          Showing {((page-1)*50)+1}–{Math.min(page*50, preview.total_rows)} of {preview.total_rows.toLocaleString()} rows
                        </p>
                        <div className="flex items-center gap-2">
                          <button disabled={page === 1} onClick={() => fetchPreview(dataset.id, page - 1)} className="btn-ghost py-1 px-2 disabled:opacity-50">
                            <ChevronLeft size={15} />
                          </button>
                          <span className="text-xs text-slate-700">{page} / {preview.total_pages}</span>
                          <button disabled={page >= preview.total_pages} onClick={() => fetchPreview(dataset.id, page + 1)} className="btn-ghost py-1 px-2 disabled:opacity-50">
                            <ChevronRight size={15} />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {/* Columns tab */}
              {activeTab === 'columns' && (
                <div className="space-y-2">
                  {Object.entries(columnInfo).map(([col, info]) => (
                    <div key={col} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">{col}</span>
                          <span className={`badge text-xs ${
                            info.semantic_type === 'numeric' ? 'badge-blue' :
                            info.semantic_type === 'categorical' ? 'badge-green' :
                            info.semantic_type === 'datetime' ? 'badge-orange' : 'badge-gray'
                          }`}>{info.semantic_type}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                          <span>{info.unique_count} unique</span>
                          <span>{info.null_pct}% null</span>
                          {info.sample_values && <span>e.g. {info.sample_values.slice(0,2).join(', ')}</span>}
                        </div>
                      </div>
                      {info.semantic_type === 'numeric' && info.mean !== undefined && (
                        <div className="text-right text-xs text-slate-500 shrink-0 ml-4">
                          <div>avg: <span className="text-slate-700 font-medium">{Number(info.mean).toFixed(2)}</span></div>
                          <div>sum: <span className="text-slate-700 font-medium">{Number(info.sum).toLocaleString()}</span></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Quality tab */}
              {activeTab === 'quality' && quality && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-xl bg-slate-50">
                      <div className="text-2xl font-bold text-slate-900">{quality.quality_score}%</div>
                      <div className="text-xs text-slate-500">Quality Score</div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-slate-50">
                      <div className="text-2xl font-bold text-slate-900">{quality.duplicate_count}</div>
                      <div className="text-xs text-slate-500">Duplicates</div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-slate-50">
                      <div className="text-2xl font-bold text-slate-900">{Object.keys(quality.missing_by_column || {}).length}</div>
                      <div className="text-xs text-slate-500">Cols with Nulls</div>
                    </div>
                  </div>
                  {Object.entries(quality.missing_by_column || {}).map(([col, info]) => (
                    <div key={col} className="flex items-center gap-3">
                      <span className="text-sm text-slate-700 w-40 truncate">{col}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${info.pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-20 text-right">{info.count} ({info.pct}%)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
