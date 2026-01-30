
## 2026-01-29: Report Enhancement Architecture Decisions

### Decision 1: Separate Break and Overtime Data in Reports
**Context**: Reports need to show both summary data and detailed breakdowns for breaks and overtime.

**Decision**: Create dedicated sections/worksheets for breaks and overtime in addition to summary data in time entries.

**Rationale**:
- Compliance requires detailed audit trail of breaks (Spanish labor law Article 34.4)
- Overtime tracking needs transparency for both employee and employer
- Separating data improves readability and allows for detailed filtering

**Alternatives Considered**:
- Inline all data in single table: Rejected due to complexity and poor readability
- Summary only: Rejected due to insufficient detail for compliance audits

### Decision 2: Annual Overtime Balance in Monthly Reports
**Context**: Spanish labor law limits ordinary overtime to 80h/year, requires tracking.

**Decision**: Include annual compliance summary in every monthly report showing YTD usage.

**Rationale**:
- Proactive compliance management prevents violations
- Employees need visibility into their overtime balance
- Early warnings (60%, 75% thresholds) prevent exceeding legal limits
- Force majeure overtime tracked separately as it's exempt from limit

**Alternatives Considered**:
- Only show monthly overtime: Rejected due to lack of annual context
- Separate annual report: Rejected as it requires manual cross-referencing

### Decision 3: Calculate Actual Break Duration from BreakEntry Records
**Context**: TimeEntry has `breakMinutes` field, but BreakEntry records have precise start/end times.

**Decision**: Calculate break duration from BreakEntry.startedAt/endedAt for reports.

**Rationale**:
- BreakEntry records provide audit trail with precise timestamps
- Allows detection of discrepancies between recorded and calculated breaks
- Supports compliance verification with detailed break logs
- Future-proofs for break compliance rules (e.g., mandatory 15min after 6h)

**Trade-offs**:
- Slightly more complex calculation
- Performance impact minimal (breaks are pre-loaded with time entries)

### Decision 4: Multi-Worksheet XLSX Structure
**Context**: XLSX export needs to include diverse data types (time, breaks, overtime, compliance).

**Decision**: Create 4 separate worksheets: Time Entries, Breaks, Overtime, Compliance Summary.

**Rationale**:
- Improves data organization and navigation
- Allows filtering/sorting within each category
- Supports diverse use cases (payroll, compliance audit, employee review)
- Standard practice in enterprise reporting

**Implementation**:
- Sheet 1: Time Entries (standard clocking data)
- Sheet 2: Breaks (detailed break audit trail)
- Sheet 3: Overtime (approval and compensation tracking)
- Sheet 4: Compliance Summary (annual limits and warnings)

### Decision 5: Color-Coded Compliance Warnings in PDF
**Context**: Overtime limit violations carry legal penalties, need visual prominence.

**Decision**: Use color coding in PDF reports for overtime warnings:
- Orange for >60% (approaching limit)
- Red for >75% (exceeding recommended limit)

**Rationale**:
- Visual warnings more effective than text alone
- Aligns with traffic light pattern (yellow/red for caution/danger)
- Ensures compliance issues are immediately visible during report review

**Limitations**:
- PDFKit doesn't support bold text via option, color is primary indicator
- Warning emoji (⚠️) provides backup visual cue if colors don't render

