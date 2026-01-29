interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string;
  height?: string;
  lines?: number;
}

export function LoadingSkeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines = 1,
}: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%]';
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-xl',
  };

  const style = {
    width: width || (variant === 'circular' ? '48px' : '100%'),
    height: height || (variant === 'circular' ? '48px' : variant === 'text' ? '16px' : '100px'),
  };

  if (lines > 1) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses.text}`}
            style={{ width: i === lines - 1 ? '75%' : '100%', height: '16px' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <LoadingSkeleton variant="text" width="200px" height="32px" />
        <LoadingSkeleton variant="rectangular" width="120px" height="40px" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <LoadingSkeleton variant="text" width="60%" height="14px" className="mb-3" />
            <LoadingSkeleton variant="text" width="40%" height="32px" />
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <LoadingSkeleton variant="text" width="150px" height="20px" className="mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <LoadingSkeleton variant="circular" width="40px" height="40px" />
                <div className="flex-1">
                  <LoadingSkeleton variant="text" width="70%" height="14px" className="mb-2" />
                  <LoadingSkeleton variant="text" width="40%" height="12px" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <LoadingSkeleton variant="text" width="150px" height="20px" className="mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <LoadingSkeleton key={i} variant="rectangular" width="100%" height="48px" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CardSkeletonProps {
  hasHeader?: boolean;
  hasImage?: boolean;
  lines?: number;
}

export function CardSkeleton({ hasHeader = true, hasImage = false, lines = 3 }: CardSkeletonProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      {hasImage && (
        <LoadingSkeleton variant="rectangular" width="100%" height="160px" className="mb-4" />
      )}
      {hasHeader && (
        <div className="flex items-center gap-3 mb-4">
          <LoadingSkeleton variant="circular" width="40px" height="40px" />
          <div className="flex-1">
            <LoadingSkeleton variant="text" width="60%" height="16px" className="mb-1" />
            <LoadingSkeleton variant="text" width="40%" height="12px" />
          </div>
        </div>
      )}
      <LoadingSkeleton lines={lines} />
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <LoadingSkeleton
              key={i}
              variant="text"
              width={i === 0 ? '30%' : '20%'}
              height="14px"
            />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="flex gap-4 items-center">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <LoadingSkeleton
                  key={colIndex}
                  variant="text"
                  width={colIndex === 0 ? '30%' : '20%'}
                  height="14px"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
