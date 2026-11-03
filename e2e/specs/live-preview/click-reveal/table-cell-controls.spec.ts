import { test, expect } from '../../../fixtures/live-preview';
import { END_LINE, activeLineText, clickAtOffset, openAndSettle } from '../../../fixtures/click-reveal';

const SAMPLE = `---
status: todo
---
Above line.

| A | B |
|---|---|
| [[Other]] | \`INPUT[inlineSelect(todo, done):status]\` |

After line.

${END_LINE}
`;

/** Text of the vault file whose path ends with `/${name}`, or `null` when it does not exist. */
async function fileText(page: import('@playwright/test').Page, name: string): Promise<string | null> {
	return page.evaluate((n) => {
		const entry = Object.entries(window.__e2e.fs.dump()).find(([p]) => p.endsWith(`/${n}`));
		return entry ? String(entry[1]) : null;
	}, name);
}

test.describe('Live Preview - click-reveal - table cell controls', () => {
	test('clicking a wikilink inside a table cell follows it and the source note keeps its table', async ({
		lpPage: page,
	}) => {
		await openAndSettle(page, SAMPLE);
		const table = page.locator('table.cm-lp-table');
		const link = table.locator('a.cm-lp-wikilink', { hasText: 'Other' });
		await expect(link).toBeVisible();

		const click = await clickAtOffset(page, link);
		expect(click.hit).toContain('cm-lp-wikilink');

		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Other');
		await expect.poll(() => fileText(page, 'Other.md')).not.toBeNull();

		await page.locator('[role="tab"]', { hasText: 'test' }).click();
		await expect(table).toBeVisible();
		await expect(page.locator('.cm-line').filter({ hasText: '| A | B |' })).toHaveCount(0);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('choosing an option in a table cell select through selectOption (no mouse press) writes the frontmatter and keeps the table rendered', async ({
		lpPage: page,
	}) => {
		await openAndSettle(page, SAMPLE);
		const table = page.locator('table.cm-lp-table');
		const select = table.locator('select.cm-lp-meta-bind-select');
		await expect(select).toHaveValue('todo');

		await select.selectOption('done');

		await expect.poll(() => fileText(page, 'test.md')).toContain('status: done');
		await expect(select).toHaveValue('done');
		await expect(table).toBeVisible();
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('a mouse press on a table cell select focuses it without revealing the table, and Escape keeps its value', async ({
		lpPage: page,
	}) => {
		await openAndSettle(page, SAMPLE);
		const table = page.locator('table.cm-lp-table');
		const select = table.locator('select.cm-lp-meta-bind-select');
		await expect(select).toBeVisible();

		const click = await clickAtOffset(page, select);
		expect(click.hit).toContain('SELECT');
		await expect(select).toBeFocused();

		await page.keyboard.press('Escape');
		await expect(table).toBeVisible();
		await expect(select).toHaveValue('todo');
		expect(await activeLineText(page)).toBe(END_LINE);
	});
});
