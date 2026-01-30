# Torre Tempo - UI/UX Comprehensive Redesign Plan

**Created:** 2026-01-29  
**Status:** Implementation Ready  
**Priority:** CRITICAL  
**Estimated Effort:** 1 week intensive

---

## 🔍 BACKEND vs UI AUDIT

### Backend Features Available (99 endpoints)

#### ✅ Has UI
- Time Tracking: clock-in/out, current, entries (ClockingPage)
- Breaks: start/end, view (ClockingPage)
- Overtime: balance, history, pending (OvertimePage)
- Scheduling: my-schedule (MySchedulePage, SchedulingPage)
- Reports: generate, download, sign (ReportsPage, MyReportsPage)
- Approvals: edit-requests (ApprovalsPage)
- Users: list, manage (UsersPage)
- Locations: list, manage (LocationsPage)
- Tenants: current, manage (TenantSettingsPage, TenantManagementPage)
- Dashboards: employee, manager, admin (4 dashboards)

#### ❌ NO UI (CRITICAL GAPS)
1. **Compliance Checking** - `/api/compliance/check` - NO UI
2. **Audit Logs** - `/api/approvals/audit` - Viewer exists but not accessible
3. **Data Retention** - `/api/approvals/retention/check` - NO UI
4. **QR Code Generation** - `/api/locations/:id/generate-qr` - NO UI
5. **Geofence Validation** - `/api/locations/validate-geofence` - NO UI
6. **Health Metrics** - `/api/health/metrics` - NO UI
7. **Team Stats** - `/api/time-tracking/all` - NO UI (manager needs this)
8. **Scheduled vs Actual** - `/api/scheduling/scheduled-vs-actual` - NO UI
9. **Open Shifts** - `/api/scheduling/open-shifts` - NO UI
10. **Shift Publishing** - `/api/scheduling/schedules/:id/publish` - NO UI
11. **Global Admin Stats** - `/api/global-admin/stats` - Dashboard incomplete

### UI Usability Issues

#### Navigation Problems
1. **No persistent navigation menu** - Users must remember URLs
2. **No breadcrumbs** - Hard to know where you are
3. **No quick actions bar** - Common actions buried in pages
4. **Mobile navigation incomplete** - BottomNav only shows 4 items
5. **No search** - Can't search employees, locations, reports

#### Dashboard Problems
1. **Employee Dashboard:** Missing quick overtime view, break status
2. **Manager Dashboard:** No real-time team activity, missing team timeline
3. **Admin Dashboard:** Mock data, no drill-downs, missing system health
4. **All Dashboards:** No quick actions, no keyboard shortcuts, no filters

#### Page-Specific Problems
1. **ClockingPage:** Clock-in/out not prominent enough, break button hidden
2. **OvertimePage:** No bulk actions, no filters by date/status/type
3. **SchedulingPage:** Basic calendar, no drag-drop, no conflict warnings
4. **ReportsPage:** No preview, no bulk download, no sharing
5. **ApprovalsPage:** No bulk approve/reject, no filters, no sorting
6. **UsersPage:** No bulk operations, no role filtering, no export
7. **LocationsPage:** No QR code display, no geofence map

#### Mobile Experience Problems
1. **Touch targets too small** - Buttons <44px
2. **No gesture support** - Can't swipe between pages
3. **No offline indicators** - User doesn't know if offline
4. **Forms not optimized** - Keyboards don't match input types
5. **Tables not responsive** - Horizontal scroll nightmare

#### Information Architecture Problems
1. **Flat structure** - Everything at same level
2. **No logical grouping** - Features scattered
3. **No user flows** - Steps not connected
4. **Inconsistent terminology** - "Shift" vs "Schedule" vs "Roster"
5. **No help/onboarding** - New users lost

---

## 🎨 BEST PRACTICES RESEARCH

### Workforce Management UI Patterns

#### 1. Dashboard-Centric Design
- **Hero Action:** Biggest button for most common action
- **Status at a Glance:** Current state immediately visible
- **Quick Access Cards:** 6-8 common tasks as cards
- **Activity Feed:** Recent actions/changes
- **Metric Cards:** Key numbers with trends

#### 2. Progressive Disclosure
- **Level 1:** Overview/summary
- **Level 2:** Detailed view (click card)
- **Level 3:** Full details (modal/new page)
- **Example:** Dashboard card → Full report page → Individual entry

