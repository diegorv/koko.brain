import { test, expect } from '../../../fixtures/live-preview';
import {
	END_LINE,
	activeLineText,
	clickAtOffset,
	clickTextInLine,
	isRevealed,
	openAndSettle,
} from '../../../fixtures/click-reveal';

const SAMPLE = `Above line.

> [!note] Title
> body text

After line.

${END_LINE}
`;

const AFTER_LINE = 'After line.';
const BODY_LINE = 'body text';

const COLLAPSED_SAMPLE = `Above line.

> [!note]- Folded title
> folded body

After line.

${END_LINE}
`;

const NESTED_SAMPLE = `Above line.

> [!warning] Outer title
> outer body
> > [!tip] Inner title
> > inner body

After line.

${END_LINE}
`;

test.describe('Live Preview - click-reveal - callout title and body text', () => {
	test('clicking the body text reveals the whole callout source', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const chevron = page.locator('.cm-lp-callout-fold');
		await expect(chevron).toHaveCount(1);

		const click = await clickAtOffset(page, page.locator('.cm-line', { hasText: BODY_LINE }));
		expect(click.hitLine).toContain(BODY_LINE);

		await expect(chevron).toHaveCount(0);
		await expect(page.locator('.cm-line', { hasText: '[!note]' })).toBeVisible();
		expect(await isRevealed(page, '[!note]')).toBe(true);
		expect(await activeLineText(page)).toContain(BODY_LINE);
	});

	test('clicking the line after the callout keeps the callout rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const chevron = page.locator('.cm-lp-callout-fold');
		await expect(chevron).toHaveCount(1);

		const click = await clickAtOffset(page, page.locator('.cm-line', { hasText: AFTER_LINE }));
		expect(click.hitLine).toContain(AFTER_LINE);

		expect(await activeLineText(page)).toBe(AFTER_LINE);
		await expect(chevron).toHaveCount(1);
		await expect(page.locator('.cm-lp-callout-type-label')).toHaveText('note');
		expect(await isRevealed(page, '[!note]')).toBe(false);
	});

	test('clicking away after a reveal renders the callout again', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const chevron = page.locator('.cm-lp-callout-fold');

		await clickAtOffset(page, page.locator('.cm-line', { hasText: BODY_LINE }));
		await expect(chevron).toHaveCount(0);
		expect(await isRevealed(page, '[!note]')).toBe(true);

		const click = await clickAtOffset(page, page.locator('.cm-line', { hasText: END_LINE }));
		expect(click.hitLine).toContain(END_LINE);

		await expect(chevron).toHaveCount(1);
		await expect(chevron).toHaveText('▼');
		expect(await isRevealed(page, '[!note]')).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('clicking the title text reveals the callout source and puts the cursor on the title line', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await expect(page.locator('.cm-lp-callout-fold')).toHaveCount(1);
		const title = page.locator('.cm-line', { hasText: 'Title' }).first();

		const click = await clickTextInLine(page, title, 'Title');
		expect(click.hitLine).toContain('Title');

		await expect.poll(() => activeLineText(page)).toBe('> [!note] Title');
		await expect(page.locator('.cm-lp-callout-fold')).toHaveCount(0);
		expect(await isRevealed(page, '[!note]')).toBe(true);
	});

	test('collapsed callout: clicking the title reveals the source with its hidden body', async ({ lpPage: page }) => {
		await openAndSettle(page, COLLAPSED_SAMPLE);
		await expect(page.locator('.cm-lp-callout-fold')).toHaveText('▶');
		await expect(page.locator('.cm-line', { hasText: 'folded body' })).toBeHidden();
		const title = page.locator('.cm-line', { hasText: 'Folded title' }).first();

		await clickTextInLine(page, title, 'Folded title');

		await expect.poll(() => activeLineText(page)).toBe('> [!note]- Folded title');
		await expect(page.locator('.cm-lp-callout-fold')).toHaveCount(0);
		await expect(page.locator('.cm-line', { hasText: '> folded body' })).toBeVisible();
		expect(await isRevealed(page, '[!note]-')).toBe(true);
	});

	test('collapsed callout: clicking the line after keeps it collapsed', async ({ lpPage: page }) => {
		await openAndSettle(page, COLLAPSED_SAMPLE);

		await clickAtOffset(page, page.locator('.cm-line', { hasText: AFTER_LINE }).first());

		await expect.poll(() => activeLineText(page)).toBe(AFTER_LINE);
		await expect(page.locator('.cm-lp-callout-fold')).toHaveText('▶');
		await expect(page.locator('.cm-line', { hasText: 'folded body' })).toBeHidden();
		expect(await isRevealed(page, '[!note]-')).toBe(false);
	});

	test('nested callout: clicking the inner body reveals both callouts and puts the cursor on that line', async ({ lpPage: page }) => {
		await openAndSettle(page, NESTED_SAMPLE);
		await expect(page.locator('.cm-lp-callout-fold')).toHaveCount(2);
		const inner = page.locator('.cm-line', { hasText: 'inner body' }).first();

		await clickTextInLine(page, inner, 'inner body');

		await expect.poll(() => activeLineText(page)).toBe('> > inner body');
		await expect(page.locator('.cm-lp-callout-fold')).toHaveCount(0);
		expect(await isRevealed(page, '[!warning]')).toBe(true);
		expect(await isRevealed(page, '[!tip]')).toBe(true);
	});

	test('nested callout: clicking the line after keeps both callouts rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, NESTED_SAMPLE);

		await clickAtOffset(page, page.locator('.cm-line', { hasText: AFTER_LINE }).first());

		await expect.poll(() => activeLineText(page)).toBe(AFTER_LINE);
		await expect(page.locator('.cm-lp-callout-fold')).toHaveCount(2);
		expect(await isRevealed(page, '[!warning]')).toBe(false);
		expect(await isRevealed(page, '[!tip]')).toBe(false);
		await expect(page.locator('.cm-lp-callout-type-label')).toHaveText(['warning', 'tip']);
	});
});
