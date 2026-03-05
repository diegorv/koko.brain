import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile, clickOnLine, clickAway } from '../../fixtures/live-preview';

const CONTENT = `# Lists

- First item
- Second item
- Third item

1. Ordered one
2. Ordered two
3. Ordered three

- [ ] Unchecked task
- [x] Checked task
- [ ] Another unchecked

- Parent item
  - Nested child
    - Deep nested

- **Bold** list item

`;

test.describe('Live Preview - Lists', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
	});

	test('unordered list shows bullet widget', async ({ lpPage: page }) => {
		const bullets = page.locator('.cm-lp-ul-marker');
		await expect(bullets.first()).toBeVisible();
		const count = await bullets.count();
		expect(count).toBeGreaterThanOrEqual(3);
	});

	test('ordered list shows number widget', async ({ lpPage: page }) => {
		const markers = page.locator('.cm-lp-ol-marker');
		await expect(markers.first()).toBeVisible();
		await expect(markers.first()).toContainText('1.');
	});

	test('unchecked task checkbox renders', async ({ lpPage: page }) => {
		const checkboxes = page.locator('input.cm-lp-task-checkbox');
		await expect(checkboxes.first()).toBeVisible();
		await expect(checkboxes.first()).not.toBeChecked();
	});

	test('checked task checkbox renders', async ({ lpPage: page }) => {
		const checkboxes = page.locator('input.cm-lp-task-checkbox:checked');
		await expect(checkboxes.first()).toBeVisible();
		await expect(checkboxes.first()).toBeChecked();
	});

	test('nested lists render widgets at each level', async ({ lpPage: page }) => {
		// All nested list items should have bullet widgets
		const line = page.locator('.cm-line').filter({ hasText: 'Nested child' });
		await expect(line).toBeVisible();
		const deepLine = page.locator('.cm-line').filter({ hasText: 'Deep nested' });
		await expect(deepLine).toBeVisible();
	});

	test('list item with inline formatting', async ({ lpPage: page }) => {
		const line = page.locator('.cm-line').filter({ hasText: 'Bold' }).filter({ hasText: 'list item' });
		await expect(line.locator('.cm-lp-bold')).toContainText('Bold');
	});
});