#### 3. Action-Oriented UI
- **Primary Action:** Blue, prominent (Clock In, Approve, Generate)
- **Secondary Actions:** Gray, smaller (View, Edit, Cancel)
- **Destructive Actions:** Red, with confirmation (Delete, Reject)
- **Bulk Actions:** Checkbox + action bar (Delete 5 selected)

#### 4. Mobile-First Patterns
- **Bottom Navigation:** 5 most important sections
- **FAB (Floating Action Button):** Primary action always accessible
- **Pull-to-Refresh:** Natural gesture for updates
- **Swipe Actions:** Swipe row for quick actions
- **Collapsible Sections:** Accordion for long content

#### 5. Real-Time Updates
- **WebSocket/Polling:** Live clock-in status
- **Toast Notifications:** "John clocked in"
- **Badge Counts:** Pending approvals (5)
- **Status Indicators:** Green dot = clocked in
- **Auto-refresh:** Dashboard updates every 30s

#### 6. Data Visualization
- **Charts:** Line (hours over time), Bar (team comparison), Pie (shift distribution)
- **Heatmaps:** Overtime usage, Schedule density
- **Timelines:** Employee activity throughout day
- **Gauges:** Compliance score, Overtime limit
- **Calendar Views:** Shift schedule, Availability

---

## 🏗️ NEW INFORMATION ARCHITECTURE

### Navigation Structure

```
Torre Tempo
├── 🏠 Dashboard (Home)
│   ├── My Shift Today
│   ├── Quick Actions (Clock In/Out, Start Break, Request Time Off)
│   ├── Upcoming Schedule (Next 7 days)
│   ├── Overtime Balance
│   ├── Pending Approvals (if manager)
│   └── Team Status (if manager)
│
├── ⏰ Time & Attendance
│   ├── Clock In/Out (primary page)
│   ├── My Time Entries
│   ├── Breaks
│   └── Compliance Status
│
├── 📅 Schedule
│   ├── My Schedule (employee)
│   ├── Team Schedule (manager)
│   ├── Open Shifts
│   ├── Swap Requests
│   └── Availability
│
├── 📊 Overtime
│   ├── My Overtime
│   ├── Balance & History
│   ├── Pending Approvals (manager)
│   └── Annual Summary
│
├── 📄 Reports
│   ├── My Reports (employee)
│   ├── Generate Report (manager)
│   ├── Monthly Reports
│   └── Compliance Reports
│
├── ✅ Approvals (manager/admin)
│   ├── Pending Edit Requests
│   ├── Overtime Approvals
│   ├── Swap Requests
│   └── Audit Log
│
├── ⚙️ Admin (admin only)
│   ├── Users & Permissions
│   ├── Locations & QR Codes
│   ├── Shifts & Templates
│   ├── Compliance Rules
│   ├── System Health
│   └── Data Retention
│
└── 👤 Profile
    ├── My Details
    ├── Settings
    ├── Language
    └── Logout
```

### Mobile Bottom Navigation (5 items)

1. **🏠 Home** - Dashboard
2. **⏰ Clock** - Clock in/out page
3. **📅 Schedule** - My schedule
4. **📊 More** - Everything else (drawer)
5. **👤 Profile** - User menu

---

## 🎯 COMPREHENSIVE IMPLEMENTATION PLAN

### Phase 1: Navigation & Layout (Days 1-2)

#### 1.1 Top Navigation Bar
```tsx
<TopNav>
  <Logo />
  <Search placeholder="Search employees, reports, shifts..." />
  <QuickActions>
    <ClockInButton /> // If employee
    <ApprovalsBadge count={5} /> // If manager
    <Notifications />
    <UserMenu />
  </QuickActions>
</TopNav>
```

**Features:**
- Global search (employees, locations, reports, time entries)
- Breadcrumbs below nav (Home > Schedule > Week of Jan 29)
- Quick clock-in button (always visible for employees)
- Notification bell with badge count
- User avatar with dropdown menu

#### 1.2 Sidebar Navigation (Desktop)
```tsx
<Sidebar collapsed={false}>
  <NavGroup title="Main">
    <NavItem icon={HomeIcon} label="Dashboard" to="/app/dashboard" />
    <NavItem icon={ClockIcon} label="Time & Attendance" to="/app/clocking" />
    <NavItem icon={CalendarIcon} label="Schedule" to="/app/schedule" />
    <NavItem icon={ChartIcon} label="Overtime" to="/app/overtime" />
    <NavItem icon={DocumentIcon} label="Reports" to="/app/reports" />
  </NavGroup>
  
  {isManager && (
    <NavGroup title="Management">
      <NavItem icon={CheckIcon} label="Approvals" to="/app/approvals" badge={5} />
      <NavItem icon={UsersIcon} label="Team" to="/app/team" />
    </NavGroup>
  )}
  
  {isAdmin && (
    <NavGroup title="Administration">
      <NavItem icon={SettingsIcon} label="Admin" to="/app/admin" />
      <NavItem icon={ShieldIcon} label="Compliance" to="/app/compliance" />
    </NavGroup>
  )}
</Sidebar>
```

