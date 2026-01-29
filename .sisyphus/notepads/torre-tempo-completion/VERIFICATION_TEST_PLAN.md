# Torre Tempo - Comprehensive Verification Test Plan

**Version**: 1.0  
**Date**: 2026-01-29  
**Production URL**: https://time.lsltgroup.es  
**Test Environment**: Production (multi-tenant isolated)

---

## Test Credentials

| Role | Email | Password | Tenant |
|------|-------|----------|--------|
| **GLOBAL_ADMIN** | info@lsltgroup.es | Summer15 | N/A (cross-tenant) |
| **ADMIN** | john.admin@lsltgroup.es | Summer15 | LSLT Group |
| **MANAGER** | (create via ADMIN) | Summer15 | LSLT Group |
| **EMPLOYEE** | john@lsltgroup.es | Summer15 | LSLT Group |

---

## 1. Location Management

### 1.1 Create Location (CRUD - Create)

**API Endpoint**: `POST /api/locations`  
**UI Page**: `/locations` (Admin only)  
**Required Role**: ADMIN

**Test Steps**:
1. Log in as ADMIN (john.admin@lsltgroup.es)
2. Navigate to `/locations`
3. Click "Add Location" button
4. Fill in form:
   - Name: "Test Office Madrid"
   - Address: "Calle Gran Vía 1, Madrid"
   - Latitude: 40.4168
   - Longitude: -3.7038
   - Radius: 100 meters
   - QR Enabled: Yes
   - Is Active: Yes
5. Submit form

**Expected Result**:
- Location created successfully
- Toast notification: "Location created"
- Location appears in list
- Database record created with correct tenantId

**Success Criteria**:
- ✅ Location visible in UI list
- ✅ API returns 201 Created
- ✅ Database query confirms record exists
- ✅ tenantId matches logged-in user's tenant

**API Request Example**:
```json
POST /api/locations
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Test Office Madrid",
  "address": "Calle Gran Vía 1, Madrid",
  "latitude": 40.4168,
  "longitude": -3.7038,
  "radiusMeters": 100,
  "qrEnabled": true,
  "isActive": true
}
```

**API Response Example**:
```json
{
  "id": "uuid-here",
  "tenantId": "tenant-uuid",
  "name": "Test Office Madrid",
  "address": "Calle Gran Vía 1, Madrid",
  "latitude": 40.4168,
  "longitude": -3.7038,
  "radiusMeters": 100,
  "qrEnabled": true,
  "isActive": true,
  "createdAt": "2026-01-29T10:00:00Z",
  "updatedAt": "2026-01-29T10:00:00Z"
}
```

---

### 1.2 List Locations (CRUD - Read)

**API Endpoint**: `GET /api/locations`  
**UI Page**: `/locations`  
**Required Role**: Any authenticated user

**Test Steps**:
1. Log in as EMPLOYEE (john@lsltgroup.es)
2. Navigate to `/locations`
3. Verify all locations for tenant are displayed

**Expected Result**:
- All active locations visible
- Each location shows: name, address, QR status, geofence status
- Only locations for current tenant displayed (multi-tenant isolation)

**Success Criteria**:
- ✅ All locations returned
- ✅ No locations from other tenants visible
- ✅ UI renders list correctly
- ✅ API returns 200 OK

---

### 1.3 Update Location (CRUD - Update)

**API Endpoint**: `PATCH /api/locations/:id`  
**UI Page**: `/locations` (Edit modal)  
**Required Role**: ADMIN

**Test Steps**:
1. Log in as ADMIN
2. Navigate to `/locations`
3. Click "Edit" on existing location
4. Change name to "Updated Office Name"
5. Change radius to 150 meters
6. Submit form

**Expected Result**:
- Location updated successfully
- Toast notification: "Location updated"
- Changes reflected in list immediately
- Database record updated

**Success Criteria**:
- ✅ UI shows updated values
- ✅ API returns 200 OK
- ✅ Database confirms changes
- ✅ updatedAt timestamp changed

---

### 1.4 Delete Location (CRUD - Delete)

**API Endpoint**: `DELETE /api/locations/:id`  
**UI Page**: `/locations`  
**Required Role**: ADMIN

**Test Steps**:
1. Log in as ADMIN
2. Navigate to `/locations`
3. Click "Delete" on a location
4. Confirm deletion in modal

**Expected Result**:
- Location soft-deleted (isActive = false)
- Toast notification: "Location deleted"
- Location removed from active list
- Database record still exists but isActive=false

**Success Criteria**:
- ✅ Location not visible in UI
- ✅ API returns 200 OK
- ✅ Database record exists with isActive=false
- ✅ Audit log created for deletion

---

### 1.5 QR Code Generation

**API Endpoint**: `POST /api/locations/:id/generate-qr`  
**UI Page**: `/locations` (QR Code modal)  
**Required Role**: ADMIN

