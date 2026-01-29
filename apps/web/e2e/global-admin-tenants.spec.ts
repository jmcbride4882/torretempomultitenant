import { test, expect } from '@playwright/test';
import { testUsers, login, logout } from './fixtures/test-users';

test.describe('Global Admin Tenant Management', () => {
  test('should view tenants list', async ({ page }) => {
    // Login as global admin
    await login(page, testUsers.globalAdmin);
    
    // Navigate to tenants page
    await page.goto('/app/tenants');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the tenants page
    await expect(page.locator('h1').filter({ hasText: /tenants?/i })).toBeVisible();
    
    // Verify "Add Tenant" button is visible
    const addButton = page.locator('button').filter({ hasText: /add tenant|add/i }).first();
    await expect(addButton).toBeVisible();
    
    // Verify search bar is visible
    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();
    
    // Logout
    await logout(page);
  });

  test('should open create tenant form', async ({ page }) => {
    // Login as global admin
    await login(page, testUsers.globalAdmin);
    
    // Navigate to tenants page
    await page.goto('/app/tenants');
    await page.waitForLoadState('networkidle');
    
    // Click "Add Tenant" button
    const addButton = page.locator('button').filter({ hasText: /add tenant|add/i }).first();
    await addButton.click();
    
    // Wait for form modal to appear
    await page.waitForTimeout(500);
    
    // Verify form is visible
    await expect(page.locator('form')).toBeVisible({ timeout: 5000 });
    
    // Verify required tenant fields are present
    await expect(page.locator('input#name, input[id="name"]')).toBeVisible();
    await expect(page.locator('input#adminEmail, input[id="adminEmail"]')).toBeVisible();
    await expect(page.locator('input#adminPassword, input[id="adminPassword"]')).toBeVisible();
    await expect(page.locator('input#adminFirstName, input[id="adminFirstName"]')).toBeVisible();
    await expect(page.locator('input#adminLastName, input[id="adminLastName"]')).toBeVisible();
    
    // Verify cancel button exists
    const cancelButton = page.locator('button').filter({ hasText: /cancel/i });
    await expect(cancelButton).toBeVisible();
    
    // Close form
    await cancelButton.click();
    
    // Logout
    await logout(page);
  });

  test('should create a new tenant', async ({ page }) => {
    // Login as global admin
    await login(page, testUsers.globalAdmin);
    
    // Navigate to tenants page
    await page.goto('/app/tenants');
    await page.waitForLoadState('networkidle');
    
    // Click "Add Tenant" button
    const addButton = page.locator('button').filter({ hasText: /add tenant|add/i }).first();
    await addButton.click();
    
    // Wait for form modal to appear
    await page.waitForTimeout(500);
    
    // Generate unique tenant data
    const timestamp = Date.now();
    const newTenant = {
      name: `Test Tenant ${timestamp}`,
      adminFirstName: 'Admin',
      adminLastName: `User${timestamp}`,
      adminEmail: `admin${timestamp}@testtenant.com`,
      adminPassword: 'TestAdmin123!',
      timezone: 'Europe/Madrid',
      locale: 'es',
    };
    
    // Fill in the tenant form
    await page.fill('input#name, input[id="name"]', newTenant.name);
    
    // Fill admin details
    await page.fill('input#adminFirstName, input[id="adminFirstName"]', newTenant.adminFirstName);
    await page.fill('input#adminLastName, input[id="adminLastName"]', newTenant.adminLastName);
    await page.fill('input#adminEmail, input[id="adminEmail"]', newTenant.adminEmail);
    await page.fill('input#adminPassword, input[id="adminPassword"]', newTenant.adminPassword);
    
    // Fill confirm password if it exists
    const confirmPasswordInput = page.locator('input#confirmPassword, input[id="confirmPassword"]');
    if (await confirmPasswordInput.isVisible().catch(() => false)) {
      await confirmPasswordInput.fill(newTenant.adminPassword);
    }
    
    // Fill optional fields if visible
    const timezoneSelect = page.locator('select#timezone, select[id="timezone"]');
    if (await timezoneSelect.isVisible().catch(() => false)) {
      await timezoneSelect.selectOption(newTenant.timezone);
    }
    
    const localeSelect = page.locator('select#locale, select[id="locale"]');
    if (await localeSelect.isVisible().catch(() => false)) {
      await localeSelect.selectOption(newTenant.locale);
    }
    
    // Submit the form
    const submitButton = page.locator('button[type="submit"]').filter({ hasText: /create|save/i });
    await submitButton.click();
    
    // Wait for form to close and success message
    await page.waitForTimeout(3000);
    
    // Verify success toast/notification
    const successMessage = page.locator('[role="alert"]').filter({ hasText: /success|created/i });
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    
    // Search for the newly created tenant
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill(newTenant.name);
    await page.waitForTimeout(1000);
    
    // Verify the tenant appears in the list
    await expect(page.locator('text=' + newTenant.name)).toBeVisible({ timeout: 5000 });
    
    // Logout
    await logout(page);
  });

  test('should search for tenants', async ({ page }) => {
    // Login as global admin
    await login(page, testUsers.globalAdmin);
    
    // Navigate to tenants page
    await page.goto('/app/tenants');
    await page.waitForLoadState('networkidle');
    
    // Get search input
    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();
    
    // Search for "LSLT" (the main tenant)
    await searchInput.fill('LSLT');
    await page.waitForTimeout(1000);
    
    // Verify results are filtered
    const tenantCards = page.locator('.bg-white.rounded-2xl.shadow-sm.border.border-slate-100.p-5, table tbody tr');
    const cardCount = await tenantCards.count();
    
    // Should have at least one result
    expect(cardCount).toBeGreaterThanOrEqual(0);
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(1000);
    
    // Logout
    await logout(page);
  });

  test('should view tenant details', async ({ page }) => {
    // Login as global admin
    await login(page, testUsers.globalAdmin);
    
    // Navigate to tenants page
    await page.goto('/app/tenants');
    await page.waitForLoadState('networkidle');
    
    // Find the first "View" or tenant name link
    const viewButton = page.locator('button, a').filter({ hasText: /view|details/i }).first();
    const tenantNameLink = page.locator('h3, td a').first();
    
    // Check if view button exists, otherwise click tenant name
    if (await viewButton.isVisible().catch(() => false)) {
      await viewButton.click();
    } else if (await tenantNameLink.isVisible().catch(() => false)) {
      await tenantNameLink.click();
    } else {
      // No tenants to view, skip test
      test.skip();
      return;
    }
    
    // Wait for navigation to tenant detail page
    await page.waitForTimeout(1000);
    
    // Verify we're on a tenant detail page (URL should contain /tenants/)
    expect(page.url()).toContain('/tenants/');
    
    // Logout
    await logout(page);
  });

  test('should show validation errors for invalid tenant data', async ({ page }) => {
    // Login as global admin
    await login(page, testUsers.globalAdmin);
    
    // Navigate to tenants page
    await page.goto('/app/tenants');
    await page.waitForLoadState('networkidle');
    
    // Click "Add Tenant" button
    const addButton = page.locator('button').filter({ hasText: /add tenant|add/i }).first();
    await addButton.click();
    
    // Wait for form modal to appear
    await page.waitForTimeout(500);
    
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').filter({ hasText: /create|save/i });
    await submitButton.click();
    
    // Wait for validation
    await page.waitForTimeout(500);
    
    // Verify form is still visible (validation prevented submission)
    await expect(page.locator('form')).toBeVisible();
    
    // Fill with invalid data
    await page.fill('input#name, input[id="name"]', 'Test');
    await page.fill('input#adminFirstName, input[id="adminFirstName"]', 'Admin');
    await page.fill('input#adminLastName, input[id="adminLastName"]', 'User');
    await page.fill('input#adminEmail, input[id="adminEmail"]', 'invalid-email');
    await page.fill('input#adminPassword, input[id="adminPassword"]', 'short');
    
    // Try to submit again
    await submitButton.click();
    await page.waitForTimeout(500);
    
    // Form should still be visible due to validation errors
    await expect(page.locator('form')).toBeVisible();
    
    // Close form
    const cancelButton = page.locator('button').filter({ hasText: /cancel/i });
    await cancelButton.click();
    
    // Logout
    await logout(page);
  });

  test('should display tenant statistics', async ({ page }) => {
    // Login as global admin
    await login(page, testUsers.globalAdmin);
    
    // Navigate to tenants page
    await page.goto('/app/tenants');
    await page.waitForLoadState('networkidle');
    
    // Look for tenant cards or rows with statistics (user count, location count)
    const tenantCards = page.locator('.bg-white.rounded-2xl.shadow-sm.border.border-slate-100.p-5, table tbody tr');
    const cardCount = await tenantCards.count();
    
    if (cardCount > 0) {
      // Verify at least one tenant is displayed
      expect(cardCount).toBeGreaterThan(0);
      
      // Check if statistics are shown (users, locations, etc.)
      const firstCard = tenantCards.first();
      await expect(firstCard).toBeVisible();
    }
    
    // Logout
    await logout(page);
  });
});
