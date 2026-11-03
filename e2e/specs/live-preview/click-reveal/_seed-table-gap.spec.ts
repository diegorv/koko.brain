// Click in the blank band below a table in a daily-note layout (heading, table, heading, list): the first reported case of the band bug.
import { test, expect } from '../../../fixtures/live-preview';
import {
	END_LINE,
	activeLineText,
	clickAtOffset,
	isRevealed,
	lineBandProbe,
	openAndSettle,
} from '../../../fixtures/click-reveal';

const SAMPLE = `## Morning

| Metric | Rating |
| ------ | ------ |
| Sleep  | ok |
| Energy | good |
| Mood   | good |

### Intention
- 1

${END_LINE}
`;

const RAW_SNIPPET = '| Metric';

test.describe('Live Preview - click reveal - table gap in a daily note', () => {
	test('click in the blank band below the table keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const wrapper = page.locator('.cm-lp-table-wrapper').first();
		const band = await lineBandProbe(wrapper);
		expect(band.below, 'the table line box must add a blank band below the wrapper').toBeGreaterThan(2);

		// Below the wrapper box, so the press misses the +row button that fills the wrapper's bottom padding.
		const click = await clickAtOffset(page, wrapper, { from: 'bottom', dy: Math.max(1, Math.floor(band.below / 2)) });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).not.toMatch(/BUTTON|TABLE|TD|TH/);

		await expect(page.locator('table.cm-lp-table')).toHaveCount(1);
		expect(await isRevealed(page, RAW_SNIPPET)).toBe(false);
		// The cursor goes to the blank line right below the table.
		await expect.poll(() => activeLineText(page)).toBe('');
	});
});
