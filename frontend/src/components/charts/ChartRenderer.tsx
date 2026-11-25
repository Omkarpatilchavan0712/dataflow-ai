import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  TooltipProps,
} from 'recharts';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { CHART_COLORS, formatNumber, cn } from '../../lib/utils';
import type { Chart } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChartRendererProps {
  chart: Chart;
  height?: number;
  filters?: Record<string, any>;
  datasetId?: number;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      {label !== undefined && label !== null && (
        <p className="font-semibold text-slate-700 mb-1 truncate max-w-[180px]">{String(label)}</p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color ?? CHART_COLORS[i % CHART_COLORS.length] }}
          />
          <span className="text-slate-500 capitalize">{entry.name}:</span>
          <span className="font-medium text-slate-800">
            {typeof entry.value === 'number' ? formatNumber(entry.value) : String(entry.value ?? '')}
          </span>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Custom Legend
// ---------------------------------------------------------------------------

const CustomLegend = ({ payload }: { payload?: Array<{ value: string; color: string }> }) => {
  if (!payload || payload.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="truncate max-w-[120px]">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Helpers – normalise raw data shapes coming from the API
// ---------------------------------------------------------------------------

/** Coerce chart.data into a flat array regardless of how the backend sends it. */
function normaliseData(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  // {labels, values} shape (common from analytics endpoints)
  if (raw.labels && raw.values) {
    const labels: any[] = raw.labels;
    const values: any[] = raw.values;
    return labels.map((label: any, i: number) => ({ name: label, value: values[i] ?? 0 }));
  }
  // {bins, counts} histogram shape
  if (raw.bins && raw.counts) {
    const bins: number[] = raw.bins;
    const counts: number[] = raw.counts;
    return counts.map((count: number, i: number) => ({
      name: bins[i] !== undefined && bins[i + 1] !== undefined
        ? `${formatNumber(bins[i])}–${formatNumber(bins[i + 1])}`
        : formatNumber(bins[i]),
      count,
    }));
  }
  // {dates, values} time-series
  if (raw.dates && raw.values) {
    return (raw.dates as string[]).map((date: string, i: number) => ({
      date,
      value: (raw.values as number[])[i] ?? 0,
    }));
  }
  // Single object – wrap
  if (typeof raw === 'object') return [raw];
  return [];
}

/** Derive a reasonable tick formatter that shortens long strings. */
const tickFormatter = (value: any) => {
  if (typeof value === 'number') return formatNumber(value);
  const str = String(value ?? '');
  return str.length > 14 ? str.slice(0, 12) + '…' : str;
};

// ---------------------------------------------------------------------------
// Individual chart renderers
// ---------------------------------------------------------------------------

const CONTAINER_PADDING = { top: 8, right: 16, left: 8, bottom: 8 };

function BarRenderer({ chart, height }: { chart: Chart; height: number }) {
  const data = normaliseData(chart.data);
  const xKey = chart.x_axis || 'name';
  const yKey = chart.y_axis || 'value';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={CONTAINER_PADDING} barCategoryGap="30%">
        <defs>
          <linearGradient id={`bar-grad-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={1} />
            <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.75} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={tickFormatter}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={tickFormatter}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
        <Legend content={<CustomLegend />} />
        <Bar
          dataKey={yKey}
          fill={`url(#bar-grad-${chart.id})`}
          radius={[4, 4, 0, 0]}
          isAnimationActive
          animationDuration={600}
          animationEasing="ease-out"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function HorizontalBarRenderer({ chart, height }: { chart: Chart; height: number }) {
  const data = normaliseData(chart.data);
  const xKey = chart.x_axis || 'name';
  const yKey = chart.y_axis || 'value';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ ...CONTAINER_PADDING, left: 16 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={tickFormatter}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey={xKey}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={tickFormatter}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
        <Legend content={<CustomLegend />} />
        <Bar
          dataKey={yKey}
          fill={CHART_COLORS[1]}
          radius={[0, 4, 4, 0]}
          isAnimationActive
          animationDuration={600}
          animationEasing="ease-out"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineRenderer({ chart, height }: { chart: Chart; height: number }) {
  const data = normaliseData(chart.data);
  const xKey = chart.x_axis || chart.y_axis || 'date';
  const yKey = chart.y_axis || 'value';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={CONTAINER_PADDING}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={tickFormatter}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={tickFormatter}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
        <Line
          type="monotone"
          dataKey={yKey}
          stroke={CHART_COLORS[0]}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 0 }}
          isAnimationActive
          animationDuration={700}
          animationEasing="ease-out"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function AreaRenderer({ chart, height }: { chart: Chart; height: number }) {
  const data = normaliseData(chart.data);
  const xKey = chart.x_axis || 'date';
  const yKey = chart.y_axis || 'value';
  const gradId = `area-grad-${chart.id}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={CONTAINER_PADDING}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.25} />
            <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={tickFormatter}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={tickFormatter}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={CHART_COLORS[0]}
          strokeWidth={2.5}
          fill={`url(#${gradId})`}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 0 }}
          isAnimationActive
          animationDuration={700}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function PieRenderer({ chart, height, isDonut }: { chart: Chart; height: number; isDonut?: boolean }) {
  const raw = normaliseData(chart.data);
  const nameKey = chart.category_col || chart.x_axis || 'name';
  const valueKey = chart.y_axis || 'value';

  // Support {name, value} pairs or generic objects
  const data = raw.map((item: any) => ({
    name: item[nameKey] ?? item.name ?? item.label ?? 'Unknown',
    value: Number(item[valueKey] ?? item.value ?? item.count ?? 0),
  }));

  const outerRadius = Math.min(height / 2 - 24, 110);
  const innerRadius = isDonut ? Math.round(outerRadius * 0.55) : 0;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          dataKey="value"
          nameKey="name"
          paddingAngle={isDonut ? 3 : 1}
          isAnimationActive
          animationDuration={700}
          animationEasing="ease-out"
        >
          {data.map((_: any, index: number) => (
            <Cell
              key={`cell-${index}`}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
              stroke="white"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ScatterRenderer({ chart, height }: { chart: Chart; height: number }) {
  const data = normaliseData(chart.data);
  const xKey = chart.x_axis || 'x';
  const yKey = chart.y_axis || 'y';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={CONTAINER_PADDING}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey={xKey}
          type="number"
          name={xKey}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={tickFormatter}
          axisLine={false}
          tickLine={false}
          label={{ value: xKey, position: 'insideBottom', offset: -4, fontSize: 11, fill: '#94a3b8' }}
        />
        <YAxis
          dataKey={yKey}
          type="number"
          name={yKey}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={tickFormatter}
          axisLine={false}
          tickLine={false}
          width={56}
          label={{ value: yKey, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94a3b8' }}
        />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={<CustomTooltip />}
        />
        <Scatter
          data={data}
          fill={CHART_COLORS[4]}
          fillOpacity={0.75}
          isAnimationActive
          animationDuration={600}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function HistogramRenderer({ chart, height }: { chart: Chart; height: number }) {
  // histogram data may come as {bins, counts} or already normalised array
  let data: any[];
  if (chart.data && !Array.isArray(chart.data) && chart.data.bins && chart.data.counts) {
    const bins: number[] = chart.data.bins;
    const counts: number[] = chart.data.counts;
    data = counts.map((count: number, i: number) => ({
      bin: bins[i] !== undefined && bins[i + 1] !== undefined
        ? `${formatNumber(bins[i])}–${formatNumber(bins[i + 1])}`
        : formatNumber(bins[i]),
      count,
    }));
  } else {
    data = normaliseData(chart.data).map((d: any) => ({
      bin: d.name ?? d.bin ?? d.label ?? '',
      count: d.count ?? d.value ?? 0,
    }));
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={CONTAINER_PADDING} barCategoryGap="4%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="bin"
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickFormatter={tickFormatter}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={tickFormatter}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
        <Bar
          dataKey="count"
          fill={CHART_COLORS[2]}
          radius={[2, 2, 0, 0]}
          isAnimationActive
          animationDuration={600}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Data Table renderer
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

function DataTableRenderer({ chart }: { chart: Chart }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const raw = chart.data;
  const rows: any[] = Array.isArray(raw) ? raw : normaliseData(raw);
  const columns: string[] = rows.length > 0 ? Object.keys(rows[0]) : [];

  const filtered = query.trim()
    ? rows.filter((row) =>
        columns.some((col) =>
          String(row[col] ?? '').toLowerCase().includes(query.toLowerCase())
        )
      )
    : rows;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safeePage * PAGE_SIZE, (safeePage + 1) * PAGE_SIZE);

  // Reset to first page on query change
  useEffect(() => { setPage(0); }, [query]);

  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400
                     placeholder:text-slate-400 bg-white"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-400 text-sm">
                  No results match your search.
                </td>
              </tr>
            ) : (
              pageRows.map((row, ri) => (
                <tr
                  key={ri}
                  className={cn(
                    'border-b border-slate-100 last:border-0 transition-colors',
                    ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/60',
                    'hover:bg-blue-50/50'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-3 py-2 text-slate-700 max-w-[200px] truncate"
                      title={String(row[col] ?? '')}
                    >
                      {String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {filtered.length === 0
            ? 'No results'
            : `${safeePage * PAGE_SIZE + 1}–${Math.min((safeePage + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length} rows`}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safeePage === 0}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-medium">
            {safeePage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safeePage >= totalPages - 1}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty / Error states
// ---------------------------------------------------------------------------

function EmptyChart({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
      <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-sm">{message || 'No data to display'}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

const ChartRenderer: React.FC<ChartRendererProps> = ({
  chart,
  height = 320,
  filters: _filters,
  datasetId: _datasetId,
}) => {
  const hasData =
    chart.data !== null &&
    chart.data !== undefined &&
    (Array.isArray(chart.data) ? chart.data.length > 0 : Object.keys(chart.data).length > 0);

  if (!hasData) {
    return <EmptyChart />;
  }

  if (chart.type === 'data_table') {
    return <DataTableRenderer chart={chart} />;
  }

  const chartHeight = chart.type === 'data_table' ? undefined : height;

  const render = () => {
    switch (chart.type) {
      case 'bar':
        return <BarRenderer chart={chart} height={chartHeight!} />;
      case 'horizontal_bar':
        return <HorizontalBarRenderer chart={chart} height={chartHeight!} />;
      case 'line':
        return <LineRenderer chart={chart} height={chartHeight!} />;
      case 'area':
        return <AreaRenderer chart={chart} height={chartHeight!} />;
      case 'pie':
        return <PieRenderer chart={chart} height={chartHeight!} />;
      case 'donut':
        return <PieRenderer chart={chart} height={chartHeight!} isDonut />;
      case 'scatter':
        return <ScatterRenderer chart={chart} height={chartHeight!} />;
      case 'histogram':
        return <HistogramRenderer chart={chart} height={chartHeight!} />;
      default:
        return <EmptyChart message={`Unknown chart type: ${(chart as any).type}`} />;
    }
  };

  return <>{render()}</>;
};

export default ChartRenderer;
