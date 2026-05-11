import { test, expect, TEST_VAULT_PATH } from '../fixtures/test-vault';

// Minimal kanban board: 3 lanes, one item in the first lane.
const KANBAN_MARKDOWN = `## To Do

- [ ] Buy milk

## In Progress

## Done
`;

async function seedKanban(page: import('@playwright/test').Page) {
	await page.evaluate(
		({ files }) => window.__e2e.fs.populate(files),
		{ files: { [`${TEST_VAULT_PATH}/Board.kanban`]: KANBAN_MARKDOWN } },
	);
	await page.evaluate(
		({ paths }) => window.__e2e.events.emit('vault-files-changed', { paths }),
		{ paths: [`${TEST_VAULT_PATH}/Board.kanban`] },
	);
	await page.waitForTimeout(200);
}

async function openKanban(page: import('@playwright/test').Page) {
	const item = page.locator('[role="treeitem"]', { hasText: 'Board.kanban' }).first();
	await item.waitFor({ state: 'visible', timeout: 10_000 });
	await item.click();
	await page.waitForTimeout(300);
}

test.describe('Kanban view', () => {
	test('opening a `.kanban` file renders the board (not the markdown editor)', async ({
		vaultPage: page,
	}) => {
		await seedKanban(page);
		await openKanban(page);

		// MarkdownEditor's `.cm-content` is NOT mounted for kanban tabs.
		await expect(page.locator('.cm-content')).toHaveCount(0);
		// All three lane titles render.
		await expect(page.getByText('To Do').first()).toBeVisible();
		await expect(page.getByText('In Progress').first()).toBeVisible();
		await expect(page.getByText('Done').first()).toBeVisible();
		// The lane item is visible.
		await expect(page.getByText('Buy milk').first()).toBeVisible();
	});

	test('the toolbar button toggles kanban ↔ source (markdown) view', async ({
		vaultPage: page,
	}) => {
		await seedKanban(page);
		await openKanban(page);

		await page.getByRole('button', { name: /Switch to source mode/i }).click();
		await expect(page.locator('.cm-content')).toBeVisible();
		await expect(page.locator('.cm-content')).toContainText('Buy milk');

		await page.getByRole('button', { name: /Switch to board view/i }).click();
		await expect(page.locator('.cm-content')).toHaveCount(0);
		await expect(page.getByText('Buy milk').first()).toBeVisible();
	});
});