**Test Steps**:
1. Log in as ADMIN
2. Navigate to `/locations`
3. Click "Generate QR" on a location
4. Verify QR code image displayed
5. Download QR code as PNG
6. Print QR code (optional)

**Expected Result**:
- QR code generated as base64 PNG data URL
- QR code displayed in modal
- QR code contains valid token
- Token stored in qr_tokens table

**Success Criteria**:
- ✅ QR code image renders correctly
- ✅ API returns base64 PNG data URL
- ✅ QRToken record created in database
- ✅ Token is unique and active
- ✅ expiresAt is null (never expires) or future date

**API Response Example**:
```json
{
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Database Verification**:
```sql
SELECT * FROM qr_tokens WHERE locationId = '<location-id>' ORDER BY createdAt DESC LIMIT 1;
-- Should show: token (uuid), isActive=true, expiresAt=null or future
```

---

### 1.6 QR Code Validation (Clock-In Flow)

**API Endpoint**: `POST /api/locations/validate-qr`  
**UI Page**: `/clock-in` (QR scanner)  
**Required Role**: Any authenticated user

**Test Steps**:
1. Log in as EMPLOYEE
2. Navigate to `/clock-in`
3. Click "Scan QR Code"
4. Scan QR code from location (use phone camera or upload image)
5. Verify location name displayed

**Expected Result**:
- QR token validated successfully
- Location name and ID returned
- User can proceed to clock in

**Success Criteria**:
- ✅ API returns valid=true
- ✅ Location details returned
- ✅ Invalid/expired tokens rejected
- ✅ Tokens from other tenants rejected

**API Request Example**:
```json
POST /api/locations/validate-qr
Content-Type: application/json

{
  "token": "uuid-from-qr-code"
}
```

**API Response Example**:
```json
{
  "valid": true,
  "location": {
    "id": "location-uuid",
    "name": "Test Office Madrid"
  }
}
```

**Negative Test Cases**:
- Invalid token → 404 Not Found
- Expired token → 400 Bad Request
- Token from different tenant → 404 Not Found

---

### 1.7 Geofence Validation

**API Endpoint**: `POST /api/locations/validate-geofence`  
**UI Page**: `/clock-in` (automatic geolocation check)  
**Required Role**: Any authenticated user

**Test Steps**:
1. Log in as EMPLOYEE
2. Navigate to `/clock-in`
3. Allow browser geolocation access
4. Select location "Test Office Madrid"
5. Verify geofence validation:
   - **Inside radius**: User at (40.4168, -3.7038) → valid=true
   - **Outside radius**: User at (40.5000, -3.8000) → valid=false

**Expected Result**:
- Geofence validated based on distance calculation
- User inside radius can clock in
- User outside radius sees error message

**Success Criteria**:
- ✅ Distance calculation accurate (Haversine formula)
- ✅ Inside radius → valid=true
- ✅ Outside radius → valid=false
- ✅ Error message clear: "You are not within the location geofence"

**API Request Example**:
```json
POST /api/locations/validate-geofence
Content-Type: application/json

