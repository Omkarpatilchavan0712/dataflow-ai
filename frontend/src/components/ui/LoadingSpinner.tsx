import { cn } from '../../lib/utils';

type SpinnerVariant = 'spinner' | 'dots' | 'bars' | 'fullscreen';
type SpinnerSize    = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  variant?: SpinnerVariant;
  size?:    SpinnerSize;
  message?: string;
  className?: string;
}

/* ── Size maps ── */
const RING_SIZE: Record<SpinnerSize, string> = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-[3px]',
  lg: 'w-12 h-12 border-4',
};

const DOT_SIZE: Record<SpinnerSize, string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2.5 h-2.5',
  lg: 'w-3.5 h-3.5',
};

const BAR_SIZE: Record<SpinnerSize, string> = {
  sm: 'w-1 h-5',
  md: 'w-1.5 h-8',
  lg: 'w-2 h-12',
};

const TEXT_SIZE: Record<SpinnerSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

/* ── Spinner (ring) ── */
function SpinnerRing({ size = 'md', message, className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'rounded-full border-blue-100 border-t-blue-600 animate-spin',
          RING_SIZE[size]
        )}
      />
      {message && (
        <p className={cn('text-slate-500 font-medium', TEXT_SIZE[size])}>{message}</p>
      )}
    </div>
  );
}

/* ── Dots ── */
function SpinnerDots({ size = 'md', message, className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn('rounded-full bg-blue-600', DOT_SIZE[size])}
            style={{
              animation: 'dotBounce 0.8s ease-in-out infinite',
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>
      {message && (
        <p className={cn('text-slate-500 font-medium', TEXT_SIZE[size])}>{message}</p>
      )}

      {/* Inline keyframes — avoids needing a global CSS file */}
      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40%            { transform: translateY(-40%); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ── Bars ── */
function SpinnerBars({ size = 'md', message, className }: LoadingSpinnerProps) {
  const heights = ['60%', '100%', '75%', '100%', '60%'];
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className={cn('flex items-end gap-1', BAR_SIZE[size].split(' ')[1] /* use height for container */)}>
        {heights.map((h, i) => (
          <span
            key={i}
            className={cn('rounded-sm bg-blue-600', BAR_SIZE[size])}
            style={{
              height: h,
              animation: 'barPulse 0.9s ease-in-out infinite',
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </div>
      {message && (
        <p className={cn('text-slate-500 font-medium', TEXT_SIZE[size])}>{message}</p>
      )}

      <style>{`
        @keyframes barPulse {
          0%, 100% { opacity: 0.4; transform: scaleY(0.6); }
          50%       { opacity: 1;   transform: scaleY(1);   }
        }
      `}</style>
    </div>
  );
}

/* ── Fullscreen overlay ── */
function SpinnerFullscreen({ size = 'lg', message }: LoadingSpinnerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5 px-8 py-10 bg-white rounded-2xl shadow-2xl shadow-slate-200 border border-slate-100 max-w-xs w-full text-center">
        {/* Animated logo mark */}
        <div className="relative">
          <div
            className={cn(
              'rounded-full border-blue-100 border-t-blue-600 animate-spin',
              size === 'lg' ? 'w-14 h-14 border-4' : RING_SIZE[size]
            )}
          />
          {/* Inner dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
          </div>
        </div>

        <div>
          <p className="text-slate-800 font-semibold text-base leading-tight">
            {message || 'Loading…'}
          </p>
          <p className="text-slate-400 text-xs mt-1">Please wait a moment</p>
        </div>
      </div>
    </div>
  );
}

/* ── Public export ── */
export default function LoadingSpinner({
  variant = 'spinner',
  size    = 'md',
  message,
  className,
}: LoadingSpinnerProps) {
  if (variant === 'fullscreen') {
    return <SpinnerFullscreen size={size} message={message} />;
  }
  if (variant === 'dots') {
    return <SpinnerDots size={size} message={message} className={className} />;
  }
  if (variant === 'bars') {
    return <SpinnerBars size={size} message={message} className={className} />;
  }
  return <SpinnerRing size={size} message={message} className={className} />;
}
