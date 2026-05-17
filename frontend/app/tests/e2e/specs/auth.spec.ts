import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('register and login', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="student_id"]', 'E2E_001');
    await page.fill('input[name="name"]', 'E2E User');
    await page.fill('input[name="faculty"]', 'Test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=E2E User')).toBeVisible();
    
    await page.click('button:has-text("Выйти")');
    await expect(page).toHaveURL('/login');
    
    await page.fill('input[name="student_id"]', 'E2E_001');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('invalid login shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="student_id"]', 'INVALID');
    await page.fill('input[name="password"]', 'wrong');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/неверные учётные данные/i')).toBeVisible();
  });
});