import { test, expect } from '@playwright/test';

test.describe('Voting', () => {
  test('user votes and sees results', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="student_id"]', 'VOTE_001');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    await page.click('[data-testid="poll-card"]:first-child');
    await page.click('[data-testid="option-0"]');
    await page.click('button:has-text("Проголосовать")');
    
    await expect(page).toHaveURL(/\/results\//);
    await expect(page.locator('text=/результаты/i')).toBeVisible();
    await expect(page.locator('text=/100.0%/i')).toBeVisible();
  });

  test('cannot vote twice', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="student_id"]', 'VOTE_002');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    await page.click('[data-testid="poll-card"]:first-child');
    await page.click('[data-testid="option-0"]');
    await page.click('button:has-text("Проголосовать")');
    
    await page.goto('/dashboard');
    await page.click('[data-testid="poll-card"]:first-child');
    
    await expect(page.locator('button:has-text("Проголосовать")')).not.toBeVisible();
  });
});