import { test, expect, TEST_VAULT_PATH } from '../fixtures/test-vault';

const CANVAS_JSON = JSON.stringify(
	{
		nodes: [
			{ id: 'n1', type: 'text', text: 'Hello canvas', x: 0, y: 0, width: 200, height: 100 },
		],
		edges: [],
	},
	null,
	2,
);

async function seedCanvas(page: import('@playwright/test').Page) {
	await page.evaluate(
		({ files }) => window.__e2e.fs.populate(files),
		{ files: { [`${TEST_VAULT_PATH}/Board.canvas`]: CANVAS_JSON } },
	);
	await page.evaluate(
		({ paths }) => window.__e2e.events.emit('vault-files-changed', { paths }),
		{ paths: [`${TEST_VAULT_PATH}/Board.canvas`] },
	);
	await page.waitForTimeout(600);
}

async function openCanvas(page: import('@playwright/test').Page) {
	const item = page.locator('[role="treeitem"]', { hasText: 'Board.canvas' }).first();
	await item.waitFor({ state: 'visible', timeout: 10_000 });
	await item.click();
	await page.waitForTimeout(600);
}

test.describe('Canvas view', () => {
	test('opening a `.canvas` file renders the canvas view (not the markdown editor)', async ({
		vaultPage: page,
	}) => {
		await seedCanvas(page);
		await openCanvas(page);

		// CanvasView renders SVG nodes; MarkdownEditor's `.cm-content` should
		// NOT be on screen.
		await expect(page.locator('.cm-content')).toHaveCount(0);
		// The active tab should reflect the canvas filename.
		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Board');
	});

	test('the toolbar button toggles canvas ↔ source (JSON) view', async ({ vaultPage: page }) => {
		await seedCanvas(page);
		await openCanvas(page);

		// Click "Switch to source mode" → JSON shows in CodeMirror.
		await page.getByRole('button', { name: /Switch to source mode/i }).click();
		await expect(page.locator('.cm-content')).toBeVisible();
		await expect(page.locator('.cm-content')).toContainText('Hello canvas');

		// Click "Switch to canvas view" → CanvasView returns, .cm-content gone.
		await page.getByRole('button', { name: /Switch to canvas view/i }).click();
		await expect(page.locator('.cm-content')).toHaveCount(0);
	});
});
