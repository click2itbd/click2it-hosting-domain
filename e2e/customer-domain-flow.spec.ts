import { test, expect } from '@playwright/test';

test.describe('Customer Domain Flow', () => {
  test('domain page loads and renders search UI', async ({ page }) => {
    await page.goto('/domain', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).toBeVisible();
    const hasInput = await page.locator('input').count() > 0;
    expect(hasInput).toBe(true);
  });

  test('hosting page loads', async ({ page }) => {
    await page.goto('/hosting', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).toBeVisible();
  });

  test('checkout page loads', async ({ page }) => {
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).toBeVisible();
  });
});
