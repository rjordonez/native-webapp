// tests/e2e/basic-navigation.int.test.ts
import { test, expect } from '@playwright/test';

// This is an extremely simple E2E test that will verify basic navigation works
test('basic navigation test', async ({ page }) => {
  // Navigate to the homepage
  await page.goto('/');
  
  // Verify the page title contains your app name
  await expect(page).toHaveTitle(/class-code-connect/);
  
  // Check that login link exists and is clickable
  // Check that sign in button exists and is clickable
  const signInButton = page.getByRole('button', { name: 'Sign In' });
  await expect(signInButton).toBeVisible();
  
  // Navigate to sign in page
  await signInButton.click();
  
  // Verify we're on the login page
  // Verify we're on the login page
  await expect(page).toHaveURL(/.*login/);
  
  // Check that login form elements exist
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});