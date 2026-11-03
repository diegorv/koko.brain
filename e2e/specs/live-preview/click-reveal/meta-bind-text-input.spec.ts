import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import { openAndSettle, clickAtOffset, activeLineText, isRevealed, END_LINE } from '../../../fixtures/click-reveal';

const SAMPLE = `---
count: 3
---
Above line.

Num \`INPUT[number():count]\` tail.

${END_LINE}
`;

const INPUT = '.cm-lp-meta-bind-input';
const RAW_INPUT = 'INPUT[';
const NOTE_PATH = '/test-vault/test.md';

async function readNote(page: Page): Promise<string> {
	return page.evaluate((p) => window.__e2e.fs.readFile(p), NOTE_PATH);
}

test.describe('Click reveal: meta-bind number/date input', () => {
	test('clicking the input focuses it, keeps it rendered and leaves the cursor where it was', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const input = page.locator(INPUT).first();

		const click = await clickAtOffset(page, input);
		expect(click.hit).toContain('cm-lp-meta-bind-input');
		await expect(input).toBeFocused();
		await expect(input).toBeVisible();
		expect(await isRevealed(page, RAW_INPUT)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('Backspace edits the input, not the note; typing and Enter update count and keep the input rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const before = await readNote(page);
		const input = page.locator(INPUT).first();

		const click = await clickAtOffset(page, input);
		expect(click.hit).toContain('cm-lp-meta-bind-input');
		await expect(input).toBeFocused();

		await page.keyboard.press('End');
		await page.keyboard.press('Backspace');
		await expect(input).toHaveValue('');
		expect(await readNote(page)).toBe(before);
		expect(await activeLineText(page)).toBe(END_LINE);

		await page.keyboard.type('7');
		await page.keyboard.press('Enter');
		// The write may quote the value (`count: "7"`); the click behaviour under test does not depend on it.
		await expect.poll(() => readNote(page)).toMatch(/count: "?7"?\n/);
		await expect(page.locator(INPUT).first()).toHaveValue('7');
		await expect(page.locator(INPUT).first()).toBeVisible();
		expect(await isRevealed(page, RAW_INPUT)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});
});
