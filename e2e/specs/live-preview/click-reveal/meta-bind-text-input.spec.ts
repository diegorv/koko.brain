import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import {
	openAndSettle,
	clickAtOffset,
	clickTextInLine,
	activeLineText,
	isRevealed,
	END_LINE,
} from '../../../fixtures/click-reveal';

const SAMPLE = `---
count: 3
---
Above line.

Num \`INPUT[number():count]\` tail.

${END_LINE}
`;

const DATE_SAMPLE = `---
due: 2026-01-02
---
Above line.

Due \`INPUT[date():due]\` tail.

${END_LINE}
`;

// `slider` is not a supported INPUT type and has no options, so the plugin draws no widget.
const UNKNOWN_LINE = 'Odd `INPUT[slider():count]` tail.';
const UNKNOWN_SAMPLE = `---
count: 3
---
Above line.

${UNKNOWN_LINE}

${END_LINE}
`;

/** Past the 2 s body-text auto-save debounce, so an edit that reached the note would be on disk. */
const BODY_SAVE_SETTLE_MS = 2_500;

const INPUT = '.cm-lp-meta-bind-input';
const RAW_INPUT = 'INPUT[';
const NOTE_PATH = '/test-vault/test.md';

async function readNote(page: Page): Promise<string> {
	return page.evaluate((p) => window.__e2e.fs.readFile(p), NOTE_PATH);
}

test.describe('Click reveal: meta-bind number and date inputs, unknown INPUT type', () => {
	test('clicking the number input focuses it, keeps it rendered and leaves the cursor where it was', async ({ lpPage: page }) => {
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
		await page.waitForTimeout(BODY_SAVE_SETTLE_MS);
		expect(await readNote(page)).toBe(before);
		expect(await activeLineText(page)).toBe(END_LINE);

		await page.keyboard.type('7');
		await page.keyboard.press('Enter');
		await expect.poll(() => readNote(page)).toMatch(/count: 7\n/);
		await expect(page.locator(INPUT).first()).toHaveValue('7');
		await expect(page.locator(INPUT).first()).toBeVisible();
		expect(await isRevealed(page, RAW_INPUT)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('clicking the date input focuses it, keeps it rendered and leaves the cursor where it was', async ({ lpPage: page }) => {
		await openAndSettle(page, DATE_SAMPLE);
		const input = page.locator(INPUT).first();
		await expect(input).toHaveAttribute('type', 'date');
		await expect(input).toHaveValue('2026-01-02');

		const click = await clickAtOffset(page, input, { from: 'left', dx: 12 });
		expect(click.hit).toContain('cm-lp-meta-bind-input');
		await expect(input).toBeFocused();
		await expect(input).toBeVisible();
		expect(await isRevealed(page, RAW_INPUT)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('a new date in the clicked date input is written to due and the input stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, DATE_SAMPLE);
		const input = page.locator(INPUT).first();
		await clickAtOffset(page, input, { from: 'left', dx: 12 });
		await expect(input).toBeFocused();

		await input.fill('2026-12-25');
		await page.keyboard.press('Enter');

		await expect.poll(() => readNote(page)).toMatch(/^due: "?2026-12-25"?$/m);
		await expect(page.locator(INPUT).first()).toHaveValue('2026-12-25');
		expect(await isRevealed(page, RAW_INPUT)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('an unknown INPUT type shows its raw source, and a click on it moves the cursor there and shows the backticks', async ({ lpPage: page }) => {
		await openAndSettle(page, UNKNOWN_SAMPLE);
		await expect(page.locator(INPUT)).toHaveCount(0);
		const line = page.locator('.cm-line', { hasText: 'Odd' }).first();
		await expect(line).toHaveText('Odd INPUT[slider():count] tail.');

		await clickTextInLine(page, line, 'slider');

		await expect.poll(() => activeLineText(page)).toBe(UNKNOWN_LINE);
		expect(await isRevealed(page, '`INPUT[slider():count]`')).toBe(true);
		await expect(page.locator(INPUT)).toHaveCount(0);
	});
});
