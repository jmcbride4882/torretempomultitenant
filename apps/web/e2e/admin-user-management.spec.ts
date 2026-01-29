import { test, expect } from '@playwright/test';
import { testUsers, login, logout } from './fixtures/test-users';

test.describe('Admin User Management', () => {
  test('should view users list', async ({ page }) => {
    // Login as admin
    await login(page, testUsers.admin);
    
    // Navigate to users page
    await page.goto('/app/users');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the users page
    await expect(page.locator('h1').filter({ hasText: /users?/i })).toBeVisible();
    
    // Verify "Add Employee" button is visible
    const addButton = page.locator('button').filter({ hasText: /add employee|add/i }).first();
    await expect(addButton).toBeVisible();
    
    // Verify search bar is visible
    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();
    
    // Logout
    await logout(page);
  });

  test('should open create user form', async ({ page }) => {
    // Login as admin
    await login(page, testUsers.admin);
    
    // Navigate to users page
    await page.goto('/app/users');
    await page.waitForLoadState('networkidle');
    
    // Click "Add Employee" button
    const addButton = page.locator('button').filter({ hasText: /add employee|add/i }).first();
    await addButton.click();
    
    // Wait for form modal to appear
    await page.waitForTimeout(500);
    
    // Verify form is visible
    await expect(page.locator('form')).toBeVisible({ timeout: 5000 });
    
    // Verify required fields are present
    await expect(page.locator('input#firstName, input[id="firstName"]')).toBeVisible();
    await expect(page.locator('input#lastName, input[id="lastName"]')).toBeVisible();
    await expect(page.locator('input#email, input[id="email"]')).toBeVisible();
    await expect(page.locator('input#password, input[id="password"]')).toBeVisible();
    
    // Verify cancel button exists
    const cancelButton = page.locator('button').filter({ hasText: /cancel/i });
    await expect(cancelButton).toBeVisible();
    
    // Close form
    await cancelButton.click();
    
    // Logout
    await logout(page);
  });

  test('should create a new user', async ({ page }) => {
    // Login as admin
    await login(page, testUsers.admin);
    
    // Navigate to users page
    await page.goto('/app/users');
    await page.waitForLoadState('networkidle');
    
    // Click "Add Employee" button
    const addButton = page.locator('button').filter({ hasText: /add employee|add/i }).first();
    await addButton.click();
    
    // Wait for form modal to appear
    await page.waitForTimeout(500);
    
    // Generate unique user data
    const timestamp = Date.now();
    const newUser = {
      firstName: 'Test',
      lastName: `User${timestamp}`,
      email: `testuser${timestamp}@example.com`,
      password: 'Test123!',
      employeeCode: `EMP${timestamp}`,
    };
    
    // Fill in the form
    await page.fill('input#firstName, input[id="firstName"]', newUser.firstName);
    await page.fill('input#lastName, input[id="lastName"]', newUser.lastName);
    await page.fill('input#email, input[id="email"]', newUser.email);
    await page.fill('input#password, input[id="password"]', newUser.password);
    
    // Fill confirm password if it exists
    const confirmPasswordInput = page.locator('input#confirmPassword, input[id="confirmPassword"]');
    if (await confirmPasswordInput.isVisible().catch(() => false)) {
      await confirmPasswordInput.fill(newUser.password);
    }
    
    // Fill employee code if visible
    const employeeCodeInput = page.locator('input#employeeCode, input[id="employeeCode"]');
    if (await employeeCodeInput.isVisible().catch(() => false)) {
      await employeeCodeInput.fill(newUser.employeeCode);
    }
    
    // Submit the form
    const saveButton = page.locator('button[type="submit"]').filter({ hasText: /save/i });
    await saveButton.click();
    
    // Wait for form to close and success message
    await page.waitForTimeout(2000);
    
    // Verify success toast/notification
    const successMessage = page.locator('[role="alert"]').filter({ hasText: /success|created/i });
    await expect(successMessage).toBeVisible({ timeout: 5000 });
    
    // Search for the newly created user
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill(newUser.email);
    await page.waitForTimeout(1000);
    
    // Verify the user appears in the list
    await expect(page.locator('text=' + newUser.email)).toBeVisible({ timeout: 5000 });
    
    // Logout
    await logout(page);
  });

  test('should search for users', async ({ page }) => {
    // Login as admin
    await login(page, testUsers.admin);
    
    // Navigate to users page
    await page.goto('/app/users');
    await page.waitForLoadState('networkidle');
    
    // Get search input
    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();
    
    // Search for a known user (admin)
    await searchInput.fill('admin');
    await page.waitForTimeout(1000);
    
    // Verify results are filtered
    const userRows = page.locator('table tbody tr, .bg-white.rounded-2xl.shadow-sm.border.border-slate-100.p-5');
    const rowCount = await userRows.count();
    
    // Should have at least one result (the admin user)
    expect(rowCount).toBeGreaterThan(0);
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(1000);
    
    // Logout
    await logout(page);
  });

  test('should open edit user form', async ({ page }) => {
    // Login as admin
    await login(page, testUsers.admin);
    
    // Navigate to users page
    await page.goto('/app/users');
    await page.waitForLoadState('networkidle');
    
    // Find the first edit button
    const editButton = page.locator('button').filter({ hasText: /edit/i }).first();
    
    // Check if any users exist to edit
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      
      // Wait for form modal to appear
      await page.waitForTimeout(500);
      
      // Verify form is visible
      await expect(page.locator('form')).toBeVisible({ timeout: 5000 });
      
      // Verify fields are pre-filled
      const firstNameInput = page.locator('input#firstName, input[id="firstName"]');
      await expect(firstNameInput).toBeVisible();
      const firstNameValue = await firstNameInput.inputValue();
      expect(firstNameValue.length).toBeGreaterThan(0);
      
      // Close form
      const cancelButton = page.locator('button').filter({ hasText: /cancel/i });
      await cancelButton.click();
    }
    
    // Logout
    await logout(page);
  });

  test('should show validation errors for invalid user data', async ({ page }) => {
    // Login as admin
    await login(page, testUsers.admin);
    
    // Navigate to users page
    await page.goto('/app/users');
    await page.waitForLoadState('networkidle');
    
    // Click "Add Employee" button
    const addButton = page.locator('button').filter({ hasText: /add employee|add/i }).first();
    await addButton.click();
    
    // Wait for form modal to appear
    await page.waitForTimeout(500);
    
    // Try to submit empty form
    const saveButton = page.locator('button[type="submit"]').filter({ hasText: /save/i });
    await saveButton.click();
    
    // Wait for validation
    await page.waitForTimeout(500);
    
    // Verify form is still visible (validation prevented submission)
    await expect(page.locator('form')).toBeVisible();
    
    // Fill with invalid email
    await page.fill('input#firstName, input[id="firstName"]', 'Test');
    await page.fill('input#lastName, input[id="lastName"]', 'User');
    await page.fill('input#email, input[id="email"]', 'invalid-email');
    await page.fill('input#password, input[id="password"]', 'short');
    
    // Try to submit again
    await saveButton.click();
    await page.waitForTimeout(500);
    
    // Form should still be visible due to validation errors
    await expect(page.locator('form')).toBeVisible();
    
    // Close form
    const cancelButton = page.locator('button').filter({ hasText: /cancel/i });
    await cancelButton.click();
    
    // Logout
    await logout(page);
  });

  test('should display user roles correctly', async ({ page }) => {
    // Login as admin
    await login(page, testUsers.admin);
    
    // Navigate to users page
    await page.goto('/app/users');
    await page.waitForLoadState('networkidle');
    
    // Look for role badges in the users list
    const roleBadges = page.locator('span.rounded-full').filter({ hasText: /employee|manager|admin/i });
    
    // Verify at least one role badge is visible
    const badgeCount = await roleBadges.count();
    expect(badgeCount).toBeGreaterThan(0);
    
    // Logout
    await logout(page);
  });
});
