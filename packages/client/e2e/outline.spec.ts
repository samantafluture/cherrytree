import { test, expect, type Page } from '@playwright/test';

function uniqueUser() {
  const ts = Date.now();
  return {
    email: `outline-${ts}@test.local`,
    username: `outline${ts}`,
    password: 'TestPass123!',
  };
}

async function registerAndLogin(page: Page) {
  const user = uniqueUser();
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByPlaceholder('Email').fill(user.email);
  await page.getByPlaceholder('Username').fill(user.username);
  await page.getByPlaceholder('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign up' }).first().click();
  await expect(page.getByRole('button', { name: 'New outline' })).toBeVisible({ timeout: 10_000 });
}

const outlineItem = (page: Page) =>
  page.locator('[class*="itemTitle"]');

test.describe('Outlines', () => {
  test('create an outline', async ({ page }) => {
    await registerAndLogin(page);

    await page.getByRole('button', { name: 'New outline' }).click();

    // A new outline item should appear in the list
    await expect(outlineItem(page).first()).toBeVisible({ timeout: 5_000 });
    await expect(outlineItem(page).first()).toHaveText('My Outline');
  });

  test('delete an outline (verifies Content-Type bug fix)', async ({ page }) => {
    await registerAndLogin(page);

    // Create an outline first
    await page.getByRole('button', { name: 'New outline' }).click();
    await expect(outlineItem(page).first()).toBeVisible({ timeout: 5_000 });

    // Delete it — the bug was that DELETE requests sent Content-Type: application/json
    // even without a body, causing Fastify to reject them
    await page.getByLabel('Delete outline').click();

    // The outline should no longer be in the list
    await expect(outlineItem(page)).toHaveCount(0, { timeout: 5_000 });

    // Verify it persists after refresh
    await page.reload();
    await expect(page.getByRole('button', { name: 'New outline' })).toBeVisible({ timeout: 10_000 });
    await expect(outlineItem(page)).toHaveCount(0, { timeout: 5_000 });
  });

  test('edit outline title (verifies title persistence fix)', async ({ page }) => {
    await registerAndLogin(page);

    // Create and open an outline
    await page.getByRole('button', { name: 'New outline' }).click();
    await outlineItem(page).first().click();

    // Wait for outline view to load
    await expect(page.getByRole('button', { name: 'Add item' })).toBeVisible({
      timeout: 5_000,
    });

    // Edit the title using the contentEditable h1
    const titleEl = page.locator('h1[contenteditable="true"]');
    await expect(titleEl).toBeVisible();

    const newTitle = `Renamed Outline ${Date.now()}`;
    await titleEl.evaluate(
      (el, title) => {
        el.textContent = title;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      },
      newTitle,
    );

    // Wait for debounced save
    await page.waitForTimeout(2_000);

    // Go back to outline list
    await page.getByRole('button', { name: 'Back' }).click();

    // The updated title should be visible
    await expect(page.getByText(newTitle)).toBeVisible({ timeout: 5_000 });
  });

  test('verify title persists after page refresh', async ({ page }) => {
    await registerAndLogin(page);

    // Create an outline
    await page.getByRole('button', { name: 'New outline' }).click();

    // Open it and change the title
    await outlineItem(page).first().click();
    await expect(page.getByRole('button', { name: 'Add item' })).toBeVisible({
      timeout: 5_000,
    });

    const titleEl = page.locator('h1[contenteditable="true"]');
    const persistTitle = `Persist Test ${Date.now()}`;
    await titleEl.evaluate(
      (el, title) => {
        el.textContent = title;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      },
      persistTitle,
    );

    // Wait for save
    await page.waitForTimeout(2_000);

    // Refresh page — goes back to outline list (state is in-memory)
    await page.reload();
    await expect(page.getByRole('button', { name: 'New outline' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(persistTitle)).toBeVisible({ timeout: 5_000 });
  });
});