{
  "locationId": "location-uuid",
  "latitude": 40.4168,
  "longitude": -3.7038
}
```

**API Response Example**:
```json
{
  "valid": true
}
```

---

## 2. User Management

### 2.1 Create User (CRUD - Create)

**API Endpoint**: `POST /api/users`  
**UI Page**: `/users` (Admin/Manager only)  
**Required Role**: ADMIN or MANAGER

**Test Steps**:
1. Log in as ADMIN
2. Navigate to `/users`
3. Click "Add User"
4. Fill in form:
   - Email: "test.employee@lsltgroup.es"
   - First Name: "Test"
   - Last Name: "Employee"
   - Employee Code: "EMP001"
   - Role: EMPLOYEE
   - Is Active: Yes
   - Password: "Summer15"
5. Submit form

**Expected Result**:
- User created successfully
- Toast notification: "User created"
- User appears in list
- Password hashed in database (bcrypt)
- Audit log created

**Success Criteria**:
- ✅ User visible in UI list
- ✅ API returns 201 Created
- ✅ Database record created with correct tenantId
- ✅ Password hashed (not plaintext)
- ✅ Email unique within tenant

**API Request Example**:
```json
POST /api/users
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "email": "test.employee@lsltgroup.es",
  "firstName": "Test",
  "lastName": "Employee",
  "employeeCode": "EMP001",
  "role": "EMPLOYEE",
  "isActive": true,
  "password": "Summer15"
}
```

**Negative Test Cases**:
- Duplicate email within tenant → 400 Bad Request
- Invalid email format → 400 Bad Request
- Weak password → 400 Bad Request
- MANAGER creating ADMIN → 403 Forbidden

---

### 2.2 List Users (CRUD - Read)

**API Endpoint**: `GET /api/users?page=1&pageSize=50`  
**UI Page**: `/users`  
**Required Role**: ADMIN or MANAGER

**Test Steps**:
1. Log in as ADMIN
2. Navigate to `/users`
3. Verify all users for tenant displayed
4. Test pagination (if >50 users)

**Expected Result**:
- All users for tenant visible
- Pagination works correctly
- Only users from current tenant shown

**Success Criteria**:
- ✅ All users returned
- ✅ No users from other tenants visible
- ✅ Pagination controls work
- ✅ API returns 200 OK

---

### 2.3 Update User (CRUD - Update)

**API Endpoint**: `PATCH /api/users/:id`  
**UI Page**: `/users` (Edit modal)  
**Required Role**: ADMIN or MANAGER

**Test Steps**:
1. Log in as ADMIN
2. Navigate to `/users`
3. Click "Edit" on existing user
4. Change first name to "Updated"
5. Change role to MANAGER
6. Submit form

**Expected Result**:
- User updated successfully
- Toast notification: "User updated"
- Changes reflected in list
- Audit log created

**Success Criteria**:
- ✅ UI shows updated values
- ✅ API returns 200 OK
- ✅ Database confirms changes
- ✅ Audit log records change

**Role Elevation Rules**:
- MANAGER can create/edit EMPLOYEE only
- ADMIN can create/edit EMPLOYEE, MANAGER, ADMIN
- GLOBAL_ADMIN can create/edit any role

---

### 2.4 Delete User (CRUD - Delete)

**API Endpoint**: `DELETE /api/users/:id`  
**UI Page**: `/users`  
**Required Role**: ADMIN

**Test Steps**:
1. Log in as ADMIN
2. Navigate to `/users`
3. Click "Delete" on a user
4. Confirm deletion

**Expected Result**:
- User soft-deleted (isActive = false)
- Toast notification: "User deleted"
- User removed from active list
- Database record still exists but isActive=false

**Success Criteria**:
- ✅ User not visible in UI
- ✅ API returns 200 OK
- ✅ Database record exists with isActive=false
- ✅ User cannot log in
- ✅ Audit log created

---

### 2.5 Get Current User Profile

**API Endpoint**: `GET /api/users/me`  
**UI Page**: `/profile`  
**Required Role**: Any authenticated user

**Test Steps**:
1. Log in as EMPLOYEE
2. Navigate to `/profile`
3. Verify profile details displayed

**Expected Result**:
- Current user's profile returned
- All fields visible: email, name, role, employeeCode

**Success Criteria**:
- ✅ Correct user data returned
- ✅ API returns 200 OK
- ✅ No sensitive data exposed (no passwordHash)

---

### 2.6 Change Password

**API Endpoint**: `PATCH /api/users/me/password`  
**UI Page**: `/profile` (Change Password section)  
**Required Role**: Any authenticated user

**Test Steps**:
1. Log in as EMPLOYEE
2. Navigate to `/profile`
3. Click "Change Password"
4. Enter:
   - Current Password: "Summer15"
   - New Password: "NewPassword123"
   - Confirm Password: "NewPassword123"
5. Submit form
6. Log out
7. Log in with new password

**Expected Result**:
- Password changed successfully
- Toast notification: "Password changed"
- User can log in with new password
- Old password no longer works

**Success Criteria**:
- ✅ Password updated in database (hashed)
- ✅ API returns 200 OK
- ✅ Login with new password succeeds
- ✅ Login with old password fails
- ✅ Audit log created

**Negative Test Cases**:
- Wrong current password → 401 Unauthorized
- Passwords don't match → 400 Bad Request
- Weak new password → 400 Bad Request

---

## 3. Approvals Workflow

### 3.1 Create Edit Request (Employee)

**API Endpoint**: `POST /api/approvals/edit-requests`  
**UI Page**: `/time-entries` (Edit button on entry)  
**Required Role**: Any authenticated user

**Test Steps**:
1. Log in as EMPLOYEE
2. Navigate to `/time-entries`
3. Find a time entry to edit
4. Click "Request Edit"
5. Fill in form:
   - Field to Edit: "clockOut"
   - Current Value: "2026-01-29T18:00:00Z"
   - New Value: "2026-01-29T19:00:00Z"
   - Reason: "Forgot to clock out, left at 7pm"
6. Submit request

**Expected Result**:
- Edit request created with status=PENDING
- Toast notification: "Edit request submitted"
- Request appears in "My Requests" list
- Manager notified (if notifications enabled)

**Success Criteria**:
- ✅ Edit request created in database
- ✅ API returns 201 Created
- ✅ Status is PENDING
- ✅ Original time entry unchanged
- ✅ Audit log created

**API Request Example**:
```json
POST /api/approvals/edit-requests
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "timeEntryId": "entry-uuid",
  "fieldName": "clockOut",
  "oldValue": "2026-01-29T18:00:00Z",
  "newValue": "2026-01-29T19:00:00Z",
  "reason": "Forgot to clock out, left at 7pm"
}
```

---

### 3.2 List Edit Requests (Employee View)

**API Endpoint**: `GET /api/approvals/edit-requests`  
**UI Page**: `/approvals/my-requests`  
**Required Role**: Any authenticated user

**Test Steps**:
1. Log in as EMPLOYEE
2. Navigate to `/approvals/my-requests`
3. Verify all own edit requests displayed
4. Filter by status: PENDING, APPROVED, REJECTED

**Expected Result**:
- All edit requests created by employee visible
- Status badges: PENDING (amber), APPROVED (green), REJECTED (red)
- Can filter by status

**Success Criteria**:
- ✅ Only own requests visible
- ✅ API returns 200 OK
- ✅ Filtering works correctly
- ✅ Pagination works (if >50 requests)

---

### 3.3 List Edit Requests (Manager View)

**API Endpoint**: `GET /api/approvals/edit-requests`  
**UI Page**: `/approvals/pending`  
**Required Role**: MANAGER or ADMIN

**Test Steps**:
1. Log in as MANAGER
2. Navigate to `/approvals/pending`
3. Verify all pending edit requests for tenant displayed
4. Filter by status: PENDING, APPROVED, REJECTED

**Expected Result**:
- All edit requests for tenant visible (not just own)
- Pending requests highlighted
- Can filter by status

**Success Criteria**:
- ✅ All tenant requests visible
- ✅ API returns 200 OK
- ✅ Filtering works correctly
- ✅ Pagination works

---

### 3.4 Approve Edit Request (Manager)

**API Endpoint**: `POST /api/approvals/edit-requests/:id/approve`  
**UI Page**: `/approvals/pending` (Approve button)  
**Required Role**: MANAGER or ADMIN

**Test Steps**:
1. Log in as MANAGER
2. Navigate to `/approvals/pending`
3. Find a PENDING edit request
4. Click "Approve"
5. Add optional note: "Approved - valid reason"
6. Confirm approval

**Expected Result**:
- Edit request status changed to APPROVED
- Original time entry updated with new value
- Time entry status changed to EDITED
- Toast notification: "Edit request approved"
- Employee notified (if notifications enabled)
- Audit log created

**Success Criteria**:
- ✅ Edit request status = APPROVED
- ✅ approvedById = manager's user ID
- ✅ approvedAt timestamp set
- ✅ Time entry updated with new value
- ✅ Time entry status = EDITED
- ✅ Audit log records approval and time entry change
- ✅ API returns 200 OK

**API Request Example**:
```json
POST /api/approvals/edit-requests/{id}/approve
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "approvalNote": "Approved - valid reason"
}
```

**Database Verification**:
```sql
-- Edit request updated
SELECT status, approvedById, approvedAt, approvalNote 
FROM edit_requests WHERE id = '<request-id>';
-- Should show: status=APPROVED, approvedById set, approvedAt set

