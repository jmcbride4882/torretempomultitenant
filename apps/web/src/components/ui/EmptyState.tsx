import { ReactNode } from 'react';

type EmptyStateVariant = 'default' | 'compact' | 'card';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: EmptyStateVariant;
  className?: string;
}

// Default icons for common empty states
export const EmptyIcons = {
  clock: (
    <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  calendar: (
    <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  document: (
    <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  users: (
    <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  location: (
    <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  checkmark: (
    <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  inbox: (
    <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
  chart: (
    <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

export function EmptyState({
  icon = EmptyIcons.inbox,
  title,
  description,
  action,
  variant = 'default',
  className = '',
}: EmptyStateProps) {
  const variantStyles = {
    default: 'py-16',
    compact: 'py-8',
    card: 'py-12 bg-white rounded-2xl shadow-sm border border-slate-100',
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center ${variantStyles[variant]} ${className}`}>
      <div className="mb-4 p-4 bg-slate-50 rounded-full">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-slate-500 text-sm max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all duration-150 shadow-sm hover:shadow"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {action.label}
        </button>
      )}
    </div>
  );
}

// Pre-configured empty states for common use cases
interface PresetEmptyStateProps {
  onAction?: () => void;
  actionLabel?: string;
}

export function EmptyTimeEntries({ onAction, actionLabel }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={EmptyIcons.clock}
      title="No time entries yet"
      description="Your time entries will appear here once you start clocking in"
      action={onAction ? { label: actionLabel || 'Clock In', onClick: onAction } : undefined}
    />
  );
}

export function EmptyShifts({ onAction, actionLabel }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={EmptyIcons.calendar}
      title="No upcoming shifts"
      description="Check back later for your scheduled shifts"
      action={onAction ? { label: actionLabel || 'View Schedule', onClick: onAction } : undefined}
    />
  );
}

export function EmptyApprovals() {
  return (
    <EmptyState
      icon={EmptyIcons.checkmark}
      title="All caught up!"
      description="No pending approvals to review"
    />
  );
}

export function EmptyReports({ onAction, actionLabel }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={EmptyIcons.document}
      title="No reports yet"
      description="Reports will be generated at the end of each month"
      action={onAction ? { label: actionLabel || 'Generate Report', onClick: onAction } : undefined}
    />
  );
}

export function EmptyLocations({ onAction, actionLabel }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={EmptyIcons.location}
      title="No locations set up"
      description="Create your first location to start tracking time"
      action={onAction ? { label: actionLabel || 'Add Location', onClick: onAction } : undefined}
    />
  );
}

export function EmptyTeam() {
  return (
    <EmptyState
      icon={EmptyIcons.users}
      title="No team members"
      description="Team members will appear here once added"
    />
  );
}
