import { type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ActionConfig {
  label:    string;
  onClick:  () => void;
  icon?:    LucideIcon;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  icon:         LucideIcon;
  title:        string;
  description?: string;
  action?:      ActionConfig;
  secondaryAction?: ActionConfig;
  /** Override the icon wrapper color. Defaults to blue. */
  iconColor?:   'blue' | 'purple' | 'emerald' | 'amber' | 'slate';
  className?:   string;
}

const ICON_COLOR_MAP: Record<NonNullable<EmptyStateProps['iconColor']>, { wrapper: string; icon: string }> = {
  blue:    { wrapper: 'bg-blue-50',    icon: 'text-blue-500'    },
  purple:  { wrapper: 'bg-purple-50',  icon: 'text-purple-500'  },
  emerald: { wrapper: 'bg-emerald-50', icon: 'text-emerald-500' },
  amber:   { wrapper: 'bg-amber-50',   icon: 'text-amber-500'   },
  slate:   { wrapper: 'bg-slate-100',  icon: 'text-slate-400'   },
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  iconColor = 'blue',
  className,
}: EmptyStateProps) {
  const colors = ICON_COLOR_MAP[iconColor];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-14',
        className
      )}
    >
      {/* Icon circle */}
      <div
        className={cn(
          'flex items-center justify-center w-20 h-20 rounded-2xl mb-5',
          colors.wrapper
        )}
      >
        <Icon className={cn('w-9 h-9', colors.icon)} strokeWidth={1.5} />
      </div>

      {/* Text */}
      <h3 className="text-lg font-semibold text-slate-800 mb-2 leading-tight">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {action && <ActionButton config={action} variant="primary" />}
          {secondaryAction && <ActionButton config={secondaryAction} variant="secondary" />}
        </div>
      )}
    </div>
  );
}

/* ── Internal action button ── */
function ActionButton({ config, variant }: { config: ActionConfig; variant: 'primary' | 'secondary' }) {
  const resolvedVariant = config.variant ?? variant;
  const Icon = config.icon;

  return (
    <button
      onClick={config.onClick}
      className={cn(
        'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
        resolvedVariant === 'primary'
          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 active:scale-95'
          : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-95'
      )}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />}
      {config.label}
    </button>
  );
}
