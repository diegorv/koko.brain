import type { Page, Locator } from '@playwright/test';
import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile, clickOnLine } from '../../fixtures/live-preview';
import { clickAtOffset, activeLineText } from '../../fixtures/click-reveal';

// A frontmatter write rewrites lines that live preview hides (0 px) above the
// viewport. CodeMirror drops their measured heights and re-estimates them at
// the default line height. Its own scroll anchor makes up for that only when
// no other view update lands before the next measure; a focus change inside
// the editor (pressing a widget control) flushes one, and the text on screen
// slides down by the re-estimated height. The measure is each element's y
// inside `.cm-scroller`, not `scrollTop`: keeping the text still moves `scrollTop`.

const HEADING = 'Tue 03 Nov 2026';
const ANCHOR = 'Anchor line.';

const FRONTMATTER = `---
title: Day
mood: ok
water: "1"
flag: false
count: 3
sleep: "7"
steps: "1000"
energy: mid
focus: mid
weather: sun
place: home
food: ok
notes: none
---`;

const CONTROLS = `Water \`INPUT[inlineSelect(1, 2, 3):water]\` tail.

Flag \`INPUT[toggle():flag]\` tail.

Count \`INPUT[number():count]\` tail.

${ANCHOR}`;

const filler = (n: number) => Array.from({ length: n }, (_, i) => `Filler paragraph ${i + 1}.\n`).join('\n');

/** Heading at the top, the controls far below it, and room below them so the view is not clamped at the end. */
const LONG_NOTE = `${FRONTMATTER}
# ${HEADING}

${filler(300)}
${CONTROLS}

${filler(10)}`;

/** Short enough that the controls are on screen at `scrollTop` 0. */
const SHORT_NOTE = `${FRONTMATTER}
# ${HEADING}

${CONTROLS}

${filler(30)}`;

const SELECT = 'select.cm-lp-meta-bind-select';
const TOGGLE = 'input.cm-lp-meta-bind-toggle-input';
const NUMBER = 'input.cm-lp-meta-bind-input';

/** The CodeMirror document, read through the DOM back-reference (the spec cannot import the page's modules). */
async function editorDoc(page: Page): Promise<string> {
	return page.evaluate(() => {
		const content = document.querySelector('.cm-content') as
			| (Element & { cmTile?: { root?: { view?: { state: { doc: { toString(): string } } } } } })
			| null;
		const view = content?.cmTile?.root?.view;
		if (!view) throw new Error('No CodeMirror view behind .cm-content');
		return view.state.doc.toString();
	});
}

/** Top of `locator`'s first element relative to the top of `.cm-scroller`, in px. */
async function screenY(locator: Locator): Promise<number> {
	return locator.first().evaluate((el) => {
		const scroller = el.closest('.cm-scroller') ?? document.querySelector('.cm-scroller');
		if (!scroller) throw new Error('screenY: no .cm-scroller');
		return el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
	});
}

async function scrollTop(page: Page): Promise<number> {
	return page.locator('.cm-scroller').evaluate((el) => el.scrollTop);
}

/** Two animation frames and a pause past the 150 ms scroll debounce, so CodeMirror has measured and redrawn. */
async function settle(page: Page): Promise<void> {
	await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
	await page.waitForTimeout(300);
}

/**
 * Picks `value` the way a native picker delivers it: the picker runs modally,
 * so the focus the press gave the select and the option's change event reach
 * the page together once it closes. Playwright's `selectOption` sends the
 * change alone and misses the focus update the write races with.
 */
async function pickOption(select: Locator, value: string): Promise<void> {
	await select.first().evaluate((el: HTMLSelectElement, v) => {
		el.focus();
		el.value = v;
		el.dispatchEvent(new Event('change', { bubbles: true }));
	}, value);
}

/** Opens `content`, parks the cursor on the heading (frontmatter hidden), and waits for decorations. */
async function openWithCursorOnHeading(page: Page, content: string, settingsOverride: Record<string, unknown> = {}): Promise<void> {
	await openMarkdownFile(page, 'test.md', content, settingsOverride);
	await clickOnLine(page, HEADING);
	await settle(page);
	expect(await activeLineText(page)).toContain(HEADING);
}

/** Scrolls the far-down controls to mid-screen, through the virtual viewport. */
async function scrollToControls(page: Page): Promise<void> {
	await page.locator('.cm-scroller').evaluate((el) => {
		el.scrollTop = el.scrollHeight;
	});
	await settle(page);
	const anchor = page.locator('.cm-line', { hasText: ANCHOR }).first();
	await anchor.waitFor({ state: 'attached' });
	await anchor.evaluate((el) => el.scrollIntoView({ block: 'center' }));
	await settle(page);
	expect(await scrollTop(page)).toBeGreaterThan(2000);
}

test.describe('A frontmatter write keeps the visible text in place', () => {
	test('meta-bind select change while scrolled down does not move the select', async ({ lpPage: page }) => {
		await openWithCursorOnHeading(page, LONG_NOTE);
		await scrollToControls(page);
		const select = page.locator(SELECT);
		const before = await screenY(select);

		await pickOption(select, '3');
		await expect.poll(() => editorDoc(page)).toMatch(/^water: "?3"?$/m);
		await settle(page);

		expect(Math.abs((await screenY(select)) - before)).toBeLessThanOrEqual(2);
	});

	test('meta-bind toggle click while scrolled down does not move the toggle', async ({ lpPage: page }) => {
		await openWithCursorOnHeading(page, LONG_NOTE);
		await scrollToControls(page);
		const toggle = page.locator(TOGGLE);
		const before = await screenY(toggle);

		const click = await clickAtOffset(page, toggle);
		expect(click.hit).toContain('cm-lp-meta-bind-toggle-input');
		await expect.poll(() => editorDoc(page)).toMatch(/^flag: "?true"?$/m);
		await settle(page);

		expect(Math.abs((await screenY(toggle)) - before)).toBeLessThanOrEqual(2);
	});

	test('meta-bind number input commit while scrolled down does not move the input', async ({ lpPage: page }) => {
		await openWithCursorOnHeading(page, LONG_NOTE);
		await scrollToControls(page);
		const input = page.locator(NUMBER);
		const before = await screenY(input);

		const click = await clickAtOffset(page, input);
		expect(click.hit).toContain('cm-lp-meta-bind-input');
		await expect(input.first()).toBeFocused();
		// Not End + Backspace: End in an `<input type=number>` scrolls the editor to its end.
		await input.first().fill('7');
		await page.keyboard.press('Enter');
		await expect.poll(() => editorDoc(page)).toMatch(/^count: "?7"?$/m);
		await settle(page);

		expect(Math.abs((await screenY(input)) - before)).toBeLessThanOrEqual(2);
	});

	test('a Properties panel edit while scrolled down does not move the body text', async ({ lpPage: page }) => {
		await openWithCursorOnHeading(page, LONG_NOTE, {
			layout: { rightSidebarVisible: true, propertiesVisible: true },
		});
		const keys = page.locator('input[data-property-key]');
		await expect.poll(() => keys.count()).toBeGreaterThan(0);
		await scrollToControls(page);
		const anchor = page.locator('.cm-line', { hasText: ANCHOR });
		const before = await screenY(anchor);

		const names = await keys.evaluateAll((inputs) => inputs.map((i) => (i as HTMLInputElement).value));
		const row = page
			.locator('div.group')
			.filter({ has: page.locator('input[data-property-key]') })
			.nth(names.indexOf('mood'));
		await row.locator('input:not([data-property-key])').fill('great');
		await expect.poll(() => editorDoc(page)).toMatch(/^mood: "?great"?$/m);
		await settle(page);

		expect(Math.abs((await screenY(anchor)) - before)).toBeLessThanOrEqual(2);
	});

	test('a select change at the top of the note leaves the view where it was', async ({ lpPage: page }) => {
		await openWithCursorOnHeading(page, SHORT_NOTE);
		expect(await scrollTop(page)).toBe(0);
		const select = page.locator(SELECT);
		const before = await screenY(select);

		await pickOption(select, '2');
		await expect.poll(() => editorDoc(page)).toMatch(/^water: "?2"?$/m);
		await settle(page);

		expect(await scrollTop(page)).toBe(0);
		expect(Math.abs((await screenY(select)) - before)).toBeLessThanOrEqual(2);
		expect(await activeLineText(page)).toContain(HEADING);
	});
});
