import { test, expect } from '../../../fixtures/live-preview';
import { openAndSettle, clickAtOffset, activeLineText, isRevealed, END_LINE } from '../../../fixtures/click-reveal';

const SAMPLE = `---
flag: false
---
Above line.

Tog \`INPUT[toggle():flag]\` tail.

${END_LINE}
`;

const NOTE_PATH = '/test-vault/test.md';

test.describe('Click reveal: meta-bind toggle INPUT[toggle()]', () => {
	test('the checkbox zone: click toggles flag, keeps the widget rendered, cursor stays off the line', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);

		const checkbox = page.locator('input.cm-lp-meta-bind-toggle-input');
		await expect(checkbox).toHaveCount(1);
		await expect(checkbox).not.toBeChecked();

		const click = await clickAtOffset(page, checkbox);
		expect(click.hit).toContain('cm-lp-meta-bind-toggle-input');

		await expect(checkbox).toBeChecked();
		await expect(checkbox).toHaveCount(1);
		expect(await isRevealed(page, 'INPUT[toggle():flag]')).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);

		// Value type is checked in the test below; here only that the click wrote it.
		await expect
			.poll(() => page.evaluate((p) => window.__e2e.fs.readFile(p), NOTE_PATH))
			.toMatch(/^flag: "?true"?$/m);
	});

	test('the checkbox zone: click writes flag as a YAML boolean', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);

		const checkbox = page.locator('input.cm-lp-meta-bind-toggle-input');
		const click = await clickAtOffset(page, checkbox);
		expect(click.hit).toContain('cm-lp-meta-bind-toggle-input');
		await expect(checkbox).toBeChecked();

		await expect
			.poll(() => page.evaluate((p) => window.__e2e.fs.readFile(p), NOTE_PATH))
			.toMatch(/^flag: true$/m);
	});
});
