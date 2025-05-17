import { test, expect } from '@playwright/test';
test.setTimeout(60_000);

test('recording', async ({ page, context }) => {
  console.log('Starting test with microphone permissions...');
  await context.grantPermissions(['microphone'], { origin: 'http://localhost:8080' });
  console.log('Microphone permissions granted');

  console.log('Navigating to homepage...');
  await page.goto('http://localhost:8080/');
  console.log('Clicking Sign In button...');
  await page.getByRole('button', { name: 'Sign In' }).click();
  console.log('Filling in email...');
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('rnordone@usc.edu');
  console.log('Filling in password...');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('Student2655');
  console.log('Submitting login form...');
  await page.getByRole('button', { name: 'Sign in' }).click();

  console.log('Looking for assignment card...');
  const assignmentCard = page
    .locator('div[data-lov-name="Card"]')
    .filter({ has: page.locator('h3', { hasText: 'assignment-123' }) })
    .filter({ hasText: 'Not Started' })
    .first();

  console.log('Waiting for assignment card to be visible...');
  await expect(assignmentCard).toBeVisible({ timeout: 10000 });
  console.log('Clicking Start Assignment button...');
  await assignmentCard
    .getByRole('button', { name: 'Start Assignment' })
    .click();

  console.log('Starting first recording...');
  await page.getByRole('button', { name: 'Start Recording' }).click();
  console.log('Stopping first recording...');
  await page.getByRole('button', { name: 'Stop Recording' }).click();
  console.log('Moving to next question...');
  await page.getByRole('button', { name: 'Next' }).click();
  
  console.log('Starting second recording...');
  await page.getByRole('button', { name: 'Start Recording' }).click();
  console.log('Stopping second recording...');
  await page.getByRole('button', { name: 'Stop Recording' }).click();
  console.log('Recording again...');
  await page.getByRole('button', { name: 'Record Again' }).click();
  console.log('Stopping final recording...');
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
  console.log('Test completed successfully');
});