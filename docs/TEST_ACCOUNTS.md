# Torre Tempo - Test Account Setup Guide

**Creating Test Accounts for Verification**

This guide provides step-by-step instructions for setting up test accounts and test data for Torre Tempo verification. Follow this guide to prepare the system for LSLT staff testing.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Recommended Test Account Structure](#recommended-test-account-structure)
4. [Step-by-Step Setup](#step-by-step-setup)
5. [Test Data Setup](#test-data-setup)
6. [Security Considerations](#security-considerations)
7. [Account Cleanup](#account-cleanup)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose

Test accounts allow LSLT staff to verify Torre Tempo functionality without affecting production data or real employee records.

### What You'll Create

- **1 Global Admin account** (if not already exists)
- **1 Admin account** for administrative testing
- **2 Manager accounts** for approval workflow testing
- **4-6 Employee accounts** for basic feature testing
- **2-3 Test locations** with QR codes and geofencing
- **Sample schedules** for testing schedule viewing
- **Sample time entries** for testing reports and edits

### Time Required

- **Initial Setup:** 30-45 minutes
- **Test Data Creation:** 15-30 minutes
- **Total:** 1-1.5 hours

---

## Prerequisites

### Before You Begin

1. **Access to Torre Tempo**
   - URL: https://time.lsltgroup.es
   - Global Admin credentials (provided by developer)

2. **Information to Gather**
   - Test user email addresses (can use aliases like test1@lsltgroup.es)
   - Office location address and coordinates
   - QR code printer or display method

3. **Tools Needed**
   - Web browser (Chrome, Firefox, Safari, or Edge)
   - Printer for QR codes (optional)
   - Mobile device for testing QR/geofence

---

## Recommended Test Account Structure

### Account Hierarchy

```
Torre Tempo Test Environment
│
├── Global Admin (system-wide access)
│   └── admin@lsltgroup.es
│
├── Admin (tenant admin)
│   └── test.admin@lsltgroup.es
│
├── Managers (approval workflow)
│   ├── test.manager1@lsltgroup.es (Team A)
│   └── test.manager2@lsltgroup.es (Team B)
│
└── Employees (basic users)
    ├── test.employee1@lsltgroup.es (Team A)
    ├── test.employee2@lsltgroup.es (Team A)
    ├── test.employee3@lsltgroup.es (Team B)
    ├── test.employee4@lsltgroup.es (Team B)
    ├── test.employee5@lsltgroup.es (Team A - for offline testing)
    └── test.employee6@lsltgroup.es (Team B - for mobile testing)
```

### Account Details Template

| Role | Email | Password | First Name | Last Name | Employee Code | Purpose |
|------|-------|----------|------------|-----------|---------------|---------|
| Admin | test.admin@lsltgroup.es | Admin123! | Test | Admin | ADM001 | Admin feature testing |
| Manager | test.manager1@lsltgroup.es | Manager123! | Test | Manager One | MGR001 | Approval workflow (Team A) |
| Manager | test.manager2@lsltgroup.es | Manager123! | Test | Manager Two | MGR002 | Approval workflow (Team B) |
| Employee | test.employee1@lsltgroup.es | Employee123! | Test | Employee One | EMP001 | Basic features (Team A) |
| Employee | test.employee2@lsltgroup.es | Employee123! | Test | Employee Two | EMP002 | Edit requests (Team A) |
| Employee | test.employee3@lsltgroup.es | Employee123! | Test | Employee Three | EMP003 | Basic features (Team B) |
| Employee | test.employee4@lsltgroup.es | Employee123! | Test | Employee Four | EMP004 | Reports testing (Team B) |
| Employee | test.employee5@lsltgroup.es | Employee123! | Test | Employee Five | EMP005 | Offline mode (Team A) |
| Employee | test.employee6@lsltgroup.es | Employee123! | Test | Employee Six | EMP006 | Mobile/PWA (Team B) |

💡 **Tip:** Use consistent password pattern for easy testing. Change to secure passwords for production.

⚠️ **Security:** These are test accounts only. Never use these patterns for real employee accounts.

---

## Step-by-Step Setup

### Step 1: Access Global Admin Account

1. Open browser and go to https://time.lsltgroup.es
2. Log in with Global Admin credentials (provided by developer)
3. Verify you see "Global Admin" badge in top-right corner
4. You should see the Global Admin dashboard

💡 **Note:** If you don't have Global Admin access, contact the developer (info@lsltgroup.es)

---

### Step 2: Create Tenant (If Needed)

**Skip this step if tenant already exists (LSLT Group tenant should already be created)**

1. Go to **Tenants** in navigation menu
2. Click **+ Add Tenant**
3. Fill out form:
   - **Name:** LSLT Group Test
   - **Subdomain:** lslt-test (optional)
   - **Contact Email:** info@lsltgroup.es
4. Click **Create Tenant**
5. Note the Tenant ID for reference

---

### Step 3: Create Admin Account

1. Go to **Users** in navigation menu
2. Click **+ Add User** button
3. Fill out the form:
   - **Email:** test.admin@lsltgroup.es
   - **Password:** Admin123!
   - **First Name:** Test
   - **Last Name:** Admin
   - **Employee Code:** ADM001
   - **Role:** Admin (select from dropdown)
4. Click **Create User**
5. ✅ **Verify:** User appears in user list with "Admin" badge

**Test the Account:**
1. Open new incognito/private browser window
2. Go to https://time.lsltgroup.es
3. Log in with test.admin@lsltgroup.es / Admin123!
4. ✅ **Verify:** Successfully logs in, sees Admin dashboard
5. Close incognito window

---

### Step 4: Create Manager Accounts

**Manager 1 (Team A):**

1. Still logged in as Global Admin or Admin
2. Go to **Users** → **+ Add User**
3. Fill out form:
   - **Email:** test.manager1@lsltgroup.es
   - **Password:** Manager123!
   - **First Name:** Test
   - **Last Name:** Manager One
   - **Employee Code:** MGR001
   - **Role:** Manager
4. Click **Create User**
5. ✅ **Verify:** User appears with "Manager" badge

**Manager 2 (Team B):**

1. Repeat above steps with:
   - **Email:** test.manager2@lsltgroup.es
   - **Password:** Manager123!
   - **First Name:** Test
   - **Last Name:** Manager Two
   - **Employee Code:** MGR002
   - **Role:** Manager
2. Click **Create User**
3. ✅ **Verify:** User appears with "Manager" badge

**Test Manager Accounts:**
1. Open incognito window
2. Log in as test.manager1@lsltgroup.es
3. ✅ **Verify:** Sees Manager dashboard, has Approvals menu
4. Log out and test test.manager2@lsltgroup.es
5. ✅ **Verify:** Both accounts work

---

### Step 5: Create Employee Accounts

**Create 6 Employee Accounts:**

For each employee (1-6), repeat these steps:

1. Go to **Users** → **+ Add User**
2. Fill out form using details from table above:
   - **Email:** test.employee[N]@lsltgroup.es
   - **Password:** Employee123!
   - **First Name:** Test
   - **Last Name:** Employee [Number]
   - **Employee Code:** EMP00[N]
   - **Role:** Employee
3. Click **Create User**
4. ✅ **Verify:** User appears in list

**Quick Reference:**
- test.employee1@lsltgroup.es → Employee One → EMP001
- test.employee2@lsltgroup.es → Employee Two → EMP002
- test.employee3@lsltgroup.es → Employee Three → EMP003
- test.employee4@lsltgroup.es → Employee Four → EMP004
- test.employee5@lsltgroup.es → Employee Five → EMP005
- test.employee6@lsltgroup.es → Employee Six → EMP006

**Test Employee Accounts:**
1. Open incognito window
2. Test login with test.employee1@lsltgroup.es
3. ✅ **Verify:** Sees Employee dashboard, no admin menus
4. Test 1-2 other employee accounts
5. ✅ **Verify:** All accounts work

---

### Step 6: Document Account Credentials

**Create a secure document with all test account credentials:**

```
Torre Tempo Test Accounts
Created: [Date]

ADMIN ACCOUNT:
Email: test.admin@lsltgroup.es
Password: Admin123!
Role: Admin
Purpose: Administrative testing

MANAGER ACCOUNTS:
Email: test.manager1@lsltgroup.es
Password: Manager123!
Role: Manager
Team: A

Email: test.manager2@lsltgroup.es
Password: Manager123!
Role: Manager
Team: B

EMPLOYEE ACCOUNTS:
Email: test.employee1@lsltgroup.es
Password: Employee123!
Role: Employee
Team: A
Purpose: Basic features

Email: test.employee2@lsltgroup.es
Password: Employee123!
Role: Employee
Team: A
Purpose: Edit requests

Email: test.employee3@lsltgroup.es
Password: Employee123!
Role: Employee
Team: B
Purpose: Basic features

Email: test.employee4@lsltgroup.es
Password: Employee123!
Role: Employee
Team: B
Purpose: Reports testing

Email: test.employee5@lsltgroup.es
Password: Employee123!
Role: Employee
Team: A
Purpose: Offline mode testing

Email: test.employee6@lsltgroup.es
Password: Employee123!
Role: Employee
Team: B
Purpose: Mobile/PWA testing
```

⚠️ **Security:** Store this document securely. Share only with authorized testers.

---

## Test Data Setup

### Step 1: Create Test Locations

**Location 1: Main Office**

1. Log in as Admin (test.admin@lsltgroup.es)
2. Go to **Locations** → **+ Add Location**
3. Fill out form:
   - **Name:** LSLT Main Office
   - **Address:** [Your actual office address]
   - **Latitude/Longitude:** Click on map at your office location
   - **Geofence Radius:** 100 meters
   - **QR Enabled:** Yes
   - **Active:** Yes
4. Click **Create Location**
5. ✅ **Verify:** Location appears in list

**Location 2: Warehouse**

1. Click **+ Add Location**
2. Fill out form:
   - **Name:** LSLT Warehouse
   - **Address:** [Warehouse address or use nearby location]
   - **Latitude/Longitude:** Click on map
   - **Geofence Radius:** 150 meters
   - **QR Enabled:** Yes
   - **Active:** Yes
3. Click **Create Location**
4. ✅ **Verify:** Location appears in list

**Location 3: Remote Site (Optional)**

1. Click **+ Add Location**
2. Fill out form:
   - **Name:** LSLT Remote Site
   - **Address:** [Any address for testing]
   - **Latitude/Longitude:** Click on map
   - **Geofence Radius:** 200 meters
   - **QR Enabled:** No (for testing location-only)
   - **Active:** Yes
3. Click **Create Location**

---

### Step 2: Generate and Print QR Codes

**For Main Office:**

1. Go to **Locations** page
2. Find "LSLT Main Office"
3. Click **Generate QR Code** button
4. QR code appears in popup
5. Click **Download QR Code**
6. Save image file (e.g., "main-office-qr.png")
7. **Print QR Code:**
   - Open downloaded image
   - Print on A4 paper
   - Laminate for durability (optional)
   - Post near entrance or time clock area

**For Warehouse:**

1. Repeat above steps for "LSLT Warehouse"
2. Save as "warehouse-qr.png"
3. Print and post at warehouse entrance

💡 **Tip:** For testing, you can also display QR codes on a computer screen and scan with mobile device.

---

### Step 3: Create Sample Schedules (Optional)

**Note:** Schedule creation may require additional setup. If schedule feature is not yet available, skip this step.

**If available:**

1. Go to **Schedules** (if menu exists)
2. Create shifts for test employees:
   - **Morning Shift:** 08:00 - 16:00
   - **Afternoon Shift:** 14:00 - 22:00
   - **Night Shift:** 22:00 - 06:00
3. Assign shifts to test employees for next 2 weeks
4. ✅ **Verify:** Employees can see schedules on dashboard

**If not available:**
- Employees will test without pre-defined schedules
- Focus testing on clock in/out and other features

---

### Step 4: Create Sample Time Entries

**Purpose:** Create some historical time entries for testing reports and edit requests.

**Method 1: Manual Entry (if available)**
1. Log in as Admin
2. Go to **Time Entries** (if available)
3. Create entries for past week for each employee
4. Include various entry types (QR, Geofence, Manual)

**Method 2: Have Employees Clock In/Out**
1. Have each test employee log in
2. Clock in and immediately clock out
3. Repeat 2-3 times to create sample entries
4. This creates realistic test data

**Sample Data to Create:**

For test.employee1@lsltgroup.es:
- Monday: 08:00 - 16:30 (Main Office, QR)
- Tuesday: 08:15 - 16:45 (Main Office, Geofence)
- Wednesday: 08:00 - 16:00 (Main Office, QR)
- Thursday: 08:30 - 17:00 (Main Office, Manual)
- Friday: 08:00 - 15:00 (Main Office, QR)

For test.employee2@lsltgroup.es:
- Monday: 09:00 - 17:00 (Warehouse, QR)
- Tuesday: 09:00 - 17:00 (Warehouse, QR)
- Wednesday: 09:00 - 16:00 (Warehouse, QR) ← Missing clock out (for edit request testing)
- Thursday: 09:00 - 17:00 (Warehouse, QR)
- Friday: 09:00 - 17:00 (Warehouse, QR)

Repeat similar patterns for other employees.

💡 **Tip:** Include some incomplete entries (missing clock out) to test edit request workflow.

---

### Step 5: Create Sample Edit Requests

**Purpose:** Create pending edit requests for managers to practice approval workflow.

1. Log in as test.employee2@lsltgroup.es
2. Go to **My Reports**
3. Find Wednesday entry (missing clock out)
4. Click **Request Edit**
5. Fill out form:
   - **Field to Edit:** Clock Out Time
   - **New Value:** 16:00
   - **Reason:** "Forgot to clock out, left at 4pm"
6. Click **Submit Request**
7. ✅ **Verify:** Request shows as "Pending"

**Create 2-3 more edit requests from different employees:**
- test.employee1: Request to change clock in time
- test.employee3: Request to add break minutes
- test.employee4: Request to change clock out time

This gives managers practice approving/rejecting requests.

---

### Step 6: Verify Test Data

**Check as Admin:**

1. Log in as test.admin@lsltgroup.es
2. Go to **Dashboard**
3. ✅ **Verify:**
   - Total Employees shows correct count (8-10)
   - Pending Approvals shows 3-4 requests
   - Locations shows 2-3 locations
4. Go to **Users**
5. ✅ **Verify:** All test accounts visible
6. Go to **Locations**
7. ✅ **Verify:** All locations visible with QR codes
8. Go to **Approvals**
9. ✅ **Verify:** Pending edit requests visible

**Check as Manager:**

1. Log in as test.manager1@lsltgroup.es
2. Go to **Approvals**
3. ✅ **Verify:** Can see pending requests
4. Go to **Reports**
5. ✅ **Verify:** Can generate team reports

**Check as Employee:**

1. Log in as test.employee1@lsltgroup.es
2. Go to **Dashboard**
3. ✅ **Verify:** Can see own stats
4. Go to **Clock**
5. ✅ **Verify:** Can clock in/out
6. Go to **My Reports**
7. ✅ **Verify:** Can see own time entries

---

## Security Considerations

### Password Security

**Test Passwords:**
- Use consistent pattern for easy testing (e.g., Employee123!)
- Document passwords securely
- Share only with authorized testers

**Production Passwords:**
- Never use test password patterns
- Require strong passwords (min 12 characters)
- Include uppercase, lowercase, numbers, symbols
- Force password change on first login

### Access Control

**During Testing:**
- ✅ Test accounts have appropriate role permissions
- ✅ Employees cannot access admin features
- ✅ Managers cannot access admin features
- ✅ Only admins can create/delete users

**Verify Security:**
1. Log in as Employee
2. Try to access /admin/users URL directly
3. ✅ **Expected:** Access denied or redirect
4. Try to access /admin/locations URL
5. ✅ **Expected:** Access denied or redirect

### Data Privacy

**Test Data:**
- Use fake names (Test Employee One, etc.)
- Use test email addresses (@lsltgroup.es)
- Don't use real employee information
- Don't use real personal data

**GDPR Compliance:**
- Test accounts are not real people
- No personal data collected during testing
- All test data will be deleted after verification

### Account Security

**Best Practices:**
- ✅ Change passwords after testing
- ✅ Deactivate unused test accounts
- ✅ Delete test accounts before production
- ✅ Never share credentials via unsecured channels
- ✅ Use secure document storage for credentials
- ✅ Limit access to test environment

---

## Account Cleanup

### After Testing is Complete

**Step 1: Export Test Data (Optional)**

If you want to keep test results for reference:

1. Log in as Admin
2. Go to **Reports**
3. Generate compliance export for testing period
4. Download and archive
5. This preserves test data for review

**Step 2: Delete Test Time Entries**

1. Log in as Admin
2. Go to **Time Entries** (if available)
3. Delete all test entries
4. Or use database cleanup script (contact developer)

**Step 3: Delete Test Edit Requests**

1. Go to **Approvals**
2. Delete or archive all test requests
3. Or use database cleanup script

**Step 4: Delete Test Locations**

1. Go to **Locations**
2. Delete test locations:
   - LSLT Warehouse (if not real)
   - LSLT Remote Site (if not real)
3. Keep real locations (LSLT Main Office)
4. Update real locations with correct settings

**Step 5: Delete Test User Accounts**

⚠️ **Important:** Only delete accounts that are clearly test accounts!

1. Go to **Users**
2. Delete test accounts:
   - test.employee1@lsltgroup.es through test.employee6@lsltgroup.es
   - test.manager1@lsltgroup.es
   - test.manager2@lsltgroup.es
   - test.admin@lsltgroup.es (if not needed)
3. ✅ **Verify:** Only real employee accounts remain

**Step 6: Create Real User Accounts**

1. Create accounts for real LSLT employees
2. Use real names and email addresses
3. Assign appropriate roles
4. Set strong temporary passwords
5. Send welcome emails with login instructions

**Step 7: Verify Clean System**

1. Log in as Admin
2. Check **Dashboard**
3. ✅ **Verify:**
   - No test accounts visible
   - No test time entries
   - No pending test edit requests
   - Only real locations visible
4. System is ready for production use

---

## Troubleshooting

### Common Setup Issues

#### Can't Create User - Email Already Exists

**Problem:** Error when creating test account

**Solution:**
1. Check if account already exists in user list
2. If exists, delete old account first
3. Or use different email address (test.employee1a@lsltgroup.es)

#### Can't Log In with Test Account

**Problem:** Login fails with correct credentials

**Solution:**
1. Verify account is Active (not deactivated)
2. Check password is exactly as set (case-sensitive)
3. Try password reset flow
4. Check browser console for errors
5. Try different browser

#### QR Code Won't Generate

**Problem:** Generate QR Code button doesn't work

**Solution:**
1. Verify location is saved correctly
2. Refresh the page
3. Try different browser
4. Check browser console for errors
5. Contact developer if persists

#### Geofence Not Working

**Problem:** Can't clock in with location services

**Solution:**
1. Verify location coordinates are correct on map
2. Check geofence radius is reasonable (100-200m)
3. Ensure location is Active
4. Test with mobile device at actual location
5. Increase radius if GPS accuracy is poor

#### Can't Create Location

**Problem:** Error when creating location

**Solution:**
1. Verify all required fields filled
2. Check coordinates are valid (latitude/longitude)
3. Ensure location name is unique
4. Try clicking on map to set coordinates
5. Check browser console for errors

#### Test Data Not Appearing

**Problem:** Created time entries don't show up

**Solution:**
1. Refresh the page
2. Check you're logged in as correct user
3. Verify entries were saved (check database)
4. Check date filters on reports page
5. Contact developer if data is missing

---

## Quick Setup Checklist

Use this checklist to track your setup progress:

### Accounts
- [ ] Global Admin account verified
- [ ] Admin account created (test.admin@lsltgroup.es)
- [ ] Manager 1 created (test.manager1@lsltgroup.es)
- [ ] Manager 2 created (test.manager2@lsltgroup.es)
- [ ] Employee 1 created (test.employee1@lsltgroup.es)
- [ ] Employee 2 created (test.employee2@lsltgroup.es)
- [ ] Employee 3 created (test.employee3@lsltgroup.es)
- [ ] Employee 4 created (test.employee4@lsltgroup.es)
- [ ] Employee 5 created (test.employee5@lsltgroup.es)
- [ ] Employee 6 created (test.employee6@lsltgroup.es)
- [ ] All accounts tested (login successful)

### Locations
- [ ] Main Office location created
- [ ] Warehouse location created
- [ ] Remote Site location created (optional)
- [ ] QR code generated for Main Office
- [ ] QR code generated for Warehouse
- [ ] QR codes printed/displayed
- [ ] Geofence tested at Main Office

### Test Data
- [ ] Sample time entries created
- [ ] Sample edit requests created
- [ ] Sample schedules created (if available)
- [ ] Test data verified by Admin
- [ ] Test data verified by Manager
- [ ] Test data verified by Employee

### Documentation
- [ ] Account credentials documented
- [ ] Credentials shared with testers
- [ ] QR codes posted at locations
- [ ] Testing instructions distributed
- [ ] Support contact information shared

### Verification
- [ ] All accounts can log in
- [ ] All roles have correct permissions
- [ ] Locations appear correctly
- [ ] QR codes scan successfully
- [ ] Geofence works at test location
- [ ] Edit requests visible to managers
- [ ] Reports generate correctly
- [ ] System ready for testing

---

## Distribution to Testers

### What to Send to Each Tester

**Email Template:**

```
Subject: Torre Tempo Testing - Your Test Account

Hi [Tester Name],

You've been selected to help test Torre Tempo, our new staff clocking system.

YOUR TEST ACCOUNT:
Email: [test account email]
Password: [test account password]
Role: [Employee/Manager/Admin]

ACCESS:
URL: https://time.lsltgroup.es
Browser: Chrome, Firefox, Safari, or Edge
Mobile: Works on iOS and Android

TESTING DOCUMENTS:
1. VERIFICATION_GUIDE.md - Complete testing instructions
2. USER_GUIDE.md - Feature documentation
3. QUICK_REFERENCE.md - Quick reference card

YOUR TESTING FOCUS:
[Specific features or scenarios for this tester]

TESTING TIMELINE:
Start: [Date]
End: [Date]
Duration: 1-2 weeks

SUPPORT:
Email: info@lsltgroup.es
Subject: "Torre Tempo Testing - [Your Issue]"

IMPORTANT:
- This is a TEST account - not your real employee account
- Test data will be deleted after verification
- Report any issues you find
- Test daily if possible

Thank you for helping make Torre Tempo better!

Best regards,
[Your Name]
LSLT IT Team
```

---

## Contact Information

### Setup Support

**Email:** info@lsltgroup.es  
**Subject:** Torre Tempo Test Account Setup

### Developer Contact

**Name:** John McBride  
**Email:** info@lsltgroup.es

### Testing Coordinator

**Email:** info@lsltgroup.es  
**Subject:** Torre Tempo Verification

---

## Appendix: Advanced Setup

### Using Email Aliases

If your email provider supports aliases (Gmail, Outlook):

**Gmail:**
- test.employee1@lsltgroup.es → test.employee1+1@lsltgroup.es
- All emails go to same inbox
- Useful for testing without multiple email accounts

**Outlook:**
- Similar alias support
- Check with your email administrator

### Database Seeding Script

For faster setup, ask developer for database seeding script:

```bash
# Example (developer will provide actual script)
npm run seed:test-accounts
```

This automatically creates all test accounts and sample data.

### Automated Testing Accounts

For continuous testing, consider keeping permanent test accounts:
- test.employee@lsltgroup.es (permanent test employee)
- test.manager@lsltgroup.es (permanent test manager)
- test.admin@lsltgroup.es (permanent test admin)

These can be used for:
- Regression testing after updates
- Training new staff
- Demonstrating features
- Troubleshooting issues

---

**© 2026 LSLT Group | Developed by John McBride**

*Last Updated: January 2026*

---

**You're now ready to set up test accounts for Torre Tempo verification. Follow the steps carefully and don't hesitate to contact support if you need help!**