**Features:**
- Collapsible sidebar (hamburger icon)
- Active page highlighted
- Badge counts on items (Approvals: 5)
- Keyboard shortcuts (hint on hover)
- Dark mode toggle at bottom

#### 1.3 Mobile Bottom Nav
```tsx
<BottomNav>
  <NavItem icon={HomeIcon} label="Home" to="/app/dashboard" />
  <NavItem icon={ClockIcon} label="Clock" to="/app/clocking" />
  <NavItem icon={CalendarIcon} label="Schedule" to="/app/schedule" />
  <NavItem icon={MenuIcon} label="More" onClick={openDrawer} />
  <NavItem icon={UserIcon} label="Profile" to="/app/profile" />
</BottomNav>
```

---

### Phase 2: Enhanced Dashboards (Days 2-3)

#### 2.1 Employee Dashboard Redesign
```tsx
<EmployeeDashboard>
  {/* Hero Section - Current Status */}
  <StatusCard>
    {isClockedIn ? (
      <>
        <StatusBadge variant="success">Clocked In</StatusBadge>
        <Timer start={clockInTime} />
        <BreakStatus breaksTaken={2} breakTime="45 mins" />
        <PrimaryButton size="xl" onClick={clockOut}>
          Clock Out
        </PrimaryButton>
      </>
    ) : (
      <>
        <StatusBadge variant="default">Not Clocked In</StatusBadge>
        <NextShift shift="Tomorrow 8:00 AM" />
        <PrimaryButton size="xl" onClick={clockIn}>
          Clock In
        </PrimaryButton>
      </>
    )}
  </StatusCard>

  {/* Quick Stats Row */}
  <StatsGrid cols={3}>
    <StatCard
      icon={ClockIcon}
      label="This Week"
      value="38.5 hrs"
      trend="+2.5 hrs vs last week"
    />
    <StatCard
      icon={ChartIcon}
      label="Overtime Balance"
      value="12/80 hrs"
      progress={15}
      warning={overtimeUsage > 60}
    />
    <StatCard
      icon={CalendarIcon}
      label="Next Shift"
      value="Tomorrow"
      subtitle="8:00 AM - 4:00 PM"
    />
  </StatsGrid>

  {/* Upcoming Schedule */}
  <Card title="My Schedule (Next 7 Days)">
    <ScheduleTimeline shifts={upcomingShifts} />
  </Card>

  {/* Pending Items */}
  {pendingRequests.length > 0 && (
    <Card title="Pending Requests">
      <RequestList items={pendingRequests} />
    </Card>
  )}

  {/* Recent Activity */}
  <Card title="Recent Time Entries">
    <TimeEntryList entries={recentEntries} limit={5} />
    <ViewAllButton to="/app/time-entries" />
  </Card>
</EmployeeDashboard>
```

#### 2.2 Manager Dashboard Redesign
```tsx
<ManagerDashboard>
  {/* Team Status Hero */}
  <TeamStatusCard>
    <LiveCounter>
      <UsersIcon />
      <span>{clockedInCount} / {totalTeam} Clocked In</span>
      <LiveIndicator />
    </LiveCounter>
    <QuickActions>
      <Button onClick={viewTeam}>View Team</Button>
      <Button onClick={generateReport}>Generate Report</Button>
      <Button onClick={manageSchedule}>Manage Schedule</Button>
    </QuickActions>
  </TeamStatusCard>

  {/* Key Metrics */}
  <MetricsGrid cols={4}>
    <MetricCard
      label="Total Hours (This Week)"
      value={teamHours}
      target={expectedHours}
      status={teamHours < expectedHours ? 'warning' : 'success'}
    />
    <MetricCard
      label="Pending Approvals"
      value={pendingCount}
      onClick={goToApprovals}
      alert={pendingCount > 10}
    />
    <MetricCard
      label="Overtime This Week"
      value={overtimeHours}
      budget={budgetedOvertime}
      status={overtimeHours > budgetedOvertime ? 'danger' : 'success'}
    />
    <MetricCard
      label="Compliance Score"
      value={complianceScore}
      unit="%"
      gauge
    />
  </MetricsGrid>

  {/* Who's Working Now */}
  <Card title="Team Activity (Live)">
    <TeamTimeline>
      {clockedInMembers.map(member => (
        <TimelineItem
          key={member.id}
          avatar={member.avatar}
          name={member.name}
          clockInTime={member.clockInTime}
          location={member.location}
          status={member.onBreak ? 'break' : 'working'}
        />
      ))}
    </TeamTimeline>
  </Card>

  {/* Approvals Queue */}
  <Card title="Pending Approvals" action={<ViewAllButton />}>
    <ApprovalQueue items={pendingApprovals} limit={5} />
  </Card>

  {/* Schedule Preview */}
  <Card title="This Week's Schedule">
    <WeeklySchedulePreview />
  </Card>
</ManagerDashboard>
```

