import { test, expect } from '@playwright/test';
import { testUsers, login, logout } from './fixtures/test-users';

test.describe('Manager Approval Workflow', () => {
  test('should view pending edit requests', async ({ page }) => {
    // Login as manager
    await login(page, testUsers.manager);
    
    // Navigate to approvals page
    await page.goto('/app/approvals');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the approvals page
    await expect(page.locator('h1').filter({ hasText: /approvals?/i })).toBeVisible();
    
    // Verify PENDING filter is selected by default
    const pendingButton = page.locator('button').filter({ hasText: /pending/i });
    await expect(pendingButton).toHaveClass(/bg-blue-600|text-white/);
    
    // Check if there are any pending requests (or no requests message)
    const noRequestsMessage = page.locator('div').filter({ hasText: /no requests?/i });
    const requestCards = page.locator('.bg-white.rounded-lg.shadow-md.p-6');
    
    // Either we have requests or a "no requests" message
    const hasRequests = await requestCards.count() > 0;
    const hasNoRequestsMessage = await noRequestsMessage.isVisible().catch(() => false);
    
    expect(hasRequests || hasNoRequestsMessage).toBeTruthy();
    
    // Logout
    await logout(page);
  });

  test('should filter edit requests by status', async ({ page }) => {
    // Login as manager
    await login(page, testUsers.manager);
    
    // Navigate to approvals page
    await page.goto('/app/approvals');
    await page.waitForLoadState('networkidle');
    
    // Click on APPROVED filter
    const approvedButton = page.locator('button').filter({ hasText: /approved/i }).first();
    await approvedButton.click();
    await page.waitForTimeout(1000);
    
    // Verify APPROVED button is now active
    await expect(approvedButton).toHaveClass(/bg-blue-600|text-white/);
    
    // Click on REJECTED filter
    const rejectedButton = page.locator('button').filter({ hasText: /rejected/i }).first();
    await rejectedButton.click();
    await page.waitForTimeout(1000);
    
    // Verify REJECTED button is now active
    await expect(rejectedButton).toHaveClass(/bg-blue-600|text-white/);
    
    // Go back to PENDING
    const pendingButton = page.locator('button').filter({ hasText: /pending/i }).first();
    await pendingButton.click();
    await page.waitForTimeout(1000);
    
    // Verify PENDING button is now active
    await expect(pendingButton).toHaveClass(/bg-blue-600|text-white/);
    
    // Logout
    await logout(page);
  });

  test('should approve an edit request when available', async ({ page }) => {
    // Login as manager
    await login(page, testUsers.manager);
    
    // Navigate to approvals page
    await page.goto('/app/approvals');
    await page.waitForLoadState('networkidle');
    
    // Ensure we're on PENDING filter
    const pendingButton = page.locator('button').filter({ hasText: /pending/i }).first();
    await pendingButton.click();
    await page.waitForTimeout(1000);
    
    // Check if there are any pending requests
    const requestCards = page.locator('.bg-white.rounded-lg.shadow-md.p-6');
    const requestCount = await requestCards.count();
    
    if (requestCount === 0) {
      // Skip test if no pending requests
      test.skip();
      return;
    }
    
    // Get the first pending request
    const firstRequest = requestCards.first();
    
    // Verify approve and reject buttons are visible
    const approveButton = firstRequest.locator('button').filter({ hasText: /approve/i });
    const rejectButton = firstRequest.locator('button').filter({ hasText: /reject/i });
    
    await expect(approveButton).toBeVisible();
    await expect(rejectButton).toBeVisible();
    
    // Optionally add a review comment
    const reviewTextarea = firstRequest.locator('textarea');
    if (await reviewTextarea.isVisible()) {
      await reviewTextarea.fill('Test approval: Looks good');
    }
    
    // Click approve button
    await approveButton.click();
    
    // Handle confirmation dialog
    page.on('dialog', dialog => dialog.accept());
    
    // Wait for the mutation to complete
    await page.waitForTimeout(2000);
    
    // Verify the request is no longer in pending (either disappeared or moved to approved)
    // Switch to APPROVED filter to verify
    const approvedButton = page.locator('button').filter({ hasText: /approved/i }).first();
    await approvedButton.click();
    await page.waitForTimeout(1000);
    
    // The approved request should appear in the APPROVED filter
    const approvedRequests = page.locator('.bg-white.rounded-lg.shadow-md.p-6');
    await expect(approvedRequests.first()).toBeVisible({ timeout: 5000 });
    
    // Logout
    await logout(page);
  });

  test('should reject an edit request when available', async ({ page }) => {
    // Login as manager
    await login(page, testUsers.manager);
    
    // Navigate to approvals page
    await page.goto('/app/approvals');
    await page.waitForLoadState('networkidle');
    
    // Ensure we're on PENDING filter
    const pendingButton = page.locator('button').filter({ hasText: /pending/i }).first();
    await pendingButton.click();
    await page.waitForTimeout(1000);
    
    // Check if there are any pending requests
    const requestCards = page.locator('.bg-white.rounded-lg.shadow-md.p-6');
    const requestCount = await requestCards.count();
    
    if (requestCount === 0) {
      // Skip test if no pending requests
      test.skip();
      return;
    }
    
    // Get the first pending request
    const firstRequest = requestCards.first();
    
    // Add a review comment
    const reviewTextarea = firstRequest.locator('textarea');
    if (await reviewTextarea.isVisible()) {
      await reviewTextarea.fill('Test rejection: Need more information');
    }
    
    // Click reject button
    const rejectButton = firstRequest.locator('button').filter({ hasText: /reject/i });
    await rejectButton.click();
    
    // Handle confirmation dialog
    page.on('dialog', dialog => dialog.accept());
    
    // Wait for the mutation to complete
    await page.waitForTimeout(2000);
    
    // Switch to REJECTED filter to verify
    const rejectedButton = page.locator('button').filter({ hasText: /rejected/i }).first();
    await rejectedButton.click();
    await page.waitForTimeout(1000);
    
    // The rejected request should appear in the REJECTED filter
    const rejectedRequests = page.locator('.bg-white.rounded-lg.shadow-md.p-6');
    await expect(rejectedRequests.first()).toBeVisible({ timeout: 5000 });
    
    // Logout
    await logout(page);
  });

  test('should show edit request details correctly', async ({ page }) => {
    // Login as manager
    await login(page, testUsers.manager);
    
    // Navigate to approvals page
    await page.goto('/app/approvals');
    await page.waitForLoadState('networkidle');
    
    // Check all status filters to find any request
    for (const status of ['PENDING', 'APPROVED', 'REJECTED']) {
      const filterButton = page.locator('button').filter({ hasText: new RegExp(status, 'i') }).first();
      await filterButton.click();
      await page.waitForTimeout(1000);
      
      const requestCards = page.locator('.bg-white.rounded-lg.shadow-md.p-6');
      const requestCount = await requestCards.count();
      
      if (requestCount > 0) {
        const firstRequest = requestCards.first();
        
        // Verify request shows employee name/email
        await expect(firstRequest.locator('h3')).toBeVisible();
        await expect(firstRequest.locator('p.text-sm.text-gray-600').first()).toBeVisible();
        
        // Verify status badge is visible
        const statusBadge = firstRequest.locator('span.rounded-full');
        await expect(statusBadge).toBeVisible();
        
        // Verify time entry info is visible
        await expect(firstRequest.locator('text=/Clock In|clockIn/i').first()).toBeVisible();
        
        // Test passed if we found at least one request
        break;
      }
    }
    
    // Logout
    await logout(page);
  });
});
