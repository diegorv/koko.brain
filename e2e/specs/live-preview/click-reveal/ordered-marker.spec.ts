// Click behavior around the ordered list number widget (OrderedListMarkerWidget, `1.` in place of `1. `).
import { test, expect } from '../../../fixtures/live-preview';
import { openAndSettle, clickAtOffset, activeLineText, isRevealed } from '../../../fixtures/click-reveal';

const SAMPLE = 'Above line.\n\n1. ordered item\n2. second\n\nAfter line.\n\nEnd line.\n';
const MARKER = '.cm-lp-ol-marker';
const ITEM_LINE = '1. ordered item';

test.describe('Live Preview - click reveal - ordered marker', () => {
	// Owner decision: a marker click moves the cursor to its item and reveals the marker, as the bullet marker does.
	test('clicking the number glyph moves the cursor to its item and reveals the marker', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const marker = page.locator(MARKER).first();
		await expect(marker).toHaveText('1.');

		const click = await clickAtOffset(page, marker, { from: 'center' });
		expect(click.hit).toContain('cm-lp-ol-marker');

		await expect.poll(() => activeLineText(page)).toBe(ITEM_LINE);
		await expect.poll(() => isRevealed(page, ITEM_LINE)).toBe(true);
	});

	test('clicking the item text moves the cursor to its line and reveals the number', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const line = page.locator('.cm-line').filter({ hasText: 'ordered item' }).first();

		const click = await clickAtOffset(page, line, { from: 'left', dx: 60 });
		expect(click.hitLine).toContain('ordered item');

		await expect.poll(() => activeLineText(page)).toBe(ITEM_LINE);
		await expect.poll(() => isRevealed(page, ITEM_LINE)).toBe(true);
		await expect(line.locator(MARKER)).toHaveCount(0);
	});
});