---

### Phase 3: Missing Features - UI Implementation (Days 3-5)

#### 3.1 Compliance Dashboard (NEW)
**File:** `apps/web/src/features/compliance/ComplianceDashboard.tsx`

```tsx
<ComplianceDashboard>
  <PageHeader
    title="Compliance Monitoring"
    subtitle="Spanish Labor Law (RD-Ley 8/2019)"
  />

  {/* Overall Compliance Score */}
  <ComplianceScoreCard score={complianceScore} />

  {/* Compliance Checks */}
  <ChecksGrid>
    <CheckCard
      title="12-Hour Rest"
      status="pass"
      violations={0}
      lastCheck="2 mins ago"
    />
    <CheckCard
      title="Weekly 36-Hour Rest"
      status="pass"
      violations={0}
      lastCheck="1 hour ago"
    />
    <CheckCard
      title="Break After 6 Hours"
      status="warning"
      violations={3}
      details="3 employees worked >6h without break"
    />
    <CheckCard
      title="80-Hour Overtime Limit"
      status="alert"
      violations={2}
      details="2 employees exceeded 75% of limit"
    />
    <CheckCard
      title="Daily 9-Hour Limit"
      status="pass"
      violations={0}
      lastCheck="5 mins ago"
    />
    <CheckCard
      title="Consecutive Days (Max 6)"
      status="pass"
      violations={0}
      lastCheck="1 hour ago"
    />
  </ChecksGrid>

  {/* Violations Timeline */}
  <Card title="Recent Violations">
    <ViolationsList violations={recentViolations} />
  </Card>

  {/* Employee Compliance Scores */}
  <Card title="Employee Compliance (This Month)">
    <EmployeeComplianceTable employees={employeesWithScores} />
  </Card>

  {/* Actions */}
  <ButtonGroup>
    <Button onClick={runFullCheck}>Run Full Compliance Check</Button>
    <Button onClick={downloadReport} variant="secondary">
      Download Compliance Report
    </Button>
  </ButtonGroup>
</ComplianceDashboard>
```

#### 3.2 QR Code Management (NEW)
**File:** `apps/web/src/features/locations/QRCodePage.tsx`

```tsx
<QRCodePage>
  <PageHeader title="Location QR Codes" />

  <LocationsGrid>
    {locations.map(location => (
      <LocationCard key={location.id}>
        <LocationInfo name={location.name} address={location.address} />
        
        {/* QR Code Display */}
        <QRCodeDisplay qrCode={location.qrCode} size={256} />
        
        {/* Actions */}
        <ButtonGroup>
          <Button onClick={() => downloadQR(location.id)}>
            Download QR
          </Button>
          <Button onClick={() => regenerateQR(location.id)}>
            Regenerate
          </Button>
          <Button onClick={() => printQR(location.id)}>
            Print
          </Button>
        </ButtonGroup>

        {/* Geofence Map */}
        <GeofenceMap
          center={[location.lat, location.lng]}
          radius={location.geofenceRadius}
        />
        
        {/* Settings */}
        <GeofenceSettings
          radius={location.geofenceRadius}
          onUpdate={updateGeofence}
        />
      </LocationCard>
    ))}
  </LocationsGrid>
</QRCodePage>
```

#### 3.3 Audit Log Viewer (Enhanced)
**File:** `apps/web/src/features/audit/AuditLogPage.tsx`

```tsx
<AuditLogPage>
  <PageHeader title="Audit Log" />

  {/* Filters */}
  <FilterBar>
    <DateRangePicker value={dateRange} onChange={setDateRange} />
    <Select
      label="Action Type"
      options={actionTypes}
      value={selectedAction}
      onChange={setSelectedAction}
    />
    <Select
      label="Entity"
      options={['TimeEntry', 'User', 'Location', 'Schedule', 'Report']}
      value={selectedEntity}
      onChange={setSelectedEntity}
    />
    <Input
      type="search"
      placeholder="Search by user, email, or description..."
      value={searchQuery}
      onChange={setSearchQuery}
    />
    <Button onClick={clearFilters}>Clear</Button>
  </FilterBar>

  {/* Timeline View */}
  <AuditTimeline>
    {auditLogs.map(log => (
      <TimelineItem key={log.id}>
        <Avatar user={log.actor} />
        <AuditDetails
          action={log.action}
          entity={log.entity}
          timestamp={log.createdAt}
          changes={log.changes}
          ipAddress={log.ipAddress}
        />
      </TimelineItem>
    ))}
  </AuditTimeline>

  {/* Pagination */}
  <Pagination
    page={page}
    total={totalPages}
    onChange={setPage}
  />

  {/* Export */}
  <Button onClick={exportAuditLog} variant="secondary">
    Export to CSV
  </Button>
</AuditLogPage>
```

#### 3.4 Data Retention Dashboard (NEW)
**File:** `apps/web/src/features/admin/DataRetentionPage.tsx`

```tsx
<DataRetentionPage>
  <PageHeader title="Data Retention & Archival" />

  {/* Retention Summary */}
  <RetentionSummary>
    <StatCard
      label="Total Records"
      value={totalRecords}
      subtitle="Across all time"
    />
    <StatCard
      label="Records >5 Years Old"
      value={oldRecords}
      subtitle="Eligible for archival"
      warning
    />
    <StatCard
      label="Storage Used"
      value={storageUsed}
      unit="GB"
    />
    <StatCard
      label="Last Retention Check"
      value={lastCheck}
      subtitle="Run manually or automated"
    />
  </RetentionSummary>

  {/* Breakdown by Entity */}
  <Card title="Records by Type">
    <RetentionTable>
      <Row entity="Time Entries" total={timeEntryCount} old={oldTimeEntries} />
      <Row entity="Audit Logs" total={auditLogCount} old={oldAuditLogs} />
      <Row entity="Reports" total={reportCount} old={oldReports} action="Keep Forever" />
      <Row entity="Edit Requests" total={editRequestCount} old={oldEditRequests} />
    </RetentionTable>
  </Card>

  {/* Actions */}
  <ButtonGroup>
    <Button onClick={runRetentionCheck}>Run Retention Check</Button>
    <Button onClick={scheduleRetention} variant="secondary">
      Schedule Automated Check
    </Button>
    <Button onClick={exportOldData} variant="secondary">
      Export Old Data (Before Deletion)
    </Button>
  </ButtonGroup>

  {/* Policy Configuration */}
  <Card title="Retention Policies">
    <PolicyEditor
      policies={retentionPolicies}
      onChange={updatePolicies}
    />
  </Card>
</DataRetentionPage>
```

#### 3.5 System Health Dashboard (NEW)
**File:** `apps/web/src/features/admin/SystemHealthPage.tsx`

```tsx
<SystemHealthPage>
  <PageHeader title="System Health & Monitoring" />

  {/* Overall Status */}
  <HealthStatusCard status={systemHealth}>
    <StatusIndicator status={systemHealth} />
    <StatusText>
      {systemHealth === 'healthy' && 'All Systems Operational'}
      {systemHealth === 'degraded' && 'Some Issues Detected'}
      {systemHealth === 'critical' && 'Critical Issues - Immediate Action Required'}
    </StatusText>
  </HealthStatusCard>

  {/* Service Status */}
  <ServicesGrid>
    <ServiceCard
      name="API Server"
      status={apiStatus}
      uptime="99.9%"
      responseTime="12ms"
    />
    <ServiceCard
      name="Database"
      status={dbStatus}
      uptime="100%"
      connections={activeConnections}
    />
    <ServiceCard
      name="Redis Queue"
      status={redisStatus}
      uptime="99.8%"
      queueSize={queueSize}
    />
    <ServiceCard
      name="File Storage"
      status={storageStatus}
      used={storageUsed}
      total={storageTotal}
    />
  </ServicesGrid>

  {/* Metrics Charts */}
  <ChartsGrid>
    <ChartCard title="API Response Time (24h)">
      <LineChart data={responseTimeData} />
    </ChartCard>
    <ChartCard title="Database Query Time (24h)">
      <LineChart data={queryTimeData} />
    </ChartCard>
    <ChartCard title="Request Volume (24h)">
      <AreaChart data={requestVolumeData} />
    </ChartCard>
    <ChartCard title="Error Rate (24h)">
      <LineChart data={errorRateData} alert={errorRate > 1} />
    </ChartCard>
  </ChartsGrid>

  {/* Recent Errors */}
  <Card title="Recent Errors">
    <ErrorList errors={recentErrors} />
  </Card>

  {/* Actions */}
  <ButtonGroup>
    <Button onClick={refreshMetrics}>Refresh</Button>
    <Button onClick={downloadMetrics} variant="secondary">
      Download Metrics Report
    </Button>
  </ButtonGroup>
</SystemHealthPage>
```

#### 3.6 Scheduled vs Actual Comparison (NEW)
**File:** `apps/web/src/features/scheduling/ScheduledVsActualPage.tsx`

```tsx
<ScheduledVsActualPage>
  <PageHeader title="Scheduled vs Actual Hours" />

  {/* Week Selector */}
  <WeekPicker value={selectedWeek} onChange={setSelectedWeek} />

  {/* Summary Cards */}
  <SummaryGrid>
    <SummaryCard
      label="Scheduled Hours"
      value={scheduledHours}
      icon={CalendarIcon}
    />
    <SummaryCard
      label="Actual Hours"
      value={actualHours}
      icon={ClockIcon}
      status={variance > 10 ? 'warning' : 'success'}
    />
    <SummaryCard
      label="Variance"
      value={variance}
      unit="hrs"
      trend={variance > 0 ? 'up' : 'down'}
      status={Math.abs(variance) > 10 ? 'warning' : 'success'}
    />
    <SummaryCard
      label="Overtime"
      value={overtimeHours}
      unit="hrs"
      status={overtimeHours > budgetedOvertime ? 'danger' : 'success'}
    />
  </SummaryGrid>

  {/* Employee Comparison Table */}
  <Card title="Employee Breakdown">
    <ComparisonTable>
      {employees.map(emp => (
        <Row key={emp.id}>
          <Cell>{emp.name}</Cell>
          <Cell>{emp.scheduled} hrs</Cell>
          <Cell>{emp.actual} hrs</Cell>
          <Cell status={getVarianceStatus(emp.variance)}>
            {emp.variance > 0 ? '+' : ''}{emp.variance} hrs
          </Cell>
          <Cell>{emp.overtime} hrs</Cell>
          <Cell>
            <Button size="sm" onClick={() => viewDetails(emp.id)}>
              Details
            </Button>
          </Cell>
        </Row>
      ))}
    </ComparisonTable>
  </Card>

  {/* Daily Breakdown Chart */}
  <Card title="Daily Breakdown">
    <BarChart
      data={dailyData}
      series={[
        { name: 'Scheduled', color: '#3B82F6' },
        { name: 'Actual', color: '#10B981' }
      ]}
    />
  </Card>

  {/* Export */}
  <Button onClick={exportReport}>Export Report</Button>
</ScheduledVsActualPage>
```

---

### Phase 4: Bulk Operations & Advanced Features (Day 5)

#### 4.1 Bulk Approval Interface
**Enhancement to:** `apps/web/src/features/approvals/ApprovalsPage.tsx`

```tsx
{/* Add to existing ApprovalsPage */}
<BulkActions visible={selectedItems.length > 0}>
  <SelectionSummary>
    {selectedItems.length} items selected
  </SelectionSummary>
  <ButtonGroup>
    <Button onClick={bulkApprove} variant="success">
      Approve All ({selectedItems.length})
    </Button>
    <Button onClick={bulkReject} variant="danger">
      Reject All ({selectedItems.length})
    </Button>
    <Button onClick={clearSelection} variant="secondary">
      Clear Selection
    </Button>
  </ButtonGroup>
</BulkActions>

{/* Add checkboxes to table */}
<Table>
  <HeaderRow>
    <Checkbox
      checked={allSelected}
      onChange={toggleSelectAll}
    />
    <Header>Employee</Header>
    <Header>Type</Header>
    <Header>Date</Header>
    <Header>Actions</Header>
  </HeaderRow>
  {editRequests.map(request => (
    <Row key={request.id}>
      <Checkbox
        checked={selectedItems.includes(request.id)}
        onChange={() => toggleSelect(request.id)}
      />
      <Cell>{request.employee.name}</Cell>
      <Cell>{request.type}</Cell>
      <Cell>{request.date}</Cell>
      <Cell>
        {/* Individual actions */}
      </Cell>
    </Row>
  ))}
</Table>
```

