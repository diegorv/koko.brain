import { test, expect } from '../fixtures/test-vault';
import { openFile, pressShortcut } from '../fixtures/helpers';

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
		// view shows "No task sits under a heading containing #to-list" until
		// the filter is cleared.
		const sectionTagInput = page.getByRole('textbox', { name: /section tag/i });
		await sectionTagInput.fill('');

		await expect(page.getByText('Ship feature A')).toBeVisible({ timeout: 5_000 });
		await expect(page.getByText('Reply to email thread')).toBeVisible();
		await expect(page.getByText('Review pending PRs')).toBeVisible();
	});

	test('an in-progress task is listed under Status: open', async ({ vaultPage: page }) => {
		const path = '/test-vault/In Progress.md';
		const content = '- [/] Draft the plan\n- [x] Shipped already\n';
		await page.evaluate(({ p, c }) => {
			const e2e = window.__e2e;
			e2e.fs.writeFile(p, c);
			e2e.events.emit('vault-index-updated', e2e.vaultIndex.update(p, c));
		}, { p: path, c: content });

		await pressShortcut(page, 'Mod+Shift+T');
		await page.getByRole('textbox', { name: /section tag/i }).fill('');

		// The Status menu shows open tasks by default.
		await expect(page.getByRole('button', { name: /^Status/ })).toHaveText('Status: open');
		const row = page.locator('[data-task-row]', { hasText: 'Draft the plan' });
		await expect(row).toBeVisible({ timeout: 5_000 });
		await expect(row.locator('[data-task-toggle]')).toHaveAttribute('data-task-status', 'in-progress');
		await expect(row.getByRole('button', { name: 'Mark task as done: Draft the plan (in progress)' })).toBeVisible();
		await expect(page.getByText('Shipped already')).toHaveCount(0);
	});

	test('toggling a task persists the checked state', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Shift+T');
		const sectionTagInput = page.getByRole('textbox', { name: /section tag/i });
		await sectionTagInput.fill('');

		// Show every status so the toggled task stays visible
		const status = page.getByRole('button', { name: /^Status/ });
		await status.click();
		await page.getByRole('menuitemradio', { name: 'All' }).click();
		await expect(status).toHaveText('Status: all');

		// Clicking the circle in the task's row toggles it from unchecked to checked
		const circle = page
			.locator('[data-task-row]', { hasText: 'Ship feature A' })
			.getByRole('button', { name: /^Mark task as done/ });
		await expect(circle).toBeVisible({ timeout: 5_000 });
		await circle.click();

		// Verify the toggle persisted to virtual FS
		await expect
			.poll(() => page.evaluate(() => (window as any).__e2e.fs.readFileSafe('/test-vault/Projects/2026-Q2.md')))
			.toContain('- [x] Ship feature A');
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

	test('task list keeps its scroll position across a tab switch', async ({ vaultPage: page }) => {
		await page.setViewportSize({ width: 1000, height: 260 });
		await openFile(page, 'Welcome.md');
		await pressShortcut(page, 'Mod+Shift+T');
		await page.getByRole('textbox', { name: /section tag/i }).fill('');
		await expect(page.getByText(/Ship feature A/i).first()).toBeVisible({ timeout: 5_000 });

		const viewport = page.locator('[data-slot="scroll-area-viewport"]', { hasText: 'Ship feature A' });
		await viewport.evaluate((el) => {
			el.scrollTop = el.scrollHeight;
		});
		await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
		// The view saves the offset from its scroll listener; let that event fire.
		await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));

		const tabs = page.locator('.editor-tabs-bar [role="tab"]');
		await tabs.filter({ hasText: 'Welcome' }).click();
		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Welcome');
		await expect(viewport).toHaveCount(0);

		await tabs.filter({ hasText: 'Tasks' }).click();
		await expect(page.getByText(/Ship feature A/i).first()).toBeVisible();
		await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
	});

	test('wikilinks and markdown links in a task render as links', async ({ vaultPage: page }) => {
		const path = '/test-vault/Links.md';
		const content = '- [ ] [[Welcome]] · [Roadmap doc](https://example.com/doc?id=1) follow up\n';
		await page.evaluate(({ p, c }) => {
			const e2e = window.__e2e;
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

	test.describe('with the clock at 2026-11-05', () => {
		test.use({ clockTime: '2026-11-05T12:00:00' });

		test('a narrow pane puts the overdue due chip on a line under the clean text', async ({ vaultPage: page }) => {
			await page.setViewportSize({ width: 500, height: 700 });
			const path = '/test-vault/Rent.md';
			const content = '- [ ] Pay rent 📅 2026-11-03\n';
			await page.evaluate(({ p, c }) => {
				const e2e = window.__e2e;
				e2e.fs.writeFile(p, c);
				e2e.events.emit('vault-index-updated', e2e.vaultIndex.update(p, c));
			}, { p: path, c: content });

			await pressShortcut(page, 'Mod+Shift+T');
			await page.getByRole('textbox', { name: /section tag/i }).fill('');

			const row = page.locator('[data-task-row]', { hasText: 'Pay rent' });
			const text = row.locator('[data-task-text]');
			const due = row.locator('[data-task-chip="due"]');
			await expect(text).toHaveText('Pay rent', { timeout: 5_000 });
			await expect(due).toHaveText('Nov 3');
			await expect(due).toHaveAttribute('data-overdue', '');

			const textBox = (await text.boundingBox())!;
			const dueBox = (await due.boundingBox())!;
			expect(dueBox.y).toBeGreaterThanOrEqual(textBox.y + textBox.height);
		});
	});

	test('the section tag lists tasks under any of several tags', async ({ vaultPage: page }) => {
		const path = '/test-vault/Sections.md';
		const content = '## Inbox #to-list\n- [ ] Listed by to-list\n## Job #work\n- [ ] Listed by work\n## Misc\n- [ ] Never listed\n';
		await page.evaluate(({ p, c }) => {
			const e2e = window.__e2e;
			e2e.fs.writeFile(p, c);
			e2e.events.emit('vault-index-updated', e2e.vaultIndex.update(p, c));
		}, { p: path, c: content });

		await pressShortcut(page, 'Mod+Shift+T');
		await expect(page.getByText('Listed by to-list')).toBeVisible({ timeout: 5_000 });
		await expect(page.getByText('Listed by work')).toHaveCount(0);
		await expect(page.getByText('Never listed')).toHaveCount(0);

		await page.getByRole('textbox', { name: /section tag/i }).fill('#to-list #work');
		await expect(page.getByText('Listed by work')).toBeVisible({ timeout: 5_000 });
		await expect(page.getByText('Listed by to-list')).toBeVisible();
		await expect(page.getByText('Open tasks under headings containing #to-list or #work')).toBeVisible();
		await expect(page.getByText('Never listed')).toHaveCount(0);
	});

	test('the right sidebar hides while the Tasks tab is active and comes back on a note', async ({ vaultPage: page }) => {
		const sidebar = page.locator('[data-right-sidebar]');
		await expect(sidebar).toBeVisible({ timeout: 10_000 });
		const noteTab = page.locator('[role="tab"][aria-selected="true"]');
		const noteName = (await noteTab.textContent())!.trim();

		await pressShortcut(page, 'Mod+Shift+T');
		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Tasks');
		await expect(sidebar).toHaveCount(0);
		// Cmd+B must not flip the saved setting while the sidebar is hidden.
		await pressShortcut(page, 'Mod+B');

		await page.locator('[role="tab"]', { hasText: noteName }).click();
		await expect(sidebar).toBeVisible();
	});

	test('Cmd+Shift+T again closes the Tasks tab', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Shift+T');
		await expect(page.locator('[role="tab"]', { hasText: 'Tasks' })).toBeVisible();

		await pressShortcut(page, 'Mod+Shift+T');
		await expect(page.locator('[role="tab"]', { hasText: 'Tasks' })).toHaveCount(0);
	});
});
