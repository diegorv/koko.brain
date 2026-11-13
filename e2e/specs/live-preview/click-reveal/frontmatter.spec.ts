// Click and keyboard behavior around the frontmatter block, which live preview always hides.
import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import {
	openAndSettle,
	clickAtOffset,
	activeLineText,
	isRevealed,
	editorSelection,
} from '../../../fixtures/click-reveal';
import { editorDoc } from '../../../fixtures/auto-organize';

const SAMPLE = '---\nstatus: todo\n---\nFirst body line.\n\nAfter line.\n\nEnd line.\n';
const BODY_START = SAMPLE.indexOf('First body line.');
const FIRST_BODY_LINE = 'First body line.';
const FRONTMATTER_SOURCE = 'status: todo';
const HIDDEN_FRONTMATTER_LINES = 3;
const HIDDEN_LINE = '.cm-line.cm-lp-hidden-line';

test.describe('Live Preview - click reveal - frontmatter', () => {
	test('clicking the 16px padding above the first body line moves the cursor there and keeps the frontmatter hidden', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const firstBody = page.locator('.cm-line').filter({ hasText: FIRST_BODY_LINE }).first();
		await expect(firstBody).toHaveText(FIRST_BODY_LINE);

		const click = await clickAtOffset(page, firstBody, { from: 'top', dy: -8 });
		expect(click.hit).toContain('cm-content');

		await expect.poll(() => activeLineText(page)).toBe(FIRST_BODY_LINE);
		await expect(page.locator(HIDDEN_LINE)).toHaveCount(HIDDEN_FRONTMATTER_LINES);
		expect(await isRevealed(page, FRONTMATTER_SOURCE)).toBe(false);
		await expect(firstBody).toHaveText(FIRST_BODY_LINE);
	});

	test('clicking the top edge of the first body line moves the cursor there and keeps the frontmatter hidden', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const firstBody = page.locator('.cm-line').filter({ hasText: FIRST_BODY_LINE }).first();
		await expect(firstBody).toHaveText(FIRST_BODY_LINE);

		const click = await clickAtOffset(page, firstBody, { from: 'top', dy: 1 });
		expect(click.hitLine).toBe(FIRST_BODY_LINE);

		await expect.poll(() => activeLineText(page)).toBe(FIRST_BODY_LINE);
		await expect(page.locator(HIDDEN_LINE)).toHaveCount(HIDDEN_FRONTMATTER_LINES);
		expect(await isRevealed(page, FRONTMATTER_SOURCE)).toBe(false);
		await expect(firstBody).toHaveText(FIRST_BODY_LINE);
	});

	test('Enter after a click in the padding above the first body line keeps the frontmatter hidden', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const firstBody = page.locator('.cm-line').filter({ hasText: FIRST_BODY_LINE }).first();
		await clickAtOffset(page, firstBody, { from: 'top', dy: -8 });
		await page.keyboard.press('Enter');

		await expect(firstBody).toHaveClass(/cm-activeLine/);
		await expect(page.locator(HIDDEN_LINE)).toHaveCount(HIDDEN_FRONTMATTER_LINES);
		expect(await isRevealed(page, FRONTMATTER_SOURCE)).toBe(false);
		const visible = await page.locator('.cm-line:not(.cm-lp-hidden-line)').allTextContents();
		expect(visible.slice(0, 2)).toEqual(['', FIRST_BODY_LINE]);
	});

	for (const key of ['ArrowUp', 'ControlOrMeta+Home']) {
		test(`${key} from the first body line keeps the cursor on that line and the frontmatter hidden`, async ({ lpPage: page }) => {
			await putCursorOnFirstBodyLine(page);

			await page.keyboard.press(key);
			await expect.poll(() => activeLineText(page)).toBe(FIRST_BODY_LINE);
			await expect(page.locator(`${HIDDEN_LINE}.cm-activeLine`)).toHaveCount(0);
			await expectFrontmatterHiddenAndIntact(page);
			expect(await editorDoc(page)).toBe(SAMPLE);
		});
	}

	test('ArrowUp, Backspace, then typing starts the first body line and leaves the frontmatter intact', async ({ lpPage: page }) => {
		await putCursorOnFirstBodyLine(page);

		await page.keyboard.press('ArrowUp');
		await page.keyboard.press('Backspace');
		// Chromium types into the first visible line even from a caret on a
		// hidden line, so the caret itself is checked before typing.
		expect(await editorSelection(page)).toEqual({ from: BODY_START, to: BODY_START, text: '' });
		await page.keyboard.type('x');
		await expect.poll(() => activeLineText(page)).toBe(`x${FIRST_BODY_LINE}`);
		await expectFrontmatterHiddenAndIntact(page);
		expect(await editorDoc(page)).toBe(SAMPLE.replace(FIRST_BODY_LINE, `x${FIRST_BODY_LINE}`));
	});

	test('Alt+ArrowUp on the first body line leaves it and the frontmatter unchanged', async ({ lpPage: page }) => {
		await putCursorOnFirstBodyLine(page);

		await page.keyboard.press('Alt+ArrowUp');
		await expect.poll(() => activeLineText(page)).toBe(FIRST_BODY_LINE);
		await expectFrontmatterHiddenAndIntact(page);
		expect(await editorDoc(page)).toBe(SAMPLE);
	});
});

/** Opens the sample and puts the cursor inside the first body line. */
async function putCursorOnFirstBodyLine(page: Page): Promise<void> {
	await openAndSettle(page, SAMPLE);
	const firstBody = page.locator('.cm-line').filter({ hasText: FIRST_BODY_LINE }).first();
	await clickAtOffset(page, firstBody, { from: 'left', dx: 30 });
	await expect.poll(() => activeLineText(page)).toBe(FIRST_BODY_LINE);
}

/** All three frontmatter lines are still hidden, and none shows its source. */
async function expectFrontmatterHiddenAndIntact(page: Page): Promise<void> {
	await expect(page.locator(HIDDEN_LINE)).toHaveCount(HIDDEN_FRONTMATTER_LINES);
	expect(await isRevealed(page, FRONTMATTER_SOURCE)).toBe(false);
}