#### 4.2 Advanced Filters
**Component:** `apps/web/src/components/AdvancedFilterBar.tsx`

```tsx
<AdvancedFilterBar>
  <FilterGroup label="Date Range">
    <DateRangePicker value={dateRange} onChange={setDateRange} />
  </FilterGroup>
  
  <FilterGroup label="Status">
    <MultiSelect
      options={[
        { value: 'PENDING', label: 'Pending' },
        { value: 'APPROVED', label: 'Approved' },
        { value: 'REJECTED', label: 'Rejected' }
      ]}
      value={selectedStatuses}
      onChange={setSelectedStatuses}
    />
  </FilterGroup>
  
  <FilterGroup label="Employee">
    <EmployeeSelect
      value={selectedEmployees}
      onChange={setSelectedEmployees}
      multiple
    />
  </FilterGroup>
  
  <FilterGroup label="Type">
    <Select
      options={requestTypes}
      value={selectedType}
      onChange={setSelectedType}
    />
  </FilterGroup>
  
  <FilterActions>
    <Button onClick={applyFilters}>Apply</Button>
    <Button onClick={clearFilters} variant="secondary">Clear</Button>
    <Button onClick={saveFilters} variant="secondary">Save View</Button>
  </FilterActions>
</AdvancedFilterBar>
```

---

### Phase 5: Mobile Optimizations (Day 6)

#### 5.1 Touch-Optimized Components
```scss
/* Minimum touch target size */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* Larger tap areas for mobile */
@media (max-width: 768px) {
  .button {
    padding: 12px 24px;
    font-size: 16px;
  }
  
  .table-row {
    min-height: 60px;
  }
  
  .nav-item {
    padding: 16px;
  }
}
```

#### 5.2 Swipe Gestures
**Component:** `apps/web/src/components/SwipeableRow.tsx`

```tsx
<SwipeableRow
  leftActions={[
    { icon: CheckIcon, label: 'Approve', color: 'green', onClick: approve },
    { icon: XIcon, label: 'Reject', color: 'red', onClick: reject }
  ]}
  rightActions={[
    { icon: TrashIcon, label: 'Delete', color: 'red', onClick: handleDelete }
  ]}
>
  {/* Row content */}
</SwipeableRow>
```

#### 5.3 Bottom Sheets (Mobile Modals)
**Component:** `apps/web/src/components/BottomSheet.tsx`

```tsx
<BottomSheet open={open} onClose={onClose}>
  <SheetHeader>
    <SheetTitle>{title}</SheetTitle>
    <CloseButton onClick={onClose} />
  </SheetHeader>
  <SheetContent>
    {children}
  </SheetContent>
  <SheetActions>
    <Button onClick={onConfirm} fullWidth>
      Confirm
    </Button>
  </SheetActions>
</BottomSheet>
```

#### 5.4 Pull-to-Refresh
```tsx
<PullToRefresh onRefresh={handleRefresh}>
  <PageContent>
    {/* Your content */}
  </PageContent>
</PullToRefresh>
```

---

### Phase 6: Real-Time Features (Day 7)

#### 6.1 Live Updates
**Hook:** `apps/web/src/hooks/useRealTimeUpdates.ts`

```typescript
export function useRealTimeUpdates(queryKey: string[]) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Poll every 30 seconds
    const interval = setInterval(() => {
      queryClient.invalidateQueries(queryKey);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [queryKey]);
}
```

#### 6.2 Live Status Indicators
```tsx
<LiveStatusIndicator>
  <StatusDot status={online ? 'online' : 'offline'} />
  <StatusText>{online ? 'Live' : 'Offline'}</StatusText>
  <LastUpdate>Updated {lastUpdate}</LastUpdate>
</LiveStatusIndicator>
```

#### 6.3 Toast Notifications
**Component:** `apps/web/src/components/Toast.tsx`

```tsx
<Toast
  type="success" // success, error, warning, info
  message="Employee clocked in"
  duration={3000}
  position="top-right"
/>
```

---

## 📱 MOBILE-FIRST RESPONSIVE BREAKPOINTS

