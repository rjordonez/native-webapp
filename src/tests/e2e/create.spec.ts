import { test, expect } from '@playwright/test';

test('create', async ({ page }) => {
  await page.goto('http://localhost:8080/');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('appa@gmail.com');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Create Assignment' }).click();
  await page.getByRole('textbox', { name: 'Assignment Title' }).click();
  await page.getByRole('textbox', { name: 'Assignment Title' }).fill('assignment-123');
  await page.getByRole('textbox', { name: 'Due Date' }).fill('2025-07-31');
  await page.getByRole('button').filter({ hasText: /^$/ }).nth(2).click();
  await page.getByRole('button').filter({ hasText: /^$/ }).nth(2).click();
  await page.getByRole('button', { name: 'Save & Assign' }).click();
},);