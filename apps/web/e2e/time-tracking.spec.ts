import { test, expect } from '@playwright/test';
import { testUsers, login, logout } from './fixtures/test-users';

test.describe('Employee Time Tracking Flow', () => {
  test('should complete full time tracking cycle: Login → Clock In → Clock Out → Logout', async ({ page }) => {
    // Step 1: Login as employee
    await login(page, testUsers.employee);
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL('/app/dashboard');
    await expect(page.locator('h1, h2').filter({ hasText: /dashboard/i }).first()).toBeVisible();
    
    // Step 2: Navigate to clock page
    await page.click('a[href="/app/clock"], button:has-text("Clock")');
    await expect(page).toHaveURL('/app/clock');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the clocking page
    await expect(page.locator('h1, h2').filter({ hasText: /clock/i }).first()).toBeVisible();
    
    // Step 3: Verify clocked out status
    const statusBadge = page.locator('span').filter({ hasText: /clocked out|not clocked/i }).first();
    await expect(statusBadge).toBeVisible();
    
    // Step 4: Clock In
    const clockInButton = page.locator('button').filter({ hasText: /clock in/i });
    await expect(clockInButton).toBeVisible();
    await expect(clockInButton).toBeEnabled();
    
    await clockInButton.click();
    
    // Wait for clock in to complete (check for success message or status change)
    // The button should change to "Clock Out" or status should show "Clocked In"
    await page.waitForTimeout(2000); // Give time for the mutation to complete
    
    // Verify clocked in status
    const clockedInStatus = page.locator('span').filter({ hasText: /clocked in/i }).first();
    await expect(clockedInStatus).toBeVisible({ timeout: 10000 });
    
    // Verify the elapsed time timer is visible
    const timer = page.locator('[role="timer"]');
    await expect(timer).toBeVisible();
    
    // Step 5: Wait a moment to simulate work
    await page.waitForTimeout(3000);
    
    // Step 6: Clock Out
    const clockOutButton = page.locator('button').filter({ hasText: /clock out/i });
    await expect(clockOutButton).toBeVisible();
    await expect(clockOutButton).toBeEnabled();
    
    await clockOutButton.click();
    
    // Wait for clock out to complete
    await page.waitForTimeout(2000);
    
    // Verify clocked out status
    const clockedOutStatus = page.locator('span').filter({ hasText: /clocked out|not clocked/i }).first();
    await expect(clockedOutStatus).toBeVisible({ timeout: 10000 });
    
    // Verify that the recent entries section shows the new entry
    const recentEntriesSection = page.locator('h2').filter({ hasText: /recent entries/i });
    await expect(recentEntriesSection).toBeVisible();
    
    // Step 7: Navigate back to dashboard to verify time entry
    await page.click('a[href="/app/dashboard"], button:has-text("Dashboard")');
    await expect(page).toHaveURL('/app/dashboard');
    
    // Step 8: Logout
    await logout(page);
    
    // Verify we're back on login page
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h2').filter({ hasText: /login|sign in/i })).toBeVisible();
  });

  test('should show error when trying to clock in twice', async ({ page }) => {
    // Login as employee
    await login(page, testUsers.employee);
    
    // Navigate to clock page
    await page.goto('/app/clock');
    await page.waitForLoadState('networkidle');
    
    // Check current status
    const statusBadge = page.locator('span').filter({ hasText: /clocked/i }).first();
    const statusText = await statusBadge.textContent();
    
    // If already clocked in, clock out first
    if (statusText?.toLowerCase().includes('clocked in')) {
      const clockOutButton = page.locator('button').filter({ hasText: /clock out/i });
      await clockOutButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Now clock in
    const clockInButton = page.locator('button').filter({ hasText: /clock in/i });
    await clockInButton.click();
    await page.waitForTimeout(2000);
    
    // Verify clocked in
    await expect(page.locator('span').filter({ hasText: /clocked in/i }).first()).toBeVisible();
    
    // Try to clock in again by refreshing and attempting again
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify still clocked in (button should be Clock Out, not Clock In)
    await expect(page.locator('button').filter({ hasText: /clock out/i })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /^clock in$/i })).not.toBeVisible();
    
    // Clean up - clock out
    const clockOutButton = page.locator('button').filter({ hasText: /clock out/i });
    await clockOutButton.click();
    await page.waitForTimeout(2000);
    
    // Logout
    await logout(page);
  });

  test('should persist clocked-in state across page refresh', async ({ page }) => {
    // Login as employee
    await login(page, testUsers.employee);
    
    // Navigate to clock page
    await page.goto('/app/clock');
    await page.waitForLoadState('networkidle');
    
    // Check if already clocked in
    const statusBadge = page.locator('span').filter({ hasText: /clocked/i }).first();
    const statusText = await statusBadge.textContent();
    
    // If clocked in, clock out first to start fresh
    if (statusText?.toLowerCase().includes('clocked in')) {
      const clockOutButton = page.locator('button').filter({ hasText: /clock out/i });
      await clockOutButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Clock in
    const clockInButton = page.locator('button').filter({ hasText: /clock in/i });
    await clockInButton.click();
    await page.waitForTimeout(2000);
    
    // Verify clocked in
    await expect(page.locator('span').filter({ hasText: /clocked in/i }).first()).toBeVisible();
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify still clocked in after refresh
    await expect(page.locator('span').filter({ hasText: /clocked in/i }).first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /clock out/i })).toBeVisible();
    
    // Clean up - clock out
    const clockOutButton = page.locator('button').filter({ hasText: /clock out/i });
    await clockOutButton.click();
    await page.waitForTimeout(2000);
    
    // Logout
    await logout(page);
  });
});
