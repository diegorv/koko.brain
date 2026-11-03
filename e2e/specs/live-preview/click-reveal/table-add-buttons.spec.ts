import { test, expect } from '../../../fixtures/live-preview';
import { END_LINE, activeLineText, clickAtOffset, isRevealed, openAndSettle } from '../../../fixtures/click-reveal';

const CONTENT = `Above line.

| A | B |
|---|---|
| 1 | 2 |

After line.

End line.
`;

test.describe('Live Preview - click reveal - table add buttons', () => {
	test('+row button adds one body row and the table stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const rows = page.locator('table.cm-lp-table tbody tr');
		await expect(rows).toHaveCount(1);

		const click = await clickAtOffset(page, page.locator('.cm-lp-table-add-row'));
		expect(click.hit).toContain('cm-lp-table-add-row');

		await expect(rows).toHaveCount(2);
		await expect(page.locator('table.cm-lp-table')).toHaveCount(1);
		await expect(page.locator('.cm-lp-table-add-row')).toHaveCount(1);
		expect(await isRevealed(page, '| A | B |')).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('+col button adds one header column and the table stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const headers = page.locator('table.cm-lp-table thead th');
		await expect(headers).toHaveCount(2);

		const click = await clickAtOffset(page, page.locator('.cm-lp-table-add-col'));
		expect(click.hit).toContain('cm-lp-table-add-col');

		await expect(headers).toHaveCount(3);
		await expect(page.locator('table.cm-lp-table')).toHaveCount(1);
		await expect(page.locator('.cm-lp-table-add-col')).toHaveCount(1);
		expect(await isRevealed(page, '| A | B |')).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});
});
