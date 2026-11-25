import React, { useState, useEffect } from 'react';
import { FileText, Download, Database, BarChart3, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { dashboardsApi, datasetsApi, getErrorMessage } from '../lib/api';
import { formatRelativeTime } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function ReportsPage() {
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [dRes, dsRes] = await Promise.allSettled([dashboardsApi.list(), datasetsApi.list()]);
        if (dRes.status === 'fulfilled') setDashboards(dRes.value.data);
        if (dsRes.status === 'fulfilled') setDatasets(dsRes.value.data.filter((d: any) => d.status === 'ready'));
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const handleExportPDF = async (dashboardId: number, name: string) => {
    setExporting(dashboardId);
    try {
      const url = dashboardsApi.exportPdf(dashboardId);
      const authData = JSON.parse(localStorage.getItem('dataflow-auth') || '{}');
      const token = authData?.state?.token;

      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${name}.pdf`;
      link.click();
      toast.success('PDF report downloaded!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText size={22} className="text-brand-600" />
          Reports & Exports
        </h1>
        <p className="text-sm text-slate-500">Export dashboards as PDF reports or download datasets</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : (
        <>
          {/* PDF Reports */}
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-3">PDF Dashboard Reports</h2>
            {dashboards.length === 0 ? (
              <div className="card p-6 text-center text-slate-400">No dashboards available</div>
            ) : (
              <div className="space-y-3">
                {dashboards.map((d) => (
                  <div key={d.id} className="card p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{d.name}</p>
                      <p className="text-xs text-slate-400">{d.dataset_name} · {d.chart_count} charts · Updated {formatRelativeTime(d.updated_at)}</p>
                    </div>
                    <button
                      onClick={() => handleExportPDF(d.id, d.name)}
                      disabled={exporting === d.id}
                      className="btn-primary text-sm shrink-0"
                    >
                      {exporting === d.id ? <LoadingSpinner size="sm" /> : <Download size={14} />}
                      Export PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dataset Downloads */}
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-3">Dataset Downloads</h2>
            {datasets.length === 0 ? (
              <div className="card p-6 text-center text-slate-400">No ready datasets available</div>
            ) : (
              <div className="space-y-3">
                {datasets.map((d) => (
                  <div key={d.id} className="card p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <Database size={18} className="text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{d.name}</p>
                      <p className="text-xs text-slate-400">{d.row_count?.toLocaleString()} rows · {d.column_count} cols</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a href={datasetsApi.exportCsv(d.id)} download className="btn-secondary text-sm">
                        <Download size={13} /> CSV
                      </a>
                      <a href={datasetsApi.exportExcel(d.id)} download className="btn-secondary text-sm">
                        <Download size={13} /> Excel
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
