# Torre Tempo - Functionality Priority Fix Plan

**Created:** 2026-01-30  
**Priority:** CRITICAL  
**Focus:** Get core features working, fix mobile usability

---

## User Feedback

**Issues Reported:**
1. Dashboards too small for mobile
2. "Lots of things not working"
3. Need functionality over polish

---

## Immediate Action Plan

### Phase 1: Identify Broken Features (5 min)
- [ ] Test clock in/out functionality
- [ ] Test schedule viewing
- [ ] Test report generation
- [ ] Test approvals workflow
- [ ] Test user management
- [ ] Test location QR codes
- [ ] Document all broken features

### Phase 2: Fix Critical Functionality (1-2 hours)
**Priority Order:**
1. Clock in/out (most important - core feature)
2. Schedule viewing (daily need)
3. Reports generation (compliance requirement)
4. Approvals (manager workflow)
5. User management (admin need)

### Phase 3: Fix Mobile Usability (30 min)
- [ ] Increase dashboard font sizes for mobile
- [ ] Fix button sizing (44px minimum touch targets)
- [ ] Fix navigation usability
- [ ] Test on 375px viewport

---

## Feature Testing Checklist

### Clock In/Out
- [ ] Can employees clock in?
- [ ] Can employees clock out?
- [ ] Does it show current status?
- [ ] Does break tracking work?
- [ ] Does location validation work?

### Scheduling
- [ ] Can users view their schedule?
- [ ] Can managers create schedules?
- [ ] Does calendar view work?
- [ ] Can users see upcoming shifts?

### Reports
- [ ] Can managers generate monthly reports?
- [ ] Do PDFs download correctly?
- [ ] Does report data show correctly?
- [ ] Can reports be signed?

### Approvals
- [ ] Can employees request edits?
- [ ] Can managers approve/reject?
- [ ] Does approval queue show?
- [ ] Do notifications work?

### User Management
- [ ] Can admins add users?
- [ ] Can admins edit user roles?
- [ ] Can admins deactivate users?
- [ ] Does user list load?

---

## Mobile Fixes Needed

### Dashboard Issues
- Text too small (increase from text-sm to text-base)
- Buttons too small (increase from px-4 py-2 to px-6 py-4)
- Cards cramped (increase padding)

### Navigation Issues
- Bottom nav might be hidden
- Sidebar might not work on mobile
- Hamburger menu might be broken

---

## Next Steps

**WAITING FOR USER INPUT:**
Which specific features aren't working? Please test and report:
1. What did you try to do?
2. What happened?
3. What error message (if any)?

This will help prioritize the fixes.
