import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Filter, X, Download, Maximize2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import ChartRenderer from '../charts/ChartRenderer';
import KPICard from '../ui/KPICard';
import LoadingSpinner from '../ui/LoadingSpinner';
import { analyticsApi } from '../../lib/api';
import { formatRelativeTime, cn } from '../../lib/utils';
import type { Dashboard, Chart, KPI } from '../../types';

interface DashboardViewProps {
  dashboard: Dashboard;
  onSave?: (updates: Partial<Dashboard>) => void;
  readOnly?: boolean;
}

const DashboardView: React.FC<DashboardViewProps> = ({ dashboard, onSave, readOnly = false }) => {
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>(dashboard.filters || {});
  const [chartData, setChartData] = useState<Record<string, any>>({});
  const [loadingCharts, setLoadingCharts] = useState<Set<string>>(new Set());
  const [fullscreenChart, setFullscreenChart] = useState<Chart | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const kpis: KPI[] = dashboard.kpis || [];
  const charts: Chart[] = dashboard.charts || [];
  const columnInfo = dashboard.column_info || {};

  // Get filterable columns
  const categoricalCols = Object.entries(columnInfo)
    .filter(([, v]) => v.semantic_type === 'categorical')
    .slice(0, 5);
  const datetimeCols = Object.entries(columnInfo)
    .filter(([, v]) => v.semantic_type === 'datetime')
    .slice(0, 2);

  const activeFilterCount = Object.keys(activeFilters).filter(
    (k) => activeFilters[k] !== null && activeFilters[k] !== '' &&
      !(Array.isArray(activeFilters[k]) && activeFilters[k].length === 0)
  ).length;

  const fetchChartData = useCallback(async (chart: Chart, filters: Record<string, any>) => {
    if (!dashboard.dataset_id) return;
    if (chart.type === 'data_table') return; // tables get data from preview API

    const chartId = chart.id;
    setLoadingCharts((prev) => new Set(prev).add(chartId));

    try {
      const payload: any = {
        dataset_id: dashboard.dataset_id,
        chart_id: chartId,
        chart_type: chart.type,
        filters,
      };
      if (chart.x_axis) payload.x_axis = chart.x_axis;
      if (chart.y_axis) payload.y_axis = chart.y_axis;
      if (chart.category_col) payload.category_col = chart.category_col;
      if (chart.column) payload.x_axis = chart.column;

      const response = await analyticsApi.chartData(payload);
      setChartData((prev) => ({ ...prev, [chartId]: response.data.data }));
    } catch {
      // Keep original data on error
    } finally {
      setLoadingCharts((prev) => {
        const next = new Set(prev);
        next.delete(chartId);
        return next;
      });
    }
  }, [dashboard.dataset_id]);

  const refreshAllCharts = useCallback(async () => {
    const toRefresh = charts.filter((c) => c.type !== 'data_table');
    await Promise.allSettled(toRefresh.map((c) => fetchChartData(c, activeFilters)));
    toast.success('Dashboard refreshed');
  }, [charts, activeFilters, fetchChartData]);

  const applyFilters = useCallback(async (newFilters: Record<string, any>) => {
    setActiveFilters(newFilters);
    // Refetch all charts with new filters
    const toRefresh = charts.filter((c) => c.type !== 'data_table');
    await Promise.allSettled(toRefresh.map((c) => fetchChartData(c, newFilters)));
    if (!readOnly && onSave) {
      onSave({ filters: newFilters });
    }
  }, [charts, fetchChartData, readOnly, onSave]);

  const resetFilters = () => applyFilters({});

  const getChartData = (chart: Chart) => {
    return chartData[chart.id] ?? chart.data;
  };

  const getChartHeight = (size: string) => {
    const heights: Record<string, number> = { small: 260, medium: 320, large: 400 };
    return heights[size] || 320;
  };

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span><span className="font-semibold text-slate-900">{kpis.length}</span> KPIs</span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <span><span className="font-semibold text-slate-900">{charts.length}</span> Charts</span>
          {dashboard.dataset_name && (
            <>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span>Dataset: <span className="font-medium text-slate-700">{dashboard.dataset_name}</span></span>
            </>
          )}
          {dashboard.updated_at && (
            <>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span>Updated {formatRelativeTime(dashboard.updated_at)}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <>
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={cn('btn-secondary relative', activeFilterCount > 0 && 'ring-2 ring-brand-500')}
              >
                <Filter size={15} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button onClick={refreshAllCharts} className="btn-secondary">
                <RefreshCw size={15} />
                Refresh
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter panel */}
      {filtersOpen && (categoricalCols.length > 0 || datetimeCols.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1">
                  <X size={12} /> Reset all
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            {categoricalCols.map(([col, info]) => {
              const topValues = info.top_values ? Object.keys(info.top_values) : [];
              return (
                <div key={col} className="min-w-[180px]">
                  <label className="label">{col}</label>
                  <select
                    className="input"
                    value={activeFilters[col] || ''}
                    onChange={(e) => {
                      const newFilters = { ...activeFilters, [col]: e.target.value || undefined };
                      if (!e.target.value) delete newFilters[col];
                      applyFilters(newFilters);
                    }}
                  >
                    <option value="">All</option>
                    {topValues.slice(0, 20).map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              );
            })}
            {datetimeCols.map(([col]) => (
              <div key={col} className="min-w-[180px]">
                <label className="label">{col} (from)</label>
                <input
                  type="date"
                  className="input"
                  value={(activeFilters[col] as any)?.start || ''}
                  onChange={(e) => {
                    const existing = activeFilters[col] || {};
                    applyFilters({ ...activeFilters, [col]: { ...existing, start: e.target.value } });
                  }}
                />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* KPI Cards */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <KPICard kpi={kpi} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {charts.map((chart, idx) => {
          if (chart.size === 'large' || chart.type === 'data_table') {
            return (
              <div key={chart.id} className="col-span-1 md:col-span-2">
                <ChartCard
                  chart={chart}
                  data={getChartData(chart)}
                  loading={loadingCharts.has(chart.id)}
                  onFullscreen={() => setFullscreenChart(chart)}
                  height={getChartHeight(chart.size)}
                  datasetId={dashboard.dataset_id}
                  filters={activeFilters}
                />
              </div>
            );
          }
          return (
            <ChartCard
              key={chart.id}
              chart={chart}
              data={getChartData(chart)}
              loading={loadingCharts.has(chart.id)}
              onFullscreen={() => setFullscreenChart(chart)}
              height={getChartHeight(chart.size)}
              datasetId={dashboard.dataset_id}
              filters={activeFilters}
            />
          );
        })}
      </div>

      {/* Fullscreen modal */}
      {fullscreenChart && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setFullscreenChart(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">{fullscreenChart.title}</h2>
              <button onClick={() => setFullscreenChart(null)} className="btn-ghost">
                <X size={18} />
              </button>
            </div>
            <ChartRenderer
              chart={{ ...fullscreenChart, data: getChartData(fullscreenChart) }}
              height={520}
              datasetId={dashboard.dataset_id}
              filters={activeFilters}
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface ChartCardProps {
  chart: Chart;
  data: any;
  loading: boolean;
  onFullscreen: () => void;
  height: number;
  datasetId?: number;
  filters?: Record<string, any>;
}

const ChartCard: React.FC<ChartCardProps> = ({ chart, data, loading, onFullscreen, height, datasetId, filters }) => {
  const typeLabel: Record<string, string> = {
    bar: 'Bar', horizontal_bar: 'H-Bar', line: 'Line', area: 'Area',
    pie: 'Pie', donut: 'Donut', scatter: 'Scatter', histogram: 'Histogram',
    data_table: 'Table',
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between p-4 pb-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate">{chart.title}</h3>
          <span className="badge-blue shrink-0">{typeLabel[chart.type] || chart.type}</span>
        </div>
        <button
          onClick={onFullscreen}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          title="Fullscreen"
        >
          <Maximize2 size={14} />
        </button>
      </div>
      <div className="p-4 pt-3">
        {loading ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <ChartRenderer
            chart={{ ...chart, data }}
            height={height}
            datasetId={datasetId}
            filters={filters}
          />
        )}
      </div>
    </div>
  );
};

export default DashboardView;
