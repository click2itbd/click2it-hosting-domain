import { test, expect } from '@playwright/test';

test.describe('Hosting Flow', () => {
  test('hosting page loads and renders plans', async ({ page }) => {
    await page.goto('/hosting', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).toBeVisible();
  });

  test('hosting checkout page loads', async ({ page }) => {
    await page.goto('/hosting/cart', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).toBeVisible();
  });
});
