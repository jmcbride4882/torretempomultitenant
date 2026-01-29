export type ComplianceSeverity = 'BLOCKING' | 'WARNING';

export interface ComplianceCheckResult {
  isCompliant: boolean;
  violations: ComplianceViolation[];
  warnings: ComplianceWarning[];
  metadata?: Record<string, unknown>;
}

export interface ComplianceViolation {
  code: string;
  message: string;
  severity: ComplianceSeverity;
  details?: Record<string, unknown>;
}

export interface ComplianceWarning {
  code: string;
  message: string;
  threshold: number;
  current: number;
}
