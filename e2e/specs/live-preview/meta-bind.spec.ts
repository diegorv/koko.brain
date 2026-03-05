import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile, clickOnLine, clickAway } from '../../fixtures/live-preview';

// --- Inline Select Tests ---

const INPUT_CONTENT = `---
status: todo
rating: 2
---

# Meta-Bind Inputs

Simple syntax: \`INPUT[inlineSelect(todo, doing, done):status]\`

Option syntax: \`INPUT[inlineSelect(option(1,bad), option(2,ok), option(3,good)):rating]\`

Plain text at the end.

`;

test.describe('Live Preview - Meta-Bind Inline Select', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', INPUT_CONTENT);
	});

	test('inline select renders as dropdown when cursor is away', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-meta-bind-select').first()).toBeVisible();
	});

	test('dropdown reflects current frontmatter value', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		const select = page.locator('.cm-lp-meta-bind-select').first();
		await expect(select).toHaveValue('todo');
	});

	test('shows source markdown when cursor is inside', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-meta-bind-select').first()).toBeVisible();

		// Click on the select to move cursor into the INPUT field
		await clickOnLine(page, 'Simple syntax');
		await page.waitForTimeout(200);

		// Source markdown should be visible
		await expect(page.locator('.cm-line').filter({ hasText: 'INPUT[inlineSelect' })).toBeVisible();
	});

	test('simple comma-separated syntax renders dropdown', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		// First select is the simple syntax one
		const selects = page.locator('.cm-lp-meta-bind-select');
		const firstSelect = selects.first();
		await expect(firstSelect).toBeVisible();

		// Should have the 3 simple options + placeholder
		const options = firstSelect.locator('option');
		const count = await options.count();
		expect(count).toBeGreaterThanOrEqual(3);
	});

	test('option() wrapper syntax renders dropdown', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		const selects = page.locator('.cm-lp-meta-bind-select');
		const count = await selects.count();
		expect(count).toBeGreaterThanOrEqual(2);

		// Second select uses option() syntax and should have value "2" from frontmatter
		const secondSelect = selects.nth(1);
		await expect(secondSelect).toHaveValue('2');
	});

	test('multiple selects render independently', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		const selects = page.locator('.cm-lp-meta-bind-select');
		const count = await selects.count();
		expect(count).toBeGreaterThanOrEqual(2);
	});
});

// --- Button Block Tests ---

const BUTTON_CONTENT = `---
status: todo
---

# Meta-Bind Buttons

\`\`\`meta-bind-button
label: Mark as Done
style: primary
actions:
  - type: updateMetadata
    prop: status
    value: done
\`\`\`

\`\`\`meta-bind-button
label: Reset Status
style: destructive
actions:
  - type: updateMetadata
    bindTarget: status
    value: todo
\`\`\`

\`\`\`meta-bind-button
label: Default Button
style: default
actions:
  - type: updateMetadata
    prop: status
    value: doing
\`\`\`

\`\`\`meta-bind-button
label: Plain Button
style: plain
actions:
  - type: updateMetadata
    prop: status
    value: doing
\`\`\`

\`\`\`meta-bind-button
label: Broken button
invalid yaml content
  - missing structure
\`\`\`

Plain text at the end.

`;

test.describe('Live Preview - Meta-Bind Button Block', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', BUTTON_CONTENT);
	});

	test('button block renders as interactive button', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Meta-Bind Buttons');
		await expect(page.locator('.cm-lp-meta-bind-btn').first()).toBeVisible();
	});

	test('button shows correct label text', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-meta-bind-btn').first()).toContainText('Mark as Done');
	});

	test('button has correct style class', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-meta-bind-btn-primary').first()).toBeVisible();
	});

	test('button hides when cursor moves to its line', async ({ lpPage: page }) => {
		// First verify button is visible when cursor is away
		await clickOnLine(page, 'Meta-Bind Buttons');
		const buttons = page.locator('.cm-lp-meta-bind-btn');
		const initialCount = await buttons.count();
		expect(initialCount).toBeGreaterThanOrEqual(1);

		// Click directly on the first button's underlying cm-line (via arrow keys)
		// The widget uses ignoreEvent()=true, so we click just above it
		const container = page.locator('.cm-lp-meta-bind-button-container').first();
		const box = await container.boundingBox();
		if (box) {
			// Click just above the button container to place cursor on that line
			await page.mouse.click(box.x + 5, box.y - 2);
			await page.waitForTimeout(200);
		}

		// When cursor enters the block, source YAML should appear
		// At minimum, the count of rendered buttons should decrease
		const afterCount = await buttons.count();
		expect(afterCount).toBeLessThan(initialCount);
	});

	test('all button styles render', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-meta-bind-btn-primary')).toBeAttached();
		await expect(page.locator('.cm-lp-meta-bind-btn-destructive')).toBeAttached();
		await expect(page.locator('.cm-lp-meta-bind-btn-default')).toBeAttached();
		await expect(page.locator('.cm-lp-meta-bind-btn-plain')).toBeAttached();
	});

	test('invalid YAML shows error widget', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-meta-bind-button-error')).toBeAttached();
		await expect(page.locator('.cm-lp-meta-bind-button-error')).toContainText('Invalid button');
	});

	test('prop alias works in button config', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		// First button uses `prop: status` — should render as button, not error
		const firstButton = page.locator('.cm-lp-meta-bind-btn').first();
		await expect(firstButton).toBeVisible();
		await expect(firstButton).toContainText('Mark as Done');
	});
});