-- Time entry updated
SELECT clockOut, status FROM time_entries WHERE id = '<entry-id>';
-- Should show: clockOut updated, status=EDITED

-- Audit logs created
SELECT action, entity, entityId FROM audit_logs 
WHERE tenantId = '<tenant-id>' 
ORDER BY createdAt DESC LIMIT 2;
-- Should show: APPROVE_EDIT_REQUEST, UPDATE_TIME_ENTRY
```

---

### 3.5 Reject Edit Request (Manager)

**API Endpoint**: `POST /api/approvals/edit-requests/:id/reject`  
**UI Page**: `/approvals/pending` (Reject button)  
**Required Role**: MANAGER or ADMIN

**Test Steps**:
1. Log in as MANAGER
2. Navigate to `/approvals/pending`
3. Find a PENDING edit request
4. Click "Reject"
5. Add required note: "Insufficient evidence"
6. Confirm rejection

**Expected Result**:
- Edit request status changed to REJECTED
- Original time entry unchanged
- Toast notification: "Edit request rejected"
- Employee notified (if notifications enabled)
- Audit log created

**Success Criteria**:
- ✅ Edit request status = REJECTED
- ✅ approvedById = manager's user ID
- ✅ approvedAt timestamp set
- ✅ Time entry unchanged
- ✅ Audit log records rejection
- ✅ API returns 200 OK

**API Request Example**:
```json
POST /api/approvals/edit-requests/{id}/reject
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "approvalNote": "Insufficient evidence"
}
```

---

### 3.6 View Audit Logs for Time Entry

**API Endpoint**: `GET /api/approvals/audit/entry/:entryId`  
**UI Page**: `/time-entries/:id/audit`  
**Required Role**: MANAGER or ADMIN

**Test Steps**:
1. Log in as MANAGER
2. Navigate to `/time-entries`
3. Click on a time entry
4. Click "View Audit Log"
5. Verify all changes displayed chronologically

**Expected Result**:
- All audit logs for time entry visible
- Shows: action, actor, timestamp, changes (JSON diff)
- Chronological order (newest first)

**Success Criteria**:
- ✅ All audit logs returned
- ✅ API returns 200 OK
- ✅ Changes JSON shows old/new values
- ✅ Actor email and role visible

**API Response Example**:
```json
{
  "data": [
    {
      "id": "audit-uuid",
      "action": "UPDATE_TIME_ENTRY",
      "entity": "TimeEntry",
      "entityId": "entry-uuid",
      "actorEmail": "manager@lsltgroup.es",
      "actorRole": "MANAGER",
      "changes": {
        "clockOut": {
          "old": "2026-01-29T18:00:00Z",
          "new": "2026-01-29T19:00:00Z"
        },
        "status": {
          "old": "ACTIVE",
          "new": "EDITED"
        }
      },
      "createdAt": "2026-01-29T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 50
}
```

---

## 4. Reports Generation

### 4.1 Generate Monthly Report (Manager/Admin)

**API Endpoint**: `POST /api/reports/generate`  
**UI Page**: `/reports` (Generate Report button)  
**Required Role**: MANAGER or ADMIN

**Test Steps**:
1. Log in as MANAGER
2. Navigate to `/reports`
3. Click "Generate Report"
4. Fill in form:
   - Report Type: MONTHLY_EMPLOYEE
   - User: Select employee
   - Period: "2026-01" (January 2026)
5. Submit form
6. Wait for report generation (may take 5-10 seconds)

**Expected Result**:
- Report generated successfully
- Toast notification: "Report generated"
- Report appears in list
- Database record created

**Success Criteria**:
- ✅ Report created in database
- ✅ API returns 201 Created
- ✅ Report type, period, tenantId correct
- ✅ fileUrl and fileHash populated (if file storage enabled)
- ✅ generatedAt timestamp set

**API Request Example**:
```json
POST /api/reports/generate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "type": "MONTHLY_EMPLOYEE",
  "userId": "employee-uuid",
  "period": "2026-01"
}
```

**API Response Example**:
```json
{
  "id": "report-uuid",
  "tenantId": "tenant-uuid",
  "type": "MONTHLY_EMPLOYEE",
  "period": "2026-01",
  "fileUrl": "https://s3.../report.pdf",
  "fileHash": "sha256-hash",
  "generatedAt": "2026-01-29T10:00:00Z"
}
```

---

### 4.2 List Reports (Manager/Admin View)

**API Endpoint**: `GET /api/reports`  
**UI Page**: `/reports`  
**Required Role**: MANAGER or ADMIN

**Test Steps**:
1. Log in as MANAGER
2. Navigate to `/reports`
3. Verify all reports for tenant displayed
4. Filter by type: MONTHLY_EMPLOYEE, MONTHLY_COMPANY, COMPLIANCE_EXPORT
5. Filter by period: "2026-01"

**Expected Result**:
- All reports for tenant visible
- Can filter by type and period
- Shows: type, period, generated date, download buttons

**Success Criteria**:
- ✅ All reports returned
- ✅ API returns 200 OK
- ✅ Filtering works correctly
- ✅ Pagination works

---

### 4.3 List My Reports (Employee View)

**API Endpoint**: `GET /api/reports/my/reports`  
**UI Page**: `/reports/my`  
**Required Role**: EMPLOYEE, MANAGER, ADMIN

**Test Steps**:
1. Log in as EMPLOYEE
2. Navigate to `/reports/my`
3. Verify only own reports displayed

**Expected Result**:
- Only reports for current user visible
- Shows: period, generated date, signature status, download buttons

**Success Criteria**:
- ✅ Only own reports returned
- ✅ API returns 200 OK
- ✅ Signature status visible (signed/unsigned)

---

### 4.4 Download PDF Report

**API Endpoint**: `GET /api/reports/:id/pdf`  
**UI Page**: `/reports` (Download PDF button)  
**Required Role**: Any authenticated user (own reports) or MANAGER/ADMIN (all reports)

**Test Steps**:
1. Log in as EMPLOYEE
2. Navigate to `/reports/my`
3. Click "Download PDF" on a report
4. Verify PDF downloads
5. Open PDF and verify contents:
   - Employee name and details
   - Period (e.g., "January 2026")
   - All time entries for period
   - Total hours worked
   - Signature section (if signed)
   - Company logo and branding

**Expected Result**:
- PDF file downloads successfully
- Filename: `report-{id}.pdf`
- PDF contains all required information
- PDF is legally compliant (RD-Ley 8/2019)

**Success Criteria**:
- ✅ PDF downloads successfully
- ✅ Content-Type: application/pdf
- ✅ Content-Disposition: attachment
- ✅ PDF readable and formatted correctly
- ✅ All time entries included
- ✅ Signature section present (if signed)

**PDF Contents Checklist**:
- [ ] Company name and logo
- [ ] Employee name and employee code
- [ ] Report period (month/year)
- [ ] Table of time entries (date, clock in, clock out, hours)
- [ ] Total hours worked
- [ ] Signature section (if signed: signature image, date, IP)
- [ ] Footer: "Generated on [date] - Torre Tempo by LSLT Group"

---

### 4.5 Download CSV Export

**API Endpoint**: `GET /api/reports/:id/csv`  
**UI Page**: `/reports` (Download CSV button)  
**Required Role**: MANAGER or ADMIN

**Test Steps**:
1. Log in as MANAGER
2. Navigate to `/reports`
3. Click "Download CSV" on a report
4. Verify CSV downloads
5. Open CSV in Excel/Google Sheets and verify contents

**Expected Result**:
- CSV file downloads successfully
- Filename: `report-{id}.csv`
- CSV contains all time entries with headers

**Success Criteria**:
- ✅ CSV downloads successfully
- ✅ Content-Type: text/csv
- ✅ Content-Disposition: attachment
- ✅ CSV readable in Excel/Google Sheets
- ✅ All time entries included
- ✅ Headers present

**CSV Format Example**:
```csv
Date,Employee,Clock In,Clock Out,Break (mins),Total Hours,Location,Status
2026-01-15,John Doe,08:00,17:00,60,8.0,Office Madrid,ACTIVE
2026-01-16,John Doe,08:15,17:30,60,8.25,Office Madrid,ACTIVE
```

---

### 4.6 Download XLSX Export

**API Endpoint**: `GET /api/reports/:id/xlsx`  
**UI Page**: `/reports` (Download XLSX button)  
**Required Role**: MANAGER or ADMIN

**Test Steps**:
1. Log in as MANAGER
2. Navigate to `/reports`
3. Click "Download XLSX" on a report
4. Verify XLSX downloads
5. Open XLSX in Excel and verify contents

**Expected Result**:
- XLSX file downloads successfully
- Filename: `report-{id}.xlsx`
- XLSX contains all time entries with formatting

**Success Criteria**:
- ✅ XLSX downloads successfully
- ✅ Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- ✅ Content-Disposition: attachment
- ✅ XLSX readable in Excel
- ✅ All time entries included
- ✅ Headers present and formatted
- ✅ Columns auto-sized

---

### 4.7 Sign Report (Employee Acknowledgment)

**API Endpoint**: `POST /api/reports/:id/sign`  
**UI Page**: `/reports/my/:id` (Sign Report button)  
**Required Role**: EMPLOYEE, MANAGER, ADMIN

**Test Steps**:
1. Log in as EMPLOYEE
2. Navigate to `/reports/my`
3. Click on an unsigned report
4. Click "Sign Report"
5. Draw signature on canvas
6. Click "Submit Signature"

**Expected Result**:
- Signature saved as base64 image
- Signature record created in database
- Toast notification: "Report signed"
- Report marked as signed
- Signature visible on PDF download

**Success Criteria**:
- ✅ Signature created in database
- ✅ API returns 201 Created
- ✅ imageBase64 stored correctly
- ✅ acknowledgedAt timestamp set
- ✅ IP address and user agent recorded
- ✅ Report shows "Signed" status
- ✅ Signature appears on PDF

**API Request Example**:
```json
POST /api/reports/{id}/sign
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "imageBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**API Response Example**:
```json
{
  "id": "signature-uuid",
  "reportId": "report-uuid",
  "userId": "user-uuid",
  "imageBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "acknowledgedAt": "2026-01-29T10:00:00Z",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

**Database Verification**:
```sql
SELECT * FROM signatures WHERE reportId = '<report-id>' AND userId = '<user-id>';
-- Should show: imageBase64, acknowledgedAt, ipAddress, userAgent
```

---

## 5. Additional Verification Tests

### 5.1 Multi-Tenant Isolation

**Test Steps**:
1. Create two tenants: Tenant A and Tenant B
2. Create users in each tenant with same email (allowed across tenants)
3. Create locations, time entries, reports in each tenant
4. Log in as Tenant A user
5. Verify only Tenant A data visible
6. Log in as Tenant B user
7. Verify only Tenant B data visible

**Success Criteria**:
- ✅ No cross-tenant data leakage
- ✅ API always filters by tenantId
- ✅ Same email allowed in different tenants
- ✅ Database queries include tenantId filter

---

### 5.2 Role-Based Access Control (RBAC)

**Test Steps**:
1. Log in as EMPLOYEE
2. Attempt to access ADMIN-only endpoints (e.g., POST /api/users)
3. Verify 403 Forbidden response
4. Log in as MANAGER
5. Attempt to create ADMIN user
6. Verify 403 Forbidden response
7. Log in as ADMIN
8. Verify all operations allowed

**Success Criteria**:
- ✅ EMPLOYEE cannot access ADMIN/MANAGER endpoints
- ✅ MANAGER cannot create ADMIN users
- ✅ ADMIN can perform all operations
- ✅ GLOBAL_ADMIN can access all tenants

---

### 5.3 Offline Support (PWA)

**Test Steps**:
1. Log in as EMPLOYEE
2. Navigate to `/clock-in`
3. Disable network (Chrome DevTools → Network → Offline)
4. Clock in (should queue offline)
5. Verify "Offline - will sync when online" message
6. Enable network
7. Verify clock-in syncs automatically

**Success Criteria**:
- ✅ PWA service worker registered
- ✅ Offline clock-ins queued
- ✅ Automatic sync when online
- ✅ No data loss

---

### 5.4 Spanish Labor Law Compliance

**Test Steps**:
1. Log in as EMPLOYEE
2. Clock in at 08:00
3. Attempt to clock in again without clocking out
4. Verify error: "You must clock out first"
5. Clock out at 18:00 (10 hours)
6. Verify warning: "Exceeds 9 hours daily limit"
7. Attempt to clock in 6 days in a row
8. Verify warning: "Exceeds 40 hours weekly limit"

**Success Criteria**:
- ✅ Compliance rules enforced
- ✅ Blocking violations prevent operation
- ✅ Warning violations allow operation but log
- ✅ Audit logs created for violations

---

### 5.5 Audit Trail Completeness

**Test Steps**:
1. Perform various operations:
   - Create user
   - Update location
   - Approve edit request
   - Generate report
   - Sign report
2. Log in as ADMIN
3. Navigate to `/audit`
4. Verify all operations logged

**Success Criteria**:
- ✅ All operations logged
- ✅ Actor, action, entity, entityId recorded
- ✅ Changes JSON shows old/new values
- ✅ IP address and user agent recorded
- ✅ 5-year retention enforced

---

## 6. Performance & Load Testing

### 6.1 API Response Times

**Test Steps**:
1. Use Postman or curl to measure response times
2. Test endpoints:
   - GET /api/locations → <200ms
   - GET /api/users → <300ms
   - POST /api/time-tracking/clock-in → <500ms
   - POST /api/reports/generate → <10s

**Success Criteria**:
- ✅ All endpoints respond within acceptable time
- ✅ No timeouts
- ✅ Database queries optimized (indexes used)

---

### 6.2 Concurrent Users

**Test Steps**:
1. Use load testing tool (k6, JMeter, Artillery)
2. Simulate 100 concurrent users
3. Perform operations: login, clock-in, list time entries
4. Verify no errors or timeouts

**Success Criteria**:
- ✅ System handles 100 concurrent users
- ✅ No 500 errors
- ✅ Response times acceptable
- ✅ Database connections managed correctly

---

## 7. Security Testing

### 7.1 Authentication

**Test Steps**:
1. Attempt to access protected endpoint without token
2. Verify 401 Unauthorized response
3. Attempt to access with expired token
4. Verify 401 Unauthorized response
5. Attempt to access with invalid token
6. Verify 401 Unauthorized response

**Success Criteria**:
- ✅ All protected endpoints require valid JWT
- ✅ Expired tokens rejected
- ✅ Invalid tokens rejected

---

### 7.2 SQL Injection Prevention

**Test Steps**:
1. Attempt SQL injection in login form:
   - Email: `admin' OR '1'='1`
   - Password: `anything`
2. Verify login fails
3. Attempt SQL injection in search fields
4. Verify no database errors

**Success Criteria**:
- ✅ Prisma ORM prevents SQL injection
- ✅ All inputs sanitized
- ✅ No database errors

---

### 7.3 XSS Prevention

**Test Steps**:
1. Attempt to create user with XSS payload:
   - First Name: `<script>alert('XSS')</script>`
2. Verify script not executed in UI
3. Verify HTML escaped in output

**Success Criteria**:
- ✅ React escapes HTML by default
- ✅ No script execution
- ✅ All user input sanitized

---

## 8. Browser Compatibility

**Test Steps**:
1. Test on browsers:
   - Chrome (latest)
   - Firefox (latest)
   - Safari (latest)
   - Edge (latest)
   - Mobile Safari (iOS)
   - Mobile Chrome (Android)
2. Verify all features work correctly

**Success Criteria**:
- ✅ All features work on all browsers
- ✅ UI renders correctly
- ✅ No console errors
- ✅ PWA installable on mobile

---

## 9. Mobile Responsiveness

**Test Steps**:
1. Test on devices:
   - iPhone 12/13/14 (iOS Safari)
   - Samsung Galaxy S21/S22 (Chrome)
   - iPad (Safari)
2. Verify:
   - Bottom navigation visible on mobile (<768px)
   - Touch targets ≥44px
   - Forms usable on mobile
   - QR scanner works on mobile camera

**Success Criteria**:
- ✅ Mobile-first design works correctly
- ✅ Bottom nav visible on mobile
- ✅ All features usable on mobile
- ✅ QR scanner works on mobile

---

## 10. Deployment Verification

### 10.1 Production Environment

**Test Steps**:
1. Verify production URL: https://time.lsltgroup.es
2. Verify SSL certificate valid
3. Verify HTTPS redirect works
4. Verify health check: GET /api/health
5. Verify database connection
6. Verify Redis connection

**Success Criteria**:
- ✅ Production URL accessible
- ✅ SSL certificate valid (not expired)
- ✅ HTTP → HTTPS redirect works
- ✅ Health check returns 200 OK
- ✅ Database connected
- ✅ Redis connected

---

### 10.2 Docker Containers

**Test Steps**:
1. SSH into production server
2. Run: `docker ps`
3. Verify containers running:
   - torre-tempo-web
   - torre-tempo-api
   - torre-tempo-postgres
   - torre-tempo-redis
   - torre-tempo-nginx
4. Check logs: `docker logs torre-tempo-api`

**Success Criteria**:
- ✅ All containers running
- ✅ No error logs
- ✅ Health checks passing

---

## 11. Data Integrity

### 11.1 Database Constraints

**Test Steps**:
1. Attempt to create duplicate email within tenant
2. Verify unique constraint enforced
3. Attempt to create time entry without tenantId
4. Verify not-null constraint enforced
5. Attempt to delete location with time entries
6. Verify foreign key constraint enforced

**Success Criteria**:
- ✅ Unique constraints enforced
- ✅ Not-null constraints enforced
- ✅ Foreign key constraints enforced
- ✅ Database integrity maintained

---

### 11.2 Data Backup & Restore

**Test Steps**:
1. SSH into production server
2. Run backup script: `./infra/scripts/backup.sh`
3. Verify backup file created
4. Test restore (on staging environment)
5. Verify data restored correctly

**Success Criteria**:
- ✅ Backup script works
- ✅ Backup file created
- ✅ Restore works correctly
- ✅ No data loss

---

## 12. Internationalization (i18n)

### 12.1 Language Switching

**Test Steps**:
1. Log in as EMPLOYEE
2. Navigate to `/profile`
3. Change language to Spanish (ES)
4. Verify all UI strings translated
5. Change language to English (EN)
6. Verify all UI strings translated

**Success Criteria**:
- ✅ Language switching works
- ✅ All UI strings translated
- ✅ No missing translation keys
- ✅ Date/time formats localized

---

## 13. Regression Testing Checklist

After any code changes, verify:

- [ ] All API endpoints return correct status codes
- [ ] All CRUD operations work correctly
- [ ] Multi-tenant isolation maintained
- [ ] Role-based access control enforced
- [ ] Audit logs created for all operations
- [ ] Reports generate correctly (PDF, CSV, XLSX)
- [ ] Signatures work correctly
- [ ] QR codes generate and validate correctly
- [ ] Geofence validation works correctly
- [ ] Compliance rules enforced
- [ ] Offline support works (PWA)
- [ ] Mobile responsiveness maintained
- [ ] No console errors in browser
- [ ] No error logs in server
- [ ] Database migrations applied correctly
- [ ] All tests pass (unit, integration, e2e)

---

## 14. Known Issues & Limitations

### Issue 1: Nginx Health Check Unhealthy
**Status**: Non-critical  
**Impact**: Monitoring noise  
**Workaround**: Routes work fine, ignore health check status

### Issue 2: Bundle Size 955KB
**Status**: Medium priority  
**Impact**: Performance on slow connections  
**Potential Fix**: Code splitting, lazy loading

### Issue 3: LSP Cache Stale Errors
**Status**: Low priority  
**Impact**: Cosmetic (editor errors)  
**Workaround**: Restart TypeScript language server

---

## 15. Test Data Requirements

### Minimum Test Data:
- 2 Tenants (Tenant A, Tenant B)
- 5 Users per tenant:
  - 1 ADMIN
  - 1 MANAGER
  - 3 EMPLOYEES
- 3 Locations per tenant
- 50 Time Entries per employee (last 30 days)
- 10 Edit Requests (5 PENDING, 3 APPROVED, 2 REJECTED)
- 3 Reports per employee (last 3 months)
- 5 Signatures

### Test Data Script:
```bash
# Run seed script to generate test data
npm run db:seed
```

---

## 16. Test Execution Schedule

### Daily (Automated):
- Unit tests
- Integration tests
- API endpoint tests
- Linting and type checking

### Weekly (Manual):
- Full regression testing
- Mobile responsiveness testing
- Browser compatibility testing

### Monthly (Manual):
- Performance testing
- Load testing
- Security testing
- Backup & restore testing

### Before Each Release:
- Full test plan execution
- User acceptance testing (UAT)
- Production deployment verification

---

## 17. Test Sign-Off

**Tester Name**: ___________________________  
**Date**: ___________________________  
**Version Tested**: ___________________________  
**Test Result**: ☐ PASS ☐ FAIL  
**Notes**: ___________________________

---

**End of Verification Test Plan**

For questions or issues, contact: info@lsltgroup.es
