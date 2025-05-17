import { test, expect } from '@playwright/test';

test('rerecord', async ({ page }) => {
  await page.goto('http://localhost:8080/');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('rnordone@usc.edu');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('Student2655');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.locator('div:nth-child(7) > div:nth-child(3) > .inline-flex').first().click();
  await page.getByRole('button', { name: 'Record Again' }).click();
  await page.getByRole('button', { name: 'Stop Recording' }).click();
  await page.getByRole('button', { name: '2' }).click();
  await page.getByRole('button', { name: 'Record Again' }).click();
  await page.getByRole('button', { name: 'Stop Recording' }).click();
  console.log('Setting up dialog handler...');
  page.on('dialog', async dialog => {
    console.log('Dialog appeared with message:', dialog.message());
    await dialog.accept();
    console.log('Dialog accepted');
  });
  console.log('Submitting assignment...');
  await page.getByRole('button', { name: 'Submit Assignment' }).click();
  await page.waitForTimeout(5000);
});