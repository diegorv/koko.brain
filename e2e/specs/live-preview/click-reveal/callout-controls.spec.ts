import { test, expect } from '../../../fixtures/live-preview';
import { clickOnLine } from '../../../fixtures/live-preview';
import { END_LINE, activeLineText, clickAtOffset, isRevealed, openAndSettle } from '../../../fixtures/click-reveal';

const SAMPLE = `Above line.

> [!note] Title
> body text

After line.

${END_LINE}
`;

const AFTER_LINE = 'After line.';

test.describe('Live Preview - click-reveal - callout controls', () => {
	test('clicking the fold chevron collapses the callout and keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const chevron = page.locator('.cm-lp-callout-fold');
		const body = page.locator('.cm-line', { hasText: 'body text' });
		await expect(chevron).toHaveText('▼');
		await expect(body).toBeVisible();

		const click = await clickAtOffset(page, chevron);
		expect(click.hit).toContain('cm-lp-callout-fold');

		await expect(chevron).toHaveText('▶');
		await expect(body).toBeHidden();
		await expect(page.locator('.cm-lp-callout-type-label')).toBeVisible();
		expect(await isRevealed(page, '[!note]')).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('clicking the type label opens the type popover and keeps the callout rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const label = page.locator('.cm-lp-callout-type-label');
		const popover = page.locator('.cm-lp-callout-type-popover');
		await expect(label).toHaveText('note');
		await expect(popover).toBeHidden();

		const click = await clickAtOffset(page, label);
		expect(click.hit).toContain('cm-lp-callout-type-label');

		await expect(popover).toBeVisible();
		await expect(label).toBeVisible();
		expect(await isRevealed(page, '[!note]')).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('picking a type in the popover changes the type and keeps the callout rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const label = page.locator('.cm-lp-callout-type-label');
		const popover = page.locator('.cm-lp-callout-type-popover');
		await clickAtOffset(page, label);
		await expect(popover).toBeVisible();

		const option = popover.locator('.cm-lp-callout-type-option', { hasText: /^warning$/ });
		const click = await clickAtOffset(page, option);
		expect(click.hit).toContain('cm-lp-callout-type-option');

		await expect(label).toHaveText('warning');
		await expect
			.poll(() => page.evaluate(() => window.__e2e.fs.readFileSafe('/test-vault/test.md')), { timeout: 10_000 })
			.toContain('> [!warning] Title');
		await expect(label).toBeVisible();
		expect(await isRevealed(page, '[!note]')).toBe(false);
		expect(await isRevealed(page, '[!warning]')).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('clicking outside the open popover closes it and keeps the callout rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		// Park the cursor on a neutral line first, so the outside click on
		// "End line." has a visible cursor move to prove it landed.
		await clickOnLine(page, AFTER_LINE);
		expect(await activeLineText(page)).toBe(AFTER_LINE);

		const label = page.locator('.cm-lp-callout-type-label');
		const popover = page.locator('.cm-lp-callout-type-popover');
		await clickAtOffset(page, label);
		await expect(popover).toBeVisible();
		expect(await activeLineText(page)).toBe(AFTER_LINE);

		const endLine = page.locator('.cm-line').filter({ hasText: END_LINE }).first();
		const click = await clickAtOffset(page, endLine);
		expect(click.hit).not.toContain('cm-lp-callout-type-');

		await expect(popover).toBeHidden();
		await expect(label).toBeVisible();
		expect(await isRevealed(page, '[!note]')).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});
});
