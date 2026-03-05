import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile, clickOnLine, clickAway } from '../../fixtures/live-preview';

const CONTENT = `# Tables

Some text before.

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell A1  | Cell A2  | Cell A3  |
| Cell B1  | Cell B2  | Cell B3  |

Plain text at the end.

`;

test.describe('Live Preview - Tables', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
	});

	test('table renders as widget', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('table.cm-lp-table')).toBeVisible();
	});

	test('table has header cells', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		const headers = page.locator('.cm-lp-table th');
		await expect(headers.first()).toContainText('Header 1');
		const count = await headers.count();
		expect(count).toBe(3);
	});

	test('table has body cells', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		const cells = page.locator('.cm-lp-table td');
		await expect(cells.first()).toContainText('Cell A1');
	});

	test('table shows source when cursor inside', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('table.cm-lp-table')).toBeVisible();

		// Click on the table to enter source mode
		await page.locator('table.cm-lp-table').click();
		await page.waitForTimeout(200);

		// Raw markdown lines should be visible
		await expect(page.locator('.cm-line').filter({ hasText: '| Header 1' })).toBeVisible();
	});
});
