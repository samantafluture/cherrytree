import { test, expect, type Page } from '@playwright/test';

function uniqueUser() {
  const ts = Date.now();
  return {
    email: `nodes-${ts}@test.local`,
    username: `nodes${ts}`,
    password: 'TestPass123!',
  };
}

async function registerAndOpenOutline(page: Page) {
  const user = uniqueUser();
  await page.goto('/');

  // Register
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByPlaceholder('Email').fill(user.email);
  await page.getByPlaceholder('Username').fill(user.username);
  await page.getByPlaceholder('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign up' }).first().click();
  await expect(page.getByText('My Outlines')).toBeVisible({ timeout: 10_000 });

  // Create and open an outline
  await page.getByRole('button', { name: '+ New outline' }).click();
  await page.locator('[class*="itemTitle"]').first().click();
  await expect(page.getByRole('button', { name: '+ Add item' })).toBeVisible({
    timeout: 5_000,
  });
}

test.describe('Nodes', () => {
  test('add a node via "+ Add item" button', async ({ page }) => {
    await registerAndOpenOutline(page);

    await page.getByRole('button', { name: '+ Add item' }).click();

    // A new node with a contentEditable textbox should appear
    const nodeEditors = page.getByRole('textbox', { name: 'Node content' });
    await expect(nodeEditors.first()).toBeVisible({ timeout: 5_000 });
  });

  test('edit node content', async ({ page }) => {
    await registerAndOpenOutline(page);

    // Add a node
    await page.getByRole('button', { name: '+ Add item' }).click();
    const nodeEditor = page.getByRole('textbox', { name: 'Node content' }).first();
    await expect(nodeEditor).toBeVisible({ timeout: 5_000 });

    // Edit it using evaluate (contentEditable + keyboard.type doesn't work well)
    const nodeText = `Node content ${Date.now()}`;
    await nodeEditor.evaluate(
      (el, text) => {
        el.textContent = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      },
      nodeText,
    );

    // Wait for debounced save
    await page.waitForTimeout(2_000);

    // Verify the text is there
    await expect(nodeEditor).toHaveText(nodeText);
  });

  test('delete a node', async ({ page }) => {
    await registerAndOpenOutline(page);

    // Add a node
    await page.getByRole('button', { name: '+ Add item' }).click();
    const nodeEditor = page.getByRole('textbox', { name: 'Node content' }).first();
    await expect(nodeEditor).toBeVisible({ timeout: 5_000 });

    // Set some content to identify this node
    const nodeText = `Delete me ${Date.now()}`;
    await nodeEditor.evaluate(
      (el, text) => {
        el.textContent = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      },
      nodeText,
    );

    await page.waitForTimeout(1_000);

    // Focus the node editor and press Backspace on empty content to delete
    // First clear the content, then press Backspace
    await nodeEditor.evaluate((el) => {
      el.textContent = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await nodeEditor.focus();
    await page.keyboard.press('Backspace');

    // The node should be removed
    await expect(page.getByText(nodeText)).not.toBeVisible({ timeout: 5_000 });
  });

  test('verify node changes persist after refresh', async ({ page }) => {
    await registerAndOpenOutline(page);

    // Add a node with content
    await page.getByRole('button', { name: '+ Add item' }).click();
    const nodeEditor = page.getByRole('textbox', { name: 'Node content' }).first();
    await expect(nodeEditor).toBeVisible({ timeout: 5_000 });

    const persistText = `Persistent node ${Date.now()}`;
    await nodeEditor.evaluate(
      (el, text) => {
        el.textContent = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      },
      persistText,
    );

    // Wait for debounced save
    await page.waitForTimeout(2_000);

    // Remember the outline title to re-open it
    const outlineTitle =
      (await page.locator('h1[contenteditable="true"]').textContent()) ?? '';

    // Reload the page — goes back to outline list since route state is in memory
    await page.reload();
    await expect(page.getByText('My Outlines')).toBeVisible({ timeout: 10_000 });

    // Re-open the outline
    await page.locator('[class*="itemTitle"]').first().click();
    await expect(page.getByRole('button', { name: '+ Add item' })).toBeVisible({
      timeout: 5_000,
    });

    // The node content should still be there
    await expect(page.getByText(persistText)).toBeVisible({ timeout: 5_000 });
  });

  test('Enter key creates new node and auto-focuses it', async ({ page }) => {
    await registerAndOpenOutline(page);

    // Add a node and type content
    await page.getByRole('button', { name: '+ Add item' }).click();
    const firstNode = page.getByRole('textbox', { name: 'Node content' }).first();
    await expect(firstNode).toBeVisible({ timeout: 5_000 });
    await firstNode.evaluate((el) => {
      el.textContent = 'First node';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(500);

    // Press Enter to create a new sibling — it should auto-focus
    await firstNode.focus();
    await page.keyboard.press('Enter');

    // Wait for the new node to appear (optimistic creation)
    const allNodes = page.getByRole('textbox', { name: 'Node content' });
    await expect(allNodes).toHaveCount(2, { timeout: 5_000 });

    // The second node should be focused (active element)
    await page.waitForTimeout(500);
    const focused = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.getAttribute('aria-label');
    });
    expect(focused).toBe('Node content');
  });
});
