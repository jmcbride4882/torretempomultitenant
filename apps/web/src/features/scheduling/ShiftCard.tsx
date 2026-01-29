import { useTranslation } from 'react-i18next';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMins: number;
}

interface ComplianceViolation {
  code: string;
  message: string;
  severity: 'BLOCKING' | 'WARNING';
  details?: Record<string, unknown>;
}

interface ComplianceWarning {
  code: string;
  message: string;
  threshold: number;
  current: number;
}

export interface ComplianceCheckResult {
  isCompliant: boolean;
  violations: ComplianceViolation[];
  warnings: ComplianceWarning[];
  metadata?: Record<string, unknown>;
}

export type ComplianceStatus = 'loading' | 'compliant' | 'warning' | 'blocking' | 'unchecked';

interface ShiftCardProps {
  shift: Shift;
  isPublished: boolean;
  isDragging?: boolean;
  complianceResult?: ComplianceCheckResult | null;
  complianceLoading?: boolean;
  /** Whether this is an open/unassigned shift */
  isOpenShift?: boolean;
  /** Show accept button (for employees viewing open shifts) */
  showAcceptButton?: boolean;
  /** Callback when accept button is clicked */
  onAccept?: () => void;
  /** Whether the accept action is in progress */
  isAccepting?: boolean;
}

function getComplianceStatus(
  result: ComplianceCheckResult | null | undefined,
  loading?: boolean
): ComplianceStatus {
  if (loading) return 'loading';
  if (!result) return 'unchecked';
  if (result.violations.some((v) => v.severity === 'BLOCKING')) return 'blocking';
  if (result.warnings.length > 0 || result.violations.some((v) => v.severity === 'WARNING')) return 'warning';
  return 'compliant';
}

function getComplianceBadgeStyles(status: ComplianceStatus): string {
  switch (status) {
    case 'blocking':
      return 'bg-red-500 text-white';
    case 'warning':
      return 'bg-amber-500 text-white';
    case 'compliant':
      return 'bg-green-500 text-white';
    case 'loading':
      return 'bg-slate-300 text-slate-600 animate-pulse';
    case 'unchecked':
    default:
      return 'bg-slate-300 text-slate-600';
  }
}

function getComplianceBadgeIcon(status: ComplianceStatus): string {
  switch (status) {
    case 'blocking':
      return '🚫';
    case 'warning':
      return '⚠️';
    case 'compliant':
      return '✓';
    case 'loading':
      return '…';
    case 'unchecked':
    default:
      return '?';
  }
}

function buildComplianceTooltip(
  result: ComplianceCheckResult | null | undefined,
  status: ComplianceStatus,
  t: (key: string) => string
): string {
  if (status === 'loading') return t('compliance.checking');
  if (status === 'unchecked') return t('compliance.notChecked');
  if (status === 'compliant') return t('compliance.compliant');

  if (!result) return '';

  const messages: string[] = [];

  // Add blocking violations
  result.violations
    .filter((v) => v.severity === 'BLOCKING')
    .forEach((v) => messages.push(`🚫 ${v.message}`));

  // Add warnings
  result.warnings.forEach((w) => messages.push(`⚠️ ${w.message}`));

  // Add warning-level violations
  result.violations
    .filter((v) => v.severity === 'WARNING')
    .forEach((v) => messages.push(`⚠️ ${v.message}`));

  return messages.join('\n');
}

export function ShiftCard({
  shift,
  isPublished,
  isDragging,
  complianceResult,
  complianceLoading,
  isOpenShift,
  showAcceptButton,
  onAccept,
  isAccepting,
}: ShiftCardProps) {
  const { t } = useTranslation();
  const complianceStatus = getComplianceStatus(complianceResult, complianceLoading);
  const badgeStyles = getComplianceBadgeStyles(complianceStatus);
  const badgeIcon = getComplianceBadgeIcon(complianceStatus);
  const tooltipText = buildComplianceTooltip(complianceResult, complianceStatus, t);

  // Determine card styling based on whether it's open/unassigned
  const getCardStyles = () => {
    if (isOpenShift) {
      return 'bg-emerald-50 border-emerald-300 text-emerald-900';
    }
    if (isPublished) {
      return 'bg-blue-50 border-blue-300 text-blue-900';
    }
    return 'bg-amber-50 border-amber-300 text-amber-900';
  };

  return (
    <div
      className={`
        relative px-3 py-2 rounded-lg border-2 select-none transition-all
        ${getCardStyles()}
        ${isDragging ? 'shadow-xl scale-105 rotate-2' : 'shadow-sm hover:shadow-md'}
        ${showAcceptButton ? 'cursor-default' : 'cursor-move'}
      `}
    >
      {/* Compliance badge (top-right corner) - hide for open shifts */}
      {!isOpenShift && (
        <div
          className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${badgeStyles}`}
          title={tooltipText}
        >
          {badgeIcon}
        </div>
      )}

      {/* Open shift badge */}
      {isOpenShift && (
        <div className="absolute -top-1 -right-1 px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-sm">
          {t('scheduling.open')}
        </div>
      )}

      <div className="font-semibold text-sm truncate pr-6">{shift.name}</div>
      <div className="text-xs opacity-80">
        {shift.startTime} - {shift.endTime}
      </div>
      {shift.breakMins > 0 && (
        <div className="text-xs opacity-60 mt-1">
          {t('scheduling.breakMinutes')}: {shift.breakMins}min
        </div>
      )}
      {!isPublished && !isOpenShift && (
        <div className="text-xs font-medium mt-1 opacity-75">{t('scheduling.draft').toUpperCase()}</div>
      )}

      {/* Accept button for open shifts */}
      {showAcceptButton && onAccept && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAccept();
          }}
          disabled={isAccepting}
          className="mt-2 w-full py-2 px-3 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 min-h-[36px]"
        >
          {isAccepting ? (
            <span className="animate-pulse">{t('common.loading')}</span>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t('scheduling.acceptShift')}
            </>
          )}
        </button>
      )}
    </div>
  );
}