```scss
$breakpoints: (
  'xs': 320px,   // Small phones
  'sm': 640px,   // Large phones
  'md': 768px,   // Tablets
  'lg': 1024px,  // Small laptops
  'xl': 1280px,  // Desktops
  '2xl': 1536px  // Large desktops
);

/* Mobile-first approach */
.component {
  /* Base styles for mobile */
  padding: 1rem;
  
  /* Tablet and up */
  @media (min-width: 768px) {
    padding: 2rem;
  }
  
  /* Desktop and up */
  @media (min-width: 1024px) {
    padding: 3rem;
  }
}
```

---

## 🎨 DESIGN SYSTEM

### Color Palette
```scss
$colors: (
  'primary': #3B82F6,      // Blue
  'success': #10B981,      // Green
  'warning': #F59E0B,      // Amber
  'danger': #EF4444,       // Red
  'info': #06B6D4,         // Cyan
  'gray': #6B7280,         // Neutral
  'dark': #1F2937,         // Dark gray
);
```

### Typography
```scss
$font-sizes: (
  'xs': 0.75rem,     // 12px
  'sm': 0.875rem,    // 14px
  'base': 1rem,      // 16px
  'lg': 1.125rem,    // 18px
  'xl': 1.25rem,     // 20px
  '2xl': 1.5rem,     // 24px
  '3xl': 1.875rem,   // 30px
  '4xl': 2.25rem,    // 36px
);
```

### Spacing
```scss
$spacing: (
  '1': 0.25rem,   // 4px
  '2': 0.5rem,    // 8px
  '3': 0.75rem,   // 12px
  '4': 1rem,      // 16px
  '6': 1.5rem,    // 24px
  '8': 2rem,      // 32px
  '12': 3rem,     // 48px
  '16': 4rem,     // 64px
);
```

---

## 🚀 IMPLEMENTATION CHECKLIST

### Day 1: Foundation
- [ ] Create new Layout component with TopNav + Sidebar
- [ ] Implement responsive navigation (desktop sidebar, mobile bottom nav)
- [ ] Add breadcrumbs
- [ ] Global search functionality
- [ ] Quick action buttons in header

### Day 2: Dashboards
- [ ] Redesign EmployeeDashboard with hero status card
- [ ] Redesign ManagerDashboard with live team status
- [ ] Redesign AdminDashboard with system health
- [ ] Add real-time updates to dashboards
- [ ] Add quick actions to all dashboards

### Day 3: Missing Features - Part 1
- [ ] Create ComplianceDashboard page
- [ ] Create QRCodePage with generation and display
- [ ] Enhance AuditLogPage with advanced filters
- [ ] Create DataRetentionPage

### Day 4: Missing Features - Part 2
- [ ] Create SystemHealthPage with metrics
- [ ] Create ScheduledVsActualPage
- [ ] Add open shifts functionality
- [ ] Add shift publishing UI

### Day 5: Bulk Operations
- [ ] Add bulk approval to ApprovalsPage
- [ ] Add advanced filters component
- [ ] Add bulk operations to UsersPage
- [ ] Add bulk operations to OvertimePage

### Day 6: Mobile Optimizations
- [ ] Increase touch targets to 44px minimum
- [ ] Implement swipe gestures for lists
- [ ] Create BottomSheet component
- [ ] Add pull-to-refresh
- [ ] Test on real mobile devices

### Day 7: Polish & Deploy
- [ ] Add toast notifications
- [ ] Add loading skeletons everywhere
- [ ] Add empty states
- [ ] Add error boundaries
- [ ] Add keyboard shortcuts
- [ ] Test all features
- [ ] Deploy to production

---

## 📊 SUCCESS METRICS

**Before (Current State):**
- Pages: 15
- Backend features with UI: ~60%
- Mobile usability: 50%
- User satisfaction: Unknown

**After (Target State):**
- Pages: 25+ (10 new pages)
- Backend features with UI: 100%
- Mobile usability: 95%
- User satisfaction: >85%

**Key Improvements:**
1. All backend features accessible via UI
2. Intuitive navigation (no memorizing URLs)
3. Mobile-first experience
4. Real-time updates
5. Bulk operations
6. Advanced filtering
7. Better visual hierarchy
8. Consistent design system

---

## 🎯 NEXT STEPS

1. **Review & Approve** this plan
2. **Start Day 1** implementation immediately
3. **User testing** after Day 3
4. **Iterate** based on feedback
5. **Deploy** after Day 7

This comprehensive redesign will transform Torre Tempo from a functional but clunky system into a world-class workforce management platform that rivals Deputy, Gusto, and BambooHR.

