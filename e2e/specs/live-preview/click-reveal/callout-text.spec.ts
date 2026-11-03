import { test, expect } from '../../../fixtures/live-preview';
import { END_LINE, activeLineText, clickAtOffset, isRevealed, openAndSettle } from '../../../fixtures/click-reveal';

const SAMPLE = `Above line.

> [!note] Title
> body text

After line.

${END_LINE}
`;

const AFTER_LINE = 'After line.';
const BODY_LINE = 'body text';

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
});
