import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import { openAndSettle, clickAtOffset, activeLineText, isRevealed, END_LINE } from '../../../fixtures/click-reveal';

const SAMPLE = `---
status: todo
---
Above line.

Sel \`INPUT[inlineSelect(todo, done):status]\` tail.

${END_LINE}
`;

const SELECT = 'select.cm-lp-meta-bind-select';
const RAW_INPUT = 'INPUT[inlineSelect(todo, done):status]';
const SEL_LINE = 'Sel `INPUT[inlineSelect(todo, done):status]` tail.';
const NOTE_PATH = '/test-vault/test.md';

async function readNote(page: Page): Promise<string> {
	return page.evaluate((p) => window.__e2e.fs.readFile(p), NOTE_PATH);
}

/** Viewport centre of the " tail." text node on the line holding the input, so the click lands on text, not on the widget. */
async function tailTextCenter(page: Page): Promise<{ x: number; y: number }> {
	return page.evaluate(() => {
		const line = [...document.querySelectorAll('.cm-line')].find((l) => (l.textContent ?? '').includes('tail.'));
		if (!line) throw new Error('tailTextCenter: no line holds "tail."');
		const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
		let node = walker.nextNode();
		while (node && !(node.textContent ?? '').includes('tail.')) node = walker.nextNode();
		if (!node) throw new Error('tailTextCenter: no text node holds "tail."');
		const text = node.textContent ?? '';
		const range = document.createRange();
		range.setStart(node, text.indexOf('tail.'));
		range.setEnd(node, text.indexOf('tail.') + 'tail.'.length);
		const r = range.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	});
}

test.describe('Click reveal: meta-bind inline select INPUT[inlineSelect(...)]', () => {
	test('the select zone: choosing "done" through selectOption (no mouse press) writes status, keeps the select rendered, cursor stays on End line', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const select = page.locator(SELECT).first();
		await expect(select).toHaveValue('todo');

		await select.selectOption('done');

		await expect.poll(() => readNote(page)).toMatch(/^status: "?done"?$/m);
		await expect(page.locator(SELECT)).toHaveCount(1);
		await expect(page.locator(SELECT).first()).toHaveValue('done');
		expect(await isRevealed(page, RAW_INPUT)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('the select zone: a mouse press on the select leaves the cursor where it was, Escape keeps the select rendered and the note unchanged', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const select = page.locator(SELECT).first();
		const before = await readNote(page);

		const click = await clickAtOffset(page, select);
		expect(click.hit).toContain('cm-lp-meta-bind-select');
		await page.keyboard.press('Escape');

		await expect(page.locator(SELECT)).toHaveCount(1);
		await expect(page.locator(SELECT).first()).toBeVisible();
		expect(await isRevealed(page, RAW_INPUT)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
		// Past the 2 s body-text auto-save debounce, so an edit that reached the note would be on disk.
		await page.waitForTimeout(2_500);
		expect(await readNote(page)).toBe(before);
	});

	test('the text zone: plain text right of the select reveals the INPUT source on that line', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await expect(page.locator(SELECT)).toHaveCount(1);

		const { x, y } = await tailTextCenter(page);
		const hit = await page.evaluate(([px, py]) => {
			const el = document.elementFromPoint(px, py) as HTMLElement | null;
			return el?.closest('select') ? 'select' : (el?.className ?? el?.tagName ?? 'none');
		}, [x, y] as const);
		expect(hit).not.toBe('select');

		await page.mouse.move(x, y, { steps: 1 });
		await page.mouse.down();
		await page.mouse.up();
		await page.waitForTimeout(150);

		expect(await isRevealed(page, RAW_INPUT)).toBe(true);
		expect(await activeLineText(page)).toBe(SEL_LINE);
	});
});
