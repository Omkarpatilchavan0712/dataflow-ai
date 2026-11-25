import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Users,
  ShoppingCart,
  BarChart2,
  Activity,
  Target,
  Percent,
  Hash,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import { cn, formatNumber } from '../../lib/utils';
import type { KPI } from '../../types';

/* ── Icon resolver ── */
const ICON_MAP: Record<string, LucideIcon> = {
  dollar:    DollarSign,
  currency:  DollarSign,
  revenue:   DollarSign,
  users:     Users,
  customers: Users,
  orders:    ShoppingCart,
  sales:     ShoppingCart,
  bar:       BarChart2,
  activity:  Activity,
  target:    Target,
  percent:   Percent,
  rate:      Percent,
  count:     Hash,
  total:     Layers,
};

function resolveIcon(kpi: KPI): LucideIcon {
  if (kpi.icon) {
    const key = kpi.icon.toLowerCase();
    for (const [pattern, Icon] of Object.entries(ICON_MAP)) {
      if (key.includes(pattern)) return Icon;
    }
  }
  // Fallback by format
  if (kpi.format === 'currency') return DollarSign;
  if (kpi.format === 'percent')  return Percent;
  return BarChart2;
}

/* ── Color palette cycling ── */
const COLOR_VARIANTS = [
  { wrapper: 'bg-blue-50',    icon: 'text-blue-600',    ring: 'ring-blue-100'    },
  { wrapper: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
  { wrapper: 'bg-violet-50',  icon: 'text-violet-600',  ring: 'ring-violet-100'  },
  { wrapper: 'bg-amber-50',   icon: 'text-amber-600',   ring: 'ring-amber-100'   },
  { wrapper: 'bg-cyan-50',    icon: 'text-cyan-600',    ring: 'ring-cyan-100'    },
  { wrapper: 'bg-pink-50',    icon: 'text-pink-600',    ring: 'ring-pink-100'    },
];

function getColorVariant(index: number) {
  return COLOR_VARIANTS[index % COLOR_VARIANTS.length];
}

/* ── Skeleton ── */
function KPICardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2.5 flex-1">
          <div className="h-3.5 w-24 rounded-full bg-slate-200" />
          <div className="h-7 w-32 rounded-full bg-slate-200" />
          <div className="h-3 w-20 rounded-full bg-slate-100" />
        </div>
        <div className="w-11 h-11 rounded-xl bg-slate-100 shrink-0" />
      </div>
    </div>
  );
}

/* ── Props ── */
interface KPICardProps {
  kpi:        KPI;
  colorIndex?: number;
  loading?:   boolean;
  onClick?:   () => void;
  className?: string;
}

export default function KPICard({
  kpi,
  colorIndex = 0,
  loading    = false,
  onClick,
  className,
}: KPICardProps) {
  if (loading) return <KPICardSkeleton />;

  const Icon   = resolveIcon(kpi);
  const colors = getColorVariant(colorIndex);

  /* Format value */
  const displayValue =
    typeof kpi.value === 'number'
      ? formatNumber(kpi.value, kpi.format)
      : String(kpi.value ?? '—');

  /* Change badge */
  const change = kpi.change;
  const hasChange = change !== null && change !== undefined;

  const changeIsPositive = hasChange && change > 0;
  const changeIsNegative = hasChange && change < 0;
  const changeIsNeutral  = hasChange && change === 0;

  const ChangeIcon = changeIsPositive
    ? TrendingUp
    : changeIsNegative
    ? TrendingDown
    : Minus;

  const changeBadgeClass = changeIsPositive
    ? 'bg-emerald-50 text-emerald-700'
    : changeIsNegative
    ? 'bg-red-50 text-red-600'
    : 'bg-slate-100 text-slate-500';

  const changeSign = changeIsPositive ? '+' : '';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      onClick={onClick}
      className={cn(
        'group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm',
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5',
        className
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        {/* Text block */}
        <div className="min-w-0 flex-1">
          {/* Title */}
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 truncate mb-2">
            {kpi.title}
          </p>

          {/* Value */}
          <p className="text-2xl font-bold text-slate-900 leading-tight tracking-tight truncate">
            {displayValue}
          </p>

          {/* Change badge or change label */}
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            {hasChange && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
                  changeBadgeClass
                )}
              >
                <ChangeIcon className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                {changeSign}{Math.abs(change).toFixed(1)}%
              </span>
            )}
            {kpi.change_label && (
              <span className="text-xs text-slate-400 leading-tight">
                {kpi.change_label}
              </span>
            )}
            {!hasChange && !kpi.change_label && (
              <span className="text-xs text-slate-300 italic">No comparison data</span>
            )}
          </div>
        </div>

        {/* Icon badge */}
        <div
          className={cn(
            'shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ring-1',
            colors.wrapper,
            colors.ring,
            'transition-transform duration-200 group-hover:scale-105'
          )}
        >
          <Icon className={cn('w-5 h-5', colors.icon)} strokeWidth={2} />
        </div>
      </div>

      {/* Subtle bottom accent line on hover */}
      {onClick && (
        <div
          className={cn(
            'absolute bottom-0 left-6 right-6 h-0.5 rounded-full opacity-0 transition-opacity duration-200',
            'group-hover:opacity-100',
            colorIndex % 2 === 0 ? 'bg-blue-400' : 'bg-emerald-400'
          )}
        />
      )}
    </div>
  );
}

/* Named re-export for convenience */
export { KPICardSkeleton };
