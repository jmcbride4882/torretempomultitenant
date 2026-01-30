# Torre Tempo - Verification Guide for LSLT Staff

**Internal Testing & Verification Process**

This guide provides step-by-step instructions for LSLT staff to verify Torre Tempo functionality before full deployment. Follow this guide to ensure all features work correctly and meet your operational needs.

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Timeline](#testing-timeline)
3. [Testing Roles](#testing-roles)
4. [Pre-Testing Setup](#pre-testing-setup)
5. [Employee Testing Checklist](#employee-testing-checklist)
6. [Manager Testing Checklist](#manager-testing-checklist)
7. [Admin Testing Checklist](#admin-testing-checklist)
8. [Feature Testing Instructions](#feature-testing-instructions)
9. [Issue Reporting](#issue-reporting)
10. [Success Criteria](#success-criteria)

---

## Overview

### Purpose

This verification process ensures Torre Tempo meets LSLT Group's operational requirements and Spanish labor law compliance needs before full staff deployment.

### Goals

- ✅ Verify all features work correctly
- ✅ Test on multiple devices (mobile, tablet, desktop)
- ✅ Validate user workflows for each role
- ✅ Identify any issues or improvements needed
- ✅ Ensure compliance with Spanish labor law
- ✅ Confirm system is ready for production use

### What You'll Test

- **Authentication:** Login, logout, password reset
- **Clock In/Out:** QR scanning, geofencing, offline mode
- **Schedules:** View upcoming shifts
- **Edit Requests:** Submit, approve, reject
- **Reports:** Generate, sign, download PDFs
- **User Management:** Create, edit, delete users (Admin only)
- **Location Management:** Create locations, QR codes, geofencing (Admin only)
- **PWA Installation:** Install on mobile devices
- **Multi-language:** Switch between languages

### Access Information

- **URL:** https://time.lsltgroup.es
- **Support:** info@lsltgroup.es
- **Test Accounts:** See TEST_ACCOUNTS.md for setup instructions

---

## Testing Timeline

### Recommended Duration: 1-2 Weeks

**Week 1: Initial Testing**
- Days 1-2: Setup test accounts and locations
- Days 3-5: Basic feature testing (clock in/out, schedules)
- Days 6-7: Advanced features (edit requests, reports)

**Week 2: Real-World Testing**
- Days 8-10: Daily usage in real work scenarios
- Days 11-12: Edge cases and error handling
- Days 13-14: Final verification and issue reporting

### Daily Testing Routine

**Morning (5 minutes):**
- Clock in using different methods (QR, location, manual)
- Check dashboard for notifications

**During Day (2 minutes):**
- View schedule
- Test one feature from checklist

**Evening (5 minutes):**
- Clock out
- Review time entries
- Report any issues

---

## Testing Roles

### Who Should Test What

#### Employee Role Testers (2-3 people)
- Basic clocking functionality
- Schedule viewing
- Edit request submission
- Report viewing and signing
- Mobile app installation
- Offline mode

#### Manager Role Testers (1-2 people)
- All Employee features
- Edit request approval/rejection
- Team time entry viewing
- Team report generation

#### Admin Role Testers (1 person)
- All Manager features
- User management
- Location management
- QR code generation
- Compliance dashboard
- System settings

💡 **Tip:** Each tester should use their own device (mobile + desktop) to test across platforms.

---

## Pre-Testing Setup

### Before You Begin

1. **Receive Test Account Credentials**
   - Check email for login credentials
   - Note your assigned role (Employee, Manager, or Admin)

2. **Prepare Your Devices**
   - Mobile phone (iOS or Android)
   - Desktop/laptop computer
   - Ensure good internet connection

3. **Bookmark the URL**
   - Save https://time.lsltgroup.es in your browser
   - Add to home screen on mobile (see PWA installation)

4. **Review Documentation**
   - Read USER_GUIDE.md for your role
   - Read ADMIN_GUIDE.md if you're testing Manager/Admin features
   - Keep QUICK_REFERENCE.md handy

5. **Prepare for Testing**
   - Clear your schedule for testing time
   - Have a notepad ready for issue notes
   - Take screenshots of any errors

---

## Employee Testing Checklist

### Authentication & Access
- [ ] **Login with provided credentials**
  - Expected: Successfully log in and see dashboard
  - Test on: Mobile + Desktop
- [ ] **Logout and login again**
  - Expected: Logout works, can log back in
- [ ] **Test "Forgot Password" flow**
  - Expected: Receive reset email, can set new password
- [ ] **Change language to English**
  - Expected: Interface switches to English immediately
- [ ] **Change language back to Spanish**
  - Expected: Interface switches back to Spanish

### Clock In/Out - Basic
- [ ] **Clock in without QR or location**
  - Expected: Clock in succeeds, see green "Clocked In" badge
  - Note: Clock in time and status
- [ ] **View current session timer**
  - Expected: Timer shows elapsed time since clock in
- [ ] **Clock out**
  - Expected: Clock out succeeds, see gray "Clocked Out" badge
  - Note: Total duration displayed

### Clock In/Out - QR Code
- [ ] **Clock in by scanning QR code**
  - Expected: Camera opens, QR scans, clock in succeeds
  - Badge shows: "QR" origin
- [ ] **Clock out after QR clock in**
  - Expected: Clock out succeeds normally

### Clock In/Out - Geofence
- [ ] **Clock in using location services**
  - Expected: Location permission requested, GPS acquired, clock in succeeds
  - Badge shows: "GEOFENCE" origin
- [ ] **Try to clock in from outside geofence**
  - Expected: Error message "Outside authorized location"
- [ ] **Clock out after geofence clock in**
  - Expected: Clock out succeeds normally

### Clock In/Out - Offline Mode
- [ ] **Turn off WiFi/mobile data**
  - Expected: Yellow "Offline Mode" banner appears
- [ ] **Clock in while offline**
  - Expected: Clock in succeeds, entry saved locally
  - Badge shows: "OFFLINE" origin
- [ ] **Clock out while offline**
  - Expected: Clock out succeeds, entry saved locally
- [ ] **Turn WiFi/mobile data back on**
  - Expected: Entries sync automatically, green checkmark appears
- [ ] **Verify synced entries appear in Recent Entries**
  - Expected: Offline entries now show in list with correct times

### Schedule Viewing
- [ ] **View dashboard**
  - Expected: See "Upcoming Shifts" section
- [ ] **Check upcoming shifts**
  - Expected: See your scheduled shifts with dates and times
- [ ] **Verify shift details are correct**
  - Expected: Shift name, date, start/end times match your schedule

### Edit Requests
- [ ] **Submit edit request for clock in time**
  - Go to My Reports → Find entry → Request Edit
  - Field: Clock In Time
  - New Value: [Different time]
  - Reason: "Testing edit request feature"
  - Expected: Request submitted, status shows "Pending"
- [ ] **Submit edit request for clock out time**
  - Expected: Request submitted successfully
- [ ] **View pending edit requests on dashboard**
  - Expected: Yellow notification banner shows pending requests
- [ ] **Check edit request status**
  - Expected: Can see request status (Pending/Approved/Rejected)

### Reports
- [ ] **View My Reports page**
  - Expected: See list of your time entries
- [ ] **View monthly report**
  - Expected: See report for current month with all entries
- [ ] **Sign monthly report**
  - Click "Sign Report" → Draw signature → Save
  - Expected: Signature saved, status changes to "Signed"
- [ ] **Download signed report as PDF**
  - Expected: PDF opens in new tab with your signature
- [ ] **Verify PDF contents**
  - Expected: Shows your name, all time entries, totals, signature

### PWA Installation - Mobile
- [ ] **Install PWA on iPhone/iPad** (if applicable)
  - Safari → Share → Add to Home Screen
  - Expected: App icon appears on home screen
- [ ] **Install PWA on Android** (if applicable)
  - Chrome → Menu → Add to Home screen
  - Expected: App icon appears on home screen
- [ ] **Launch PWA from home screen**
  - Expected: Opens in full-screen app mode
- [ ] **Test PWA functionality**
  - Expected: All features work same as browser version

### PWA Installation - Desktop
- [ ] **Install PWA on desktop** (Chrome/Edge)
  - Click install icon in address bar
  - Expected: Installs as standalone app
- [ ] **Launch desktop PWA**
  - Expected: Opens in app window
- [ ] **Test desktop PWA functionality**
  - Expected: All features work normally

### Mobile Usability
- [ ] **Test bottom navigation on mobile**
  - Expected: Bottom nav shows on screens <768px wide
- [ ] **Test all navigation items**
  - Expected: Dashboard, Clock, Reports, Profile all accessible
- [ ] **Test touch targets**
  - Expected: All buttons easy to tap (≥44px)
- [ ] **Test in portrait and landscape**
  - Expected: Layout adapts correctly

### Error Handling
- [ ] **Try to clock in when already clocked in**
  - Expected: Error message or button disabled
- [ ] **Try to clock out when already clocked out**
  - Expected: Error message or button disabled
- [ ] **Submit edit request with empty reason**
  - Expected: Validation error "Reason is required"
- [ ] **Try to access admin pages**
  - Expected: Access denied or pages not visible

---

## Manager Testing Checklist

### All Employee Features
- [ ] **Complete all items in Employee Testing Checklist**
  - Managers should test all employee features first

### Team Overview
- [ ] **View team dashboard**
  - Expected: See team members and their status
- [ ] **Check team statistics**
  - Expected: See number of team members, active now, etc.
- [ ] **View team recent activity**
  - Expected: See recent clock ins/outs from team

### Edit Request Approval
- [ ] **View pending edit requests**
  - Go to Approvals page
  - Expected: See list of pending requests from team
- [ ] **Review edit request details**
  - Expected: See employee name, original value, new value, reason
- [ ] **Approve an edit request**
  - Add comment (optional) → Click Approve
  - Expected: Request status changes to "Approved"
  - Expected: Time entry updated with new value
- [ ] **Reject an edit request**
  - Add comment (required) → Click Reject
  - Expected: Request status changes to "Rejected"
  - Expected: Time entry remains unchanged
- [ ] **Verify employee sees approval/rejection**
  - Ask employee tester to check their dashboard
  - Expected: Employee sees updated status and your comment

### Team Reports
- [ ] **Generate team member report**
  - Reports → Select team member → Select month → Generate
  - Expected: Report generated successfully
- [ ] **Download team member report PDF**
  - Expected: PDF shows team member's hours
- [ ] **Generate monthly team report**
  - Expected: Report shows all team members' hours
- [ ] **Verify report accuracy**
  - Expected: Hours match actual time entries

### Manager Permissions
- [ ] **Verify cannot access admin features**
  - Expected: No Users or Locations menu items
- [ ] **Verify can only see own team data**
  - Expected: Cannot see other teams' data

---

## Admin Testing Checklist

### All Manager Features
- [ ] **Complete all items in Manager Testing Checklist**
  - Admins should test all manager features first

### User Management - Create
- [ ] **Create new employee user**
  - Users → Add User
  - Email: test.employee@lsltgroup.es
  - Password: TestPass123!
  - First Name: Test
  - Last Name: Employee
  - Role: Employee
  - Expected: User created, appears in user list
- [ ] **Create new manager user**
  - Same process, Role: Manager
  - Expected: Manager user created
- [ ] **Verify new users can log in**
  - Ask testers to log in with new accounts
  - Expected: Login succeeds

### User Management - Edit
- [ ] **Edit user details**
  - Find user → Edit → Change name → Save
  - Expected: Changes saved, reflected in user list
- [ ] **Change user role**
  - Edit user → Change role → Save
  - Expected: User's permissions update immediately
- [ ] **Deactivate a user**
  - Edit user → Toggle Active Status → Save
  - Expected: User cannot log in
- [ ] **Reactivate a user**
  - Edit user → Toggle Active Status → Save
  - Expected: User can log in again

### User Management - Delete
- [ ] **Delete a test user**
  - Find user → Delete → Confirm
  - Expected: User removed from list
  - ⚠️ Warning: Only delete test accounts!

### Location Management - Create
- [ ] **Create new location**
  - Locations → Add Location
  - Name: "Test Office"
  - Address: [Your office address]
  - Click on map to set coordinates
  - Geofence Radius: 100 meters
  - QR Enabled: Yes
  - Expected: Location created, appears in list
- [ ] **Verify location on map**
  - Expected: Marker shows correct position

### Location Management - QR Codes
- [ ] **Generate QR code for location**
  - Find location → Generate QR Code
  - Expected: QR code appears in popup
- [ ] **Download QR code**
  - Expected: Image file downloads
- [ ] **Print QR code** (optional)
  - Expected: Prints correctly
- [ ] **Test scanning QR code**
  - Display QR code on screen
  - Use mobile device to scan
  - Expected: Clock in succeeds with "QR" origin

### Location Management - Geofencing
- [ ] **Test geofence from inside radius**
  - Go to location physically
  - Clock in using location
  - Expected: Clock in succeeds
- [ ] **Test geofence from outside radius**
  - Move away from location (>100m)
  - Try to clock in using location
  - Expected: Error "Outside authorized location"
- [ ] **Adjust geofence radius**
  - Edit location → Change radius to 200m → Save
  - Expected: Larger radius allows clock in from farther away

### Location Management - Edit/Delete
- [ ] **Edit location details**
  - Edit location → Change name → Save
  - Expected: Changes saved
- [ ] **Deactivate location**
  - Edit location → Toggle Active Status → Save
  - Expected: Employees cannot clock in at this location
- [ ] **Delete test location**
  - Delete location → Confirm
  - Expected: Location removed
  - ⚠️ Note: Cannot delete locations with time entries

### Compliance Dashboard
- [ ] **View compliance overview**
  - Dashboard → Check compliance indicators
  - Expected: See green/yellow/red status indicators
- [ ] **Check for compliance alerts**
  - Expected: See any issues (missing clock outs, unsigned reports, etc.)
- [ ] **Review pending approvals count**
  - Expected: Shows number of pending edit requests
- [ ] **Check active employees count**
  - Expected: Shows number of currently clocked in employees

### Reports - Admin
- [ ] **Generate company-wide report**
  - Reports → Monthly Company Report → Select month → Generate
  - Expected: Report shows all employees' hours
- [ ] **Generate compliance export**
  - Reports → Compliance Export → Select date range → Generate
  - Expected: Detailed export with all time entries
- [ ] **Download compliance export**
  - Expected: Excel or PDF file downloads
- [ ] **Verify export contents**
  - Expected: Shows all required compliance data

### System Settings
- [ ] **View tenant settings**
  - Settings → Review current settings
  - Expected: See company info, time tracking rules, etc.
- [ ] **Update company information**
  - Edit company name, address, etc. → Save
  - Expected: Changes saved
- [ ] **Configure time tracking rules**
  - Toggle QR/geofence requirements → Save
  - Expected: Rules apply to all users
- [ ] **Test rule enforcement**
  - If QR required, try to clock in without QR
  - Expected: Clock in fails or shows warning

---

## Feature Testing Instructions

### Detailed Step-by-Step Testing

#### 1. Authentication Testing

**Login Flow:**
1. Open https://time.lsltgroup.es
2. Enter email: [your test email]
3. Enter password: [your test password]
4. Click "Login"
5. ✅ **Expected:** Dashboard loads, shows your name in top-right
6. ❌ **If fails:** Note error message, try different browser

**Logout Flow:**
1. Click your name in top-right corner
2. Click "Logout"
3. ✅ **Expected:** Redirected to login page
4. ❌ **If fails:** Note what happens, refresh page

**Password Reset:**
1. Click "Forgot Password?" on login page
2. Enter your email
3. Click "Send Reset Link"
4. Check your email inbox
5. Click reset link in email
6. Enter new password (twice)
7. Click "Reset Password"
8. ✅ **Expected:** Password changed, can log in with new password
9. ❌ **If fails:** Note at which step it fails

#### 2. Clock In/Out Testing

**Basic Clock In:**
1. Go to Clock page (navigation menu)
2. Verify status shows "Clocked Out" (gray badge)
3. Click large green "Clock In" button
4. Wait for confirmation message
5. ✅ **Expected:** 
   - Success message appears
   - Status changes to "Clocked In" (green badge)
   - Timer starts showing elapsed time
   - Clock in time displayed
6. ❌ **If fails:** Note error message, check internet connection

**Basic Clock Out:**
1. While clocked in, go to Clock page
2. Verify status shows "Clocked In" (green badge)
3. Note the elapsed time
4. Click large red "Clock Out" button
5. Wait for confirmation message
6. ✅ **Expected:**
   - Success message appears
   - Status changes to "Clocked Out" (gray badge)
   - Total duration displayed
   - Entry appears in "Recent Entries" below
7. ❌ **If fails:** Note error message

**QR Code Clock In:**
1. Admin: Generate and display QR code for a location
2. Go to Clock page on mobile device
3. Click "Scan QR Code" button
4. Allow camera access when prompted
5. Point camera at QR code (15-30cm away)
6. Wait for green checkmark
7. Click "Clock In" button
8. ✅ **Expected:**
   - QR code scans successfully
   - Green checkmark appears
   - Clock in succeeds
   - Entry shows "QR" badge in Recent Entries
9. ❌ **If fails:** 
   - Camera doesn't open: Check permissions
   - Won't scan: Check lighting, distance, QR code quality
   - Clock in fails: Check location is active

**Geofence Clock In:**
1. Go to the physical location (within geofence radius)
2. Go to Clock page on mobile device
3. Click "Get Location" button
4. Allow location access when prompted
5. Wait 10-15 seconds for GPS to acquire
6. Wait for green checkmark
7. Click "Clock In" button
8. ✅ **Expected:**
   - Location acquired successfully
   - Green checkmark appears
   - Clock in succeeds
   - Entry shows "GEOFENCE" badge
9. ❌ **If fails:**
   - Location not acquired: Check GPS is enabled, move near window
   - Outside geofence: Check you're within radius, check location coordinates

**Offline Clock In:**
1. Clock out if currently clocked in
2. Turn off WiFi and mobile data
3. Refresh page - should see yellow "Offline Mode" banner
4. Click "Clock In" button
5. ✅ **Expected:**
   - Clock in succeeds
   - Entry saved locally
   - Yellow "Pending Sync" indicator appears
6. Turn WiFi/mobile data back on
7. Wait 30 seconds
8. ✅ **Expected:**
   - Entry syncs automatically
   - Green checkmark appears
   - Entry shows in Recent Entries with "OFFLINE" badge
9. ❌ **If fails:**
   - Won't sync: Keep page open longer, refresh page
   - Entry lost: Check browser didn't clear data

#### 3. Schedule Testing

**View Schedule:**
1. Go to Dashboard
2. Scroll to "Upcoming Shifts" section
3. ✅ **Expected:**
   - See list of your upcoming shifts
   - Each shift shows: name, date, start time, end time
   - Shifts are in chronological order
4. ❌ **If fails:**
   - No shifts shown: Check with admin if schedules created
   - Wrong shifts: Check with admin about schedule assignment

#### 4. Edit Request Testing

**Submit Edit Request:**
1. Go to My Reports page
2. Find a time entry to edit
3. Click "Request Edit" button
4. Fill out form:
   - **Field to Edit:** Select "Clock In Time"
   - **New Value:** Enter a different time (e.g., 09:15)
   - **Reason:** "Testing edit request feature - please approve"
5. Click "Submit Request"
6. ✅ **Expected:**
   - Success message appears
   - Request appears in list with "Pending" status (yellow badge)
   - Dashboard shows yellow notification banner
7. ❌ **If fails:**
   - Validation error: Check all fields filled correctly
   - Submit fails: Check internet connection

**Manager: Approve Edit Request:**
1. Go to Approvals page
2. Find the pending request
3. Review details: employee, original value, new value, reason
4. Add comment (optional): "Approved for testing"
5. Click "Approve" button
6. Confirm in popup
7. ✅ **Expected:**
   - Request status changes to "Approved" (green badge)
   - Time entry updated with new value
   - Employee sees approval on their dashboard
8. ❌ **If fails:** Note error message

**Manager: Reject Edit Request:**
1. Go to Approvals page
2. Find a pending request
3. Add comment (required): "Rejected for testing purposes"
4. Click "Reject" button
5. Confirm in popup
6. ✅ **Expected:**
   - Request status changes to "Rejected" (red badge)
   - Time entry remains unchanged
   - Employee sees rejection and your comment
7. ❌ **If fails:** Note error message

#### 5. Report Testing

**View Monthly Report:**
1. Go to My Reports page
2. Find current month's report
3. Click to expand/view details
4. ✅ **Expected:**
   - See all your time entries for the month
   - See daily totals
   - See monthly total hours
   - See signature status (Signed/Unsigned)
5. ❌ **If fails:** Note what's missing or incorrect

**Sign Monthly Report:**
1. Find unsigned report
2. Click "Sign Report" button
3. Modal opens with signature pad
4. Draw your signature using mouse/finger
5. Click "Save Signature"
6. ✅ **Expected:**
   - Signature saved
   - Status changes to "Signed" (green badge)
   - Signature date recorded
7. ❌ **If fails:**
   - Won't save: Try drawing a clearer signature
   - Error: Check internet connection

**Download Report PDF:**
1. Find a report (signed or unsigned)
2. Click "📄 Download PDF" button
3. ✅ **Expected:**
   - PDF opens in new tab
   - PDF contains:
     - Your name and employee info
     - Company info (LSLT Group)
     - All time entries with dates and times
     - Daily and monthly totals
     - Your signature (if signed)
   - PDF is properly formatted and readable
4. ❌ **If fails:**
   - Won't download: Check popup blocker
   - Blank PDF: Note error, try different browser
   - Missing data: Note what's missing

#### 6. User Management Testing (Admin Only)

**Create User:**
1. Go to Users page
2. Click "+ Add User" button
3. Fill out form:
   - Email: test.user@lsltgroup.es
   - Password: TestPassword123!
   - First Name: Test
   - Last Name: User
   - Employee Code: TEST001
   - Role: Employee
4. Click "Create User"
5. ✅ **Expected:**
   - Success message
   - User appears in user list
   - User receives welcome email
6. Test login with new account
7. ✅ **Expected:** New user can log in successfully
8. ❌ **If fails:**
   - Email exists: Use different email
   - Validation error: Check all required fields
   - Can't log in: Check password was set correctly

**Edit User:**
1. Find test user in list
2. Click "Edit" button (pencil icon)
3. Change first name to "Updated"
4. Change role to "Manager"
5. Click "Save Changes"
6. ✅ **Expected:**
   - Changes saved
   - User list shows updated name
   - User has new role permissions
7. ❌ **If fails:** Note error message

**Deactivate User:**
1. Edit test user
2. Toggle "Active Status" to Inactive
3. Save changes
4. Try to log in as that user
5. ✅ **Expected:**
   - User cannot log in
   - Error: "Account is inactive"
6. ❌ **If fails:** User can still log in - report issue

#### 7. Location Management Testing (Admin Only)

**Create Location:**
1. Go to Locations page
2. Click "+ Add Location" button
3. Fill out form:
   - Name: "Test Office"
   - Address: [Your office address]
4. Click on map to set location
   - Or enter coordinates manually
5. Set Geofence Radius: 100 meters
6. Toggle "QR Enabled" to Yes
7. Click "Create Location"
8. ✅ **Expected:**
   - Location created
   - Appears in location list
   - Map shows marker at correct position
9. ❌ **If fails:** Note error message

**Generate QR Code:**
1. Find location in list
2. Click "Generate QR Code" button
3. ✅ **Expected:**
   - QR code appears in popup
   - QR code is clear and scannable
4. Click "Download QR Code"
5. ✅ **Expected:** Image file downloads
6. Click "Print QR Code"
7. ✅ **Expected:** Print dialog opens
8. ❌ **If fails:** Note what doesn't work

**Test QR Code:**
1. Display downloaded QR code on screen or print it
2. On mobile device, go to Clock page
3. Click "Scan QR Code"
4. Point camera at QR code
5. ✅ **Expected:**
   - QR code scans successfully
   - Green checkmark appears
   - Can clock in with QR verification
6. ❌ **If fails:**
   - Won't scan: Check QR code quality, lighting
   - Scans but clock in fails: Check location is active

**Test Geofence:**
1. Go to the physical location
2. On mobile device, go to Clock page
3. Click "Get Location"
4. Wait for GPS to acquire
5. ✅ **Expected:**
   - Location acquired
   - Green checkmark appears
   - Can clock in with geofence verification
6. Walk outside the geofence radius (>100m)
7. Try to get location and clock in
8. ✅ **Expected:**
   - Error: "Outside authorized location"
   - Cannot clock in
9. ❌ **If fails:**
   - Can clock in from outside: Check geofence radius, location coordinates

#### 8. PWA Installation Testing

**iOS Installation:**
1. Open Safari on iPhone/iPad
2. Go to https://time.lsltgroup.es
3. Tap Share button (square with up arrow)
4. Scroll down, tap "Add to Home Screen"
5. Edit name if desired
6. Tap "Add"
7. ✅ **Expected:**
   - Torre Tempo icon appears on home screen
   - Icon shows TT logo
8. Tap icon to launch
9. ✅ **Expected:**
   - Opens in full-screen mode (no Safari UI)
   - All features work normally
10. ❌ **If fails:** Note at which step it fails

**Android Installation:**
1. Open Chrome on Android device
2. Go to https://time.lsltgroup.es
3. Tap three dots menu (⋮)
4. Tap "Add to Home screen" or "Install app"
5. Tap "Add" or "Install"
6. ✅ **Expected:**
   - Torre Tempo icon appears on home screen
7. Tap icon to launch
8. ✅ **Expected:**
   - Opens as standalone app
   - All features work normally
9. ❌ **If fails:** Note at which step it fails

**Desktop Installation:**
1. Open Chrome or Edge
2. Go to https://time.lsltgroup.es
3. Look for install icon (⊕) in address bar
4. Click install icon
5. Click "Install"
6. ✅ **Expected:**
   - Torre Tempo opens as standalone app window
   - App icon appears in taskbar/dock
7. Test all features in app
8. ✅ **Expected:** Everything works same as browser
9. ❌ **If fails:** Note what doesn't work

#### 9. Multi-Language Testing

**Switch Language:**
1. Look for language selector (flag icon or dropdown)
2. Click to open language menu
3. Select "English"
4. ✅ **Expected:**
   - Interface immediately switches to English
   - All text translated (buttons, labels, messages)
   - No untranslated strings visible
5. Switch to "Español"
6. ✅ **Expected:**
   - Interface switches back to Spanish
7. Test other languages: French, German, Polish, Dutch
8. ✅ **Expected:** All languages work correctly
9. ❌ **If fails:**
   - Language doesn't change: Note which language
   - Partial translation: Note which strings not translated
   - Layout breaks: Take screenshot

#### 10. Mobile Usability Testing

**Bottom Navigation:**
1. Open on mobile device (screen width <768px)
2. ✅ **Expected:**
   - Bottom navigation bar visible
   - Shows: Dashboard, Clock, Reports, Profile icons
3. Tap each navigation item
4. ✅ **Expected:**
   - Navigates to correct page
   - Active item highlighted
5. ❌ **If fails:** Note which items don't work

**Touch Targets:**
1. Test all buttons on mobile
2. ✅ **Expected:**
   - All buttons easy to tap (≥44px)
   - No accidental taps on nearby elements
   - Buttons respond immediately
3. ❌ **If fails:** Note which buttons are too small or unresponsive

**Orientation:**
1. Test in portrait mode
2. ✅ **Expected:** Layout looks good, all content accessible
3. Rotate to landscape mode
4. ✅ **Expected:** Layout adapts, still usable
5. ❌ **If fails:** Take screenshots of layout issues

---

## Issue Reporting

### How to Report Issues

When you find a problem, report it using this template:

#### Issue Report Template

```
**Issue Title:** [Brief description]

**Severity:** [Critical / High / Medium / Low]
- Critical: Blocks testing, system unusable
- High: Major feature broken, workaround exists
- Medium: Minor feature issue, doesn't block work
- Low: Cosmetic issue, typo, minor inconvenience

**Role:** [Employee / Manager / Admin]

**Device:** [iPhone 13 / Samsung Galaxy S21 / Windows Desktop / etc.]

**Browser:** [Safari 17 / Chrome 120 / Firefox 121 / etc.]

**Steps to Reproduce:**
1. Go to [page]
2. Click [button]
3. Enter [data]
4. Observe [result]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshots:**
[Attach screenshots if applicable]

**Error Messages:**
[Copy any error messages exactly]

**Workaround:**
[If you found a way to work around the issue]

**Additional Notes:**
[Any other relevant information]
```

#### Example Issue Report

```
**Issue Title:** Cannot clock in with QR code on iPhone

**Severity:** High

**Role:** Employee

**Device:** iPhone 13, iOS 17.2

**Browser:** Safari 17

**Steps to Reproduce:**
1. Go to Clock page
2. Click "Scan QR Code" button
3. Camera opens
4. Point at QR code
5. Nothing happens, no scan detected

**Expected Behavior:**
QR code should scan and show green checkmark

**Actual Behavior:**
Camera opens but QR code never scans, no feedback

**Screenshots:**
[Attached: camera-view.png]

**Error Messages:**
None visible

**Workaround:**
Using "Get Location" instead works fine

**Additional Notes:**
Tested with multiple QR codes, same result. QR codes work fine on Android device.
```

### Where to Report Issues

**Email:** info@lsltgroup.es  
**Subject:** Torre Tempo Verification - [Issue Title]

### Issue Tracking

Keep a log of all issues you report:

| # | Issue | Severity | Date Reported | Status | Resolution |
|---|-------|----------|---------------|--------|------------|
| 1 | QR scan fails on iPhone | High | 2026-01-30 | Open | - |
| 2 | Typo on dashboard | Low | 2026-01-30 | Fixed | 2026-01-31 |

### Response Time

- **Critical Issues:** Response within 4 hours
- **High Issues:** Response within 24 hours
- **Medium/Low Issues:** Response within 48 hours

---

## Success Criteria

### System is Ready for Production When:

#### Functionality (Must Pass)
- ✅ All users can log in successfully
- ✅ Clock in/out works reliably (QR, geofence, manual)
- ✅ Offline mode works and syncs correctly
- ✅ Edit requests can be submitted and approved
- ✅ Reports generate correctly and can be signed
- ✅ PDFs download with correct data
- ✅ User management works (create, edit, deactivate)
- ✅ Location management works (create, QR codes, geofence)
- ✅ PWA installs on iOS, Android, and desktop
- ✅ Multi-language switching works

#### Usability (Must Pass)
- ✅ Interface is intuitive and easy to use
- ✅ Mobile experience is smooth and responsive
- ✅ All buttons and links work correctly
- ✅ Error messages are clear and helpful
- ✅ No confusing or broken workflows

#### Performance (Must Pass)
- ✅ Pages load quickly (<3 seconds)
- ✅ Clock in/out responds immediately (<1 second)
- ✅ No crashes or freezes
- ✅ Works on slow internet connections
- ✅ Offline mode is reliable

#### Compliance (Must Pass)
- ✅ All time entries recorded accurately
- ✅ Reports contain all required information
- ✅ Signatures captured and stored correctly
- ✅ Audit trail maintained for all actions
- ✅ Data security measures working

#### Quality (Should Pass)
- ✅ No critical or high severity bugs
- ✅ Medium/low bugs documented for future fixes
- ✅ UI is polished and professional
- ✅ All text is properly translated
- ✅ Consistent branding (LSLT colors, logo)

### Sign-Off Checklist

Before approving for production:

- [ ] All Employee features tested and working
- [ ] All Manager features tested and working
- [ ] All Admin features tested and working
- [ ] Tested on iOS mobile devices
- [ ] Tested on Android mobile devices
- [ ] Tested on desktop browsers (Chrome, Firefox, Safari, Edge)
- [ ] PWA installation tested on all platforms
- [ ] Offline mode tested and reliable
- [ ] Multi-language tested (at least ES and EN)
- [ ] All critical and high severity issues resolved
- [ ] Medium/low issues documented
- [ ] User documentation reviewed and accurate
- [ ] Training materials prepared
- [ ] Support process established
- [ ] Backup and recovery tested
- [ ] Security review completed
- [ ] Compliance requirements verified

### Final Approval

**Approved by:**
- [ ] Employee Tester(s): _________________ Date: _______
- [ ] Manager Tester(s): _________________ Date: _______
- [ ] Admin Tester: _________________ Date: _______
- [ ] IT Manager: _________________ Date: _______
- [ ] HR Manager: _________________ Date: _______

**Production Deployment Authorized:** ☐ Yes ☐ No

**Date:** _________________

---

## Tips for Effective Testing

### Do's ✅

- **Test on real devices** - Use your actual work phone and computer
- **Test in real scenarios** - Clock in/out during actual work hours
- **Test edge cases** - Try unusual inputs, test limits
- **Document everything** - Take notes, screenshots, screen recordings
- **Be thorough** - Don't skip steps, test every feature
- **Communicate** - Share findings with other testers
- **Ask questions** - If unsure, ask for clarification
- **Test daily** - Use the system every day during testing period

### Don'ts ❌

- **Don't rush** - Take time to test properly
- **Don't assume** - Test even if it seems obvious
- **Don't skip documentation** - Always report issues formally
- **Don't test only happy paths** - Try to break things
- **Don't ignore small issues** - Report everything
- **Don't test alone** - Collaborate with other testers
- **Don't use production data** - Use test accounts only

### Testing Mindset

Think like a user:
- "What if I forget to clock out?"
- "What if I lose internet connection?"
- "What if I make a mistake?"
- "What if I'm in a hurry?"
- "What if I'm not tech-savvy?"

Think like an attacker:
- "Can I clock in for someone else?"
- "Can I edit someone else's time?"
- "Can I access admin features?"
- "Can I bypass geofence?"

Think like a manager:
- "Can I trust this data?"
- "Is this compliant with labor law?"
- "Will my team understand this?"
- "Can I generate reports easily?"

---

## Frequently Asked Questions

### Q: How long should I test each feature?
**A:** Spend at least 5-10 minutes per feature. Test multiple times, different scenarios.

### Q: What if I find a critical bug?
**A:** Report immediately via email with "CRITICAL" in subject line. Don't wait.

### Q: Can I test with real employee data?
**A:** No, use only test accounts. Never use real employee data during testing.

### Q: What if I'm not sure if something is a bug?
**A:** Report it anyway. Better to report a non-issue than miss a real bug.

### Q: Should I test features that aren't in my role?
**A:** Yes, try to access features you shouldn't have access to. This tests security.

### Q: How do I know if offline mode is working?
**A:** Look for yellow "Offline Mode" banner and "Pending Sync" indicator.

### Q: What if the system is down during testing?
**A:** Note the time and duration, report to IT, try again later.

### Q: Can I suggest improvements?
**A:** Absolutely! Include suggestions in your issue reports or send separately.

### Q: What happens after testing is complete?
**A:** Issues will be fixed, system will be deployed to production, you'll receive training.

### Q: Will my test data be deleted?
**A:** Yes, all test accounts and data will be cleaned up before production deployment.

---

## Contact Information

### Testing Coordinator
**Email:** info@lsltgroup.es  
**Subject:** Torre Tempo Verification

### Technical Support
**Email:** info@lsltgroup.es  
**Subject:** Torre Tempo Technical Issue

### Developer
**Name:** John McBride  
**Email:** info@lsltgroup.es

---

## Appendix: Testing Scenarios

### Scenario 1: Typical Employee Day
1. Morning: Clock in with QR code
2. Mid-day: Check schedule for tomorrow
3. Afternoon: Submit edit request (forgot to clock out yesterday)
4. Evening: Clock out
5. Weekly: Review time entries
6. Monthly: Sign monthly report

### Scenario 2: Manager Approval Workflow
1. Receive notification of pending edit request
2. Review request details
3. Verify with employee if needed
4. Approve or reject with comment
5. Generate team report
6. Review team compliance

### Scenario 3: Admin Setup
1. Create new employee account
2. Create new location
3. Generate and print QR code
4. Set up geofence
5. Test location with employee
6. Monitor compliance dashboard

### Scenario 4: Offline Worker
1. Clock in at office with internet
2. Go to remote site (no internet)
3. Clock out offline
4. Work at remote site
5. Clock in offline
6. Return to office
7. Reconnect to internet
8. Verify entries synced

### Scenario 5: Error Recovery
1. Forget to clock out
2. Submit edit request next day
3. Manager approves
4. Verify time entry corrected
5. Sign monthly report
6. Download PDF for records

---

**© 2026 LSLT Group | Developed by John McBride**

*Last Updated: January 2026*

---

**Good luck with testing! Your feedback is crucial to making Torre Tempo the best it can be for LSLT Group staff.**
