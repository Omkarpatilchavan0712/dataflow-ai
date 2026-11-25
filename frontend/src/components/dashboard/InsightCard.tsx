import React from 'react';
import { motion } from 'framer-motion';
import {
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Database,
  GitBranch,
  BarChart2,
  Lightbulb,
  Activity,
} from 'lucide-react';
import { cn, formatNumber } from '../../lib/utils';
import type { Insight } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InsightCardProps {
  insight: Insight;
  index?: number;
}

// ---------------------------------------------------------------------------
// Config maps
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG = {
  info: {
    icon: Info,
    containerClass: 'bg-blue-50 border-blue-200',
    iconClass: 'text-blue-500',
    iconBgClass: 'bg-blue-100',
    badgeClass: 'bg-blue-100 text-blue-700',
    titleClass: 'text-blue-900',
    textClass: 'text-blue-700',
    metricClass: 'text-blue-600 bg-blue-100',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-amber-50 border-amber-200',
    iconClass: 'text-amber-500',
    iconBgClass: 'bg-amber-100',
    badgeClass: 'bg-amber-100 text-amber-700',
    titleClass: 'text-amber-900',
    textClass: 'text-amber-700',
    metricClass: 'text-amber-600 bg-amber-100',
  },
  success: {
    icon: CheckCircle2,
    containerClass: 'bg-emerald-50 border-emerald-200',
    iconClass: 'text-emerald-500',
    iconBgClass: 'bg-emerald-100',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    titleClass: 'text-emerald-900',
    textClass: 'text-emerald-700',
    metricClass: 'text-emerald-600 bg-emerald-100',
  },
  danger: {
    icon: XCircle,
    containerClass: 'bg-red-50 border-red-200',
    iconClass: 'text-red-500',
    iconBgClass: 'bg-red-100',
    badgeClass: 'bg-red-100 text-red-700',
    titleClass: 'text-red-900',
    textClass: 'text-red-700',
    metricClass: 'text-red-600 bg-red-100',
  },
} as const;

// Map insight type strings to representative icons
const TYPE_ICONS: Record<string, React.ElementType> = {
  trend: TrendingUp,
  quality: Database,
  correlation: GitBranch,
  distribution: BarChart2,
  anomaly: Activity,
  suggestion: Lightbulb,
  default: Info,
};

function getTypeIcon(type: string): React.ElementType {
  const key = type?.toLowerCase() ?? '';
  for (const [k, v] of Object.entries(TYPE_ICONS)) {
    if (key.includes(k)) return v;
  }
  return TYPE_ICONS.default;
}

/** Capitalise the first letter and replace underscores with spaces. */
function humaniseType(type: string): string {
  if (!type) return '';
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format the metric value: if numeric render it prettily, otherwise show as-is. */
function formatMetric(metric: number | string | undefined): string | null {
  if (metric === undefined || metric === null) return null;
  if (typeof metric === 'number') return formatNumber(metric);
  const asNum = Number(metric);
  if (!isNaN(asNum)) return formatNumber(asNum);
  return String(metric);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const InsightCard: React.FC<InsightCardProps> = ({ insight, index = 0 }) => {
  const severity = insight.severity ?? 'info';
  const config = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.info;
  const SeverityIcon = config.icon;
  const TypeIcon = getTypeIcon(insight.type);
  const metric = formatMetric(insight.metric);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: 'easeOut' }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={cn(
        'relative rounded-xl border p-4 flex gap-3 cursor-default',
        'transition-shadow duration-200 hover:shadow-md',
        config.containerClass
      )}
    >
      {/* Severity icon */}
      <div
        className={cn(
          'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
          config.iconBgClass
        )}
      >
        <SeverityIcon className={cn('w-5 h-5', config.iconClass)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Header row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
              config.badgeClass
            )}
          >
            <TypeIcon className="w-3 h-3 flex-shrink-0" />
            {humaniseType(insight.type)}
          </span>

          {/* Metric pill – shown beside the badge when present */}
          {metric && (
            <span
              className={cn(
                'ml-auto inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums',
                config.metricClass
              )}
            >
              {metric}
            </span>
          )}
        </div>

        {/* Title */}
        <p className={cn('text-sm font-semibold leading-snug', config.titleClass)}>
          {insight.title}
        </p>

        {/* Description */}
        <p className={cn('text-sm leading-relaxed', config.textClass)}>
          {insight.description}
        </p>
      </div>
    </motion.div>
  );
};

export default InsightCard;
