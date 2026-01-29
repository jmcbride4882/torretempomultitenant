import { Page } from '@playwright/test';

/**
 * Test user credentials for E2E tests
 * These users should exist in the test database
 */
export const testUsers = {
  employee: {
    email: 'john@lsltgroup.es',
    password: 'Test123!',
    role: 'EMPLOYEE',
  },
  manager: {
    email: 'manager@lsltgroup.es',
    password: 'Test123!',
    role: 'MANAGER',
  },
  admin: {
    email: 'admin@lsltgroup.es',
    password: 'Test123!',
    role: 'ADMIN',
  },
  globalAdmin: {
    email: 'info@lsltgroup.es',
    password: 'Test123!',
    role: 'GLOBAL_ADMIN',
  },
};

/**
 * Helper function to log in a user
 */
export async function login(page: Page, user: typeof testUsers.employee) {
  // Navigate to login page
  await page.goto('/login');
  
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  // Fill in credentials
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  
  // Click submit button
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard
  await page.waitForURL('/app/dashboard', { timeout: 10000 });
  
  // Wait for dashboard to be loaded
  await page.waitForLoadState('networkidle');
}

/**
 * Helper function to log out
 */
export async function logout(page: Page) {
  // On desktop, click the logout button in the header
  const logoutButton = page.locator('button[title*="Logout"], button[title*="logout"]').first();
  
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  } else {
    // On mobile, open menu first
    const mobileMenuButton = page.locator('button:has(svg)').filter({ hasText: '' }).first();
    await mobileMenuButton.click();
    
    // Wait for mobile menu to open
    await page.waitForTimeout(300);
    
    // Click logout in mobile menu
    await page.click('button:has-text("Logout"), button:has-text("logout")');
  }
  
  // Wait for redirect to login page
  await page.waitForURL('/login', { timeout: 5000 });
}

/**
 * Helper function to navigate using bottom nav (mobile) or top nav (desktop)
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

/**
 * Helper function to wait for a toast/notification message
 */
export async function waitForToast(page: Page, message?: string) {
  if (message) {
    await page.waitForSelector(`text=${message}`, { timeout: 5000 });
  } else {
    // Wait for any toast-like element
    await page.waitForSelector('[role="alert"], .toast, [class*="notification"]', { timeout: 5000 });
  }
}

/**
 * Helper function to fill a form field by label
 */
export async function fillFieldByLabel(page: Page, label: string, value: string) {
  const labelElement = page.locator(`label:has-text("${label}")`);
  const inputId = await labelElement.getAttribute('for');
  
  if (inputId) {
    await page.fill(`#${inputId}`, value);
  } else {
    // If no 'for' attribute, find the input within or after the label
    const input = labelElement.locator('~ input, input').first();
    await input.fill(value);
  }
}
