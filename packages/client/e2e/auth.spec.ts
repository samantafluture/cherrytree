import { test, expect } from '@playwright/test';

function uniqueUser() {
  const ts = Date.now();
  return {
    email: `user-${ts}@test.local`,
    username: `user${ts}`,
    password: 'TestPass123!',
  };
}

test.describe('Auth', () => {
  test('register a new user', async ({ page }) => {
    const user = uniqueUser();

    await page.goto('/');

    // Auth form starts in login mode; switch to register
    await page.getByRole('button', { name: 'Sign up' }).click();

    await page.getByPlaceholder('Email').fill(user.email);
    await page.getByPlaceholder('Username').fill(user.username);
    await page.getByPlaceholder('Password').fill(user.password);
    await page.getByRole('button', { name: 'Sign up' }).first().click();

    // After registration, we should see the outline list
    await expect(page.getByText('My Outlines')).toBeVisible({ timeout: 10_000 });
  });

  test('login with credentials', async ({ page }) => {
    const user = uniqueUser();

    // First register
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign up' }).click();
    await page.getByPlaceholder('Email').fill(user.email);
    await page.getByPlaceholder('Username').fill(user.username);
    await page.getByPlaceholder('Password').fill(user.password);
    await page.getByRole('button', { name: 'Sign up' }).first().click();
    await expect(page.getByText('My Outlines')).toBeVisible({ timeout: 10_000 });

    // Log out
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page.getByText('Welcome back')).toBeVisible({ timeout: 5_000 });

    // Log in with same credentials
    await page.getByPlaceholder('Email').fill(user.email);
    await page.getByPlaceholder('Password').fill(user.password);
    await page.getByRole('button', { name: 'Log in' }).first().click();

    await expect(page.getByText('My Outlines')).toBeVisible({ timeout: 10_000 });
  });

  test('logout', async ({ page }) => {
    const user = uniqueUser();

    // Register first
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign up' }).click();
    await page.getByPlaceholder('Email').fill(user.email);
    await page.getByPlaceholder('Username').fill(user.username);
    await page.getByPlaceholder('Password').fill(user.password);
    await page.getByRole('button', { name: 'Sign up' }).first().click();
    await expect(page.getByText('My Outlines')).toBeVisible({ timeout: 10_000 });

    // Log out
    await page.getByRole('button', { name: 'Log out' }).click();

    // Should see the login form again
    await expect(page.getByText('Welcome back')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder('Email')).toBeVisible();
  });
});
