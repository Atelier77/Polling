import { test, expect } from '@playwright/test';

test.describe('Poll CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="student_id"]', '777');
    await page.fill('input[name="password"]', 'admin_pass');
    await page.click('button[type="submit"]');
  });

  test('admin creates poll', async ({ page }) => {
    await page.click('button:has-text("Создать опрос")');
    await page.fill('input[name="title"]', 'E2E Poll');
    await page.fill('textarea[name="description"]', 'E2E test');
    await page.fill('input[name="end_date"]', '2027-12-31');
    await page.fill('input[name="options[0]"]', 'Option 1');
    await page.fill('input[name="options[1]"]', 'Option 2');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=E2E Poll')).toBeVisible();
  });

  test('poll requires 2+ options', async ({ page }) => {
    await page.click('button:has-text("Создать опрос")');
    await page.fill('input[name="title"]', 'Invalid');
    await page.fill('input[name="end_date"]', '2027-12-31');
    await page.fill('input[name="options[0]"]', 'Only one');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/минимум 2 варианта/i')).toBeVisible();
  });
});