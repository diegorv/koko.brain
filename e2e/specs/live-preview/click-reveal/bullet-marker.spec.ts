// Click behavior around the bullet list marker widget (UnorderedListMarkerWidget, `•` in place of `- `).
import { test, expect } from '../../../fixtures/live-preview';
import { openAndSettle, clickAtOffset, activeLineText, isRevealed } from '../../../fixtures/click-reveal';

const SAMPLE = 'Above line.\n\n- bullet item\n- second\n\nAfter line.\n\nEnd line.\n';
const MARKER = '.cm-lp-ul-marker';
const ITEM_LINE = '- bullet item';

test.describe('Live Preview - click reveal - bullet marker', () => {
	// Owner decision: a marker click moves the cursor to its item and reveals the marker; the ordered marker must match.
	test('clicking the bullet glyph moves the cursor to its item and reveals the marker', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const marker = page.locator(MARKER).first();

		const click = await clickAtOffset(page, marker, { from: 'center' });
		expect(click.hit).toContain('cm-lp-ul-marker');

		await expect.poll(() => activeLineText(page)).toBe(ITEM_LINE);
		await expect.poll(() => isRevealed(page, ITEM_LINE)).toBe(true);
	});

	test('clicking the item text moves the cursor to its line and reveals the marker', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const line = page.locator('.cm-line').filter({ hasText: 'bullet item' }).first();

		const click = await clickAtOffset(page, line, { from: 'left', dx: 60 });
		expect(click.hitLine).toContain('bullet item');

		await expect.poll(() => activeLineText(page)).toBe(ITEM_LINE);
		await expect.poll(() => isRevealed(page, ITEM_LINE)).toBe(true);
	});
});
