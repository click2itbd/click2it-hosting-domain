import { test, expect } from '@playwright/test';

test.describe('Combined Domain + Hosting Flow', () => {
  test('domain and hosting pages load', async ({ page }) => {
    await page.goto('/domain', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();

    await page.goto('/hosting', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });
});
