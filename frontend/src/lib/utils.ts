import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number | undefined | null, format: 'number' | 'currency' | 'percent' = 'number'): string {
  if (value === null || value === undefined) return 'N/A';
  
  const num = Number(value);
  if (isNaN(num)) return String(value);

  if (format === 'currency') {
    if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
    if (Math.abs(num) >= 1_000) return `$${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    return `$${num.toFixed(2)}`;
  }

  if (format === 'percent') {
    return `${num.toFixed(1)}%`;
  }

  // number
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (Math.abs(num) >= 1_000) return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (num === Math.floor(num)) return num.toLocaleString('en-US');
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  } catch {
    return dateStr;
  }
}

export function getFileTypeColor(fileType: string): string {
  const colors: Record<string, string> = {
    csv: 'text-emerald-600 bg-emerald-50',
    xlsx: 'text-green-600 bg-green-50',
    xls: 'text-green-600 bg-green-50',
    json: 'text-yellow-600 bg-yellow-50',
    xml: 'text-orange-600 bg-orange-50',
    parquet: 'text-purple-600 bg-purple-50',
    zip: 'text-blue-600 bg-blue-50',
    sql: 'text-indigo-600 bg-indigo-50',
    txt: 'text-slate-600 bg-slate-50',
    html: 'text-red-600 bg-red-50',
  };
  return colors[fileType?.toLowerCase()] || 'text-slate-600 bg-slate-50';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ready: 'text-emerald-700 bg-emerald-50',
    processing: 'text-blue-700 bg-blue-50',
    error: 'text-red-700 bg-red-50',
  };
  return colors[status] || 'text-slate-600 bg-slate-100';
}

export const CHART_COLORS = [
  '#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#F97316', '#14B8A6', '#EC4899', '#84CC16',
  '#6366F1', '#78716C', '#0EA5E9', '#D946EF', '#22C55E',
];

export function truncate(str: string, length: number): string {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

export function downloadBlob(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadFile(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
