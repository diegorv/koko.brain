import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import {
	END_LINE,
	activeLineText,
	clickAtOffset,
	clickLeftOfWidget,
	isRevealed,
	lineBandProbe,
	openAndSettle,
} from '../../../fixtures/click-reveal';

const CONTENT = `Above line.

\`\`\`meta-bind-button
label: Broken
not valid
\`\`\`

After line.

${END_LINE}
`;

const ERROR = '.cm-lp-meta-bind-button-error';
const RAW_FENCE = '```meta-bind-button';

test.describe('Live Preview click-reveal - Meta-bind button error widget (invalid YAML)', () => {
	async function clickBand(page: Page, edge: 'above' | 'below') {
		await openAndSettle(page, CONTENT);
		const error = page.locator(ERROR).first();
		await expect(error).toBeVisible();

		const probe = await lineBandProbe(error);
		const band = edge === 'above' ? probe.above : probe.below;
		expect(band, `${edge} band`).toBeGreaterThan(2);

		const dy = edge === 'above' ? -band / 2 : band / 2;
		const hit = await clickAtOffset(page, error, { from: edge === 'above' ? 'top' : 'bottom', dy });
		expect(hit.hit, `${edge} click target`).not.toContain('cm-lp-meta-bind-button-error');
		expect(hit.inOwnLine, `${edge}: the press must land in the widget's own line`).toBe(true);

		expect(await page.locator(ERROR).count(), `${edge}: error box stays rendered`).toBe(1);
		expect(await isRevealed(page, RAW_FENCE), `${edge}: source stays hidden`).toBe(false);
		await expect.poll(() => activeLineText(page), `${edge}: cursor on the blank line next to the box`).toBe('');
	}

	// Owner decision: the band above stays rendered; a click on the error box itself is the mouse path to the invalid YAML.
	test('clicking the blank band above the error box keeps it rendered', async ({ lpPage: page }) => {
		await clickBand(page, 'above');
	});

	test('clicking the error box reveals the YAML', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const click = await clickAtOffset(page, page.locator(ERROR).first());
		expect(click.hit).toContain('cm-lp-meta-bind-button-error');
		await expect.poll(() => isRevealed(page, RAW_FENCE)).toBe(true);
		await expect.poll(() => activeLineText(page)).not.toBe(END_LINE);
	});

	test('clicking the blank band below the error box keeps it rendered', async ({ lpPage: page }) => {
		await clickBand(page, 'below');
	});

	test('blank space left of the error box, at its vertical center, keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		await clickLeftOfWidget(page, page.locator(ERROR).first());

		await expect(page.locator(ERROR)).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe(END_LINE);
	});
});
