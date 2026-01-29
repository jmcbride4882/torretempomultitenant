# Architectural Decisions - Torre Tempo Completion

## Decision Log

### Decision 1: Parallel Execution Strategy
**Date**: 2026-01-29  
**Context**: 8 remaining tasks, some independent  
**Decision**: Execute in 3 phases:
1. Feature enhancements (parallel)
2. Verifications (parallel)
3. Final report (sequential)

**Rationale**: Maximize throughput while respecting dependencies

---

### Decision 2: Open Shifts Implementation Approach
**Date**: 2026-01-29  
**Context**: Need self-accept functionality for unassigned shifts  
**Decision**: Use existing Schedule model with `assignedUserId: null`

**Rationale**: 
- No schema changes required
- Leverages existing drag-and-drop infrastructure
- Simple API: PATCH /schedules/:id with { assignedUserId }

---

### Decision 3: Compliance Badges Visual Design
**Date**: 2026-01-29  
**Context**: Need real-time compliance warnings on rota  
**Decision**: Call ComplianceService for each shift, display icon badges

**Rationale**:
- Reuses existing validation logic
- Visual feedback prevents scheduling violations
- Color-coded: Red (blocking), Amber (warning), Green (compliant)

---

## Decisions will be appended as tasks progress
