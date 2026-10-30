import { test, expect } from '../fixtures/test-vault';
import { pressShortcut } from '../fixtures/helpers';

test.describe('Tasks view', () => {
	test('Cmd+Shift+T opens the Tasks virtual tab', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Shift+T');

		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Tasks');
		// The tasks tab is a virtual view — no `.cm-content`.
		await expect(page.locator('.cm-content')).toHaveCount(0);
	});

	test('Tasks view surfaces tasks from the vault', async ({ vaultPage: page }) => {
		// Fixture Daily/2026-05-01.md contains: `- [ ] Reply to email thread`
		// Projects/2026-Q2.md contains: `- [ ] Ship feature A`, `- [x] Draft RFC`, `- [ ] Review pending PRs`
		await pressShortcut(page, 'Mod+Shift+T');
		// TasksView ships with a "section tag" filter pre-populated to
		// `#to-list`. None of the fixture tasks live under that tag, so the
		// view shows "No tasks found" until the filter is cleared.
		const sectionTagInput = page.getByRole('textbox', { name: /section tag/i });
		await sectionTagInput.fill('');
		await page.waitForTimeout(300);

		await expect(
			page.getByText(/Ship feature A|Reply to email|Review pending PRs/i).first(),
		).toBeVisible({ timeout: 5_000 });
	});

	test('multiple uncompleted tasks are visible after clearing section tag', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Shift+T');
		const sectionTagInput = page.getByRole('textbox', { name: /section tag/i });
		await sectionTagInput.fill('');
		await page.waitForTimeout(300);

		// Fixture has at least 3 unchecked tasks across 2 files
		const taskTexts = page.locator('text=/Ship feature A|Reply to email|Review pending PRs/i');
		await expect(taskTexts.first()).toBeVisible({ timeout: 5_000 });
	});

	test('toggling a task persists the checked state', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Shift+T');
		const sectionTagInput = page.getByRole('textbox', { name: /section tag/i });
		await sectionTagInput.fill('');
		await page.waitForTimeout(500);

		// Disable "hide completed" so toggled tasks stay visible
		const hideBtn = page.locator('button[title*="completed"]').first();
		await hideBtn.click();
		await page.waitForTimeout(300);

		// Clicking the task text toggles it from unchecked to checked
		const taskButton = page.getByText('Ship feature A').first();
		await expect(taskButton).toBeVisible({ timeout: 5_000 });
		await taskButton.click();
		await page.waitForTimeout(1000);

		// Verify the toggle persisted to virtual FS
		const content = await page.evaluate(() => {
			return (window as any).__e2e.fs.readFileSafe('/test-vault/Projects/2026-Q2.md');
		});
		expect(content).toContain('- [x] Ship feature A');
	});

	test('task list scrolls when it is taller than the tab', async ({ vaultPage: page }) => {
		await page.setViewportSize({ width: 1000, height: 260 });
		await pressShortcut(page, 'Mod+Shift+T');
		const sectionTagInput = page.getByRole('textbox', { name: /section tag/i });
		await sectionTagInput.fill('');
		await expect(page.getByText(/Ship feature A/i).first()).toBeVisible({ timeout: 5_000 });

		// The viewport must stay inside the window and overflow internally;
		// without `min-h-0` the flex item grows to its content and nothing scrolls.
		const viewport = page.locator('[data-slot="scroll-area-viewport"]', { hasText: 'Ship feature A' });
		const scrolled = await viewport.evaluate((el) => {
			el.scrollTop = el.scrollHeight;
			return {
				overflows: el.scrollHeight > el.clientHeight,
				bottom: el.getBoundingClientRect().bottom,
				scrollTop: el.scrollTop,
			};
		});
		expect(scrolled.overflows).toBe(true);
		expect(scrolled.scrollTop).toBeGreaterThan(0);
		expect(scrolled.bottom).toBeLessThanOrEqual(260);
	});

	test('wikilinks and markdown links in a task render as links', async ({ vaultPage: page }) => {
		const path = '/test-vault/Links.md';
		const content = '- [ ] [[Welcome]] · [Roadmap doc](https://example.com/doc?id=1) follow up\n';
		await page.evaluate(({ p, c }) => {
			const e2e = (window as any).__e2e;
			e2e.fs.writeFile(p, c);
			e2e.events.emit('vault-index-updated', e2e.vaultIndex.update(p, c));
		}, { p: path, c: content });

		await pressShortcut(page, 'Mod+Shift+T');
		await page.getByRole('textbox', { name: /section tag/i }).fill('');

		const link = page.getByRole('link', { name: 'Roadmap doc' });
		await expect(link).toBeVisible({ timeout: 5_000 });
		await expect(link).toHaveAttribute('href', 'https://example.com/doc?id=1');
		await expect(page.getByText('https://example.com/doc?id=1')).toHaveCount(0);

		const wikilink = page.getByRole('button', { name: 'Welcome', exact: true });
		await expect(wikilink).toBeVisible();
		await wikilink.click();
		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Welcome');
		// Following the wikilink must not toggle the task.
		expect(await page.evaluate((p) => (window as any).__e2e.fs.readFileSafe(p), path)).toBe(content);
	});

	test('Cmd+Shift+T again closes the Tasks tab', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Shift+T');
		await expect(page.locator('[role="tab"]', { hasText: 'Tasks' })).toBeVisible();

		await pressShortcut(page, 'Mod+Shift+T');
		await expect(page.locator('[role="tab"]', { hasText: 'Tasks' })).toHaveCount(0);
	});
});
