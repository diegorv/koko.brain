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

	test('+row button sits below the table, so a last-row cell bottom edge hits the cell', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const geo = await page.locator('table.cm-lp-table').evaluate((table) => {
			const t = table.getBoundingClientRect();
			const button = table.parentElement!.querySelector('.cm-lp-table-add-row')!.getBoundingClientRect();
			const cell = table.querySelector('tbody tr:last-child td')!.getBoundingClientRect();
			const hit = document.elementFromPoint(cell.left + cell.width / 2, t.bottom - 2);
			return { tableBottom: t.bottom, buttonTop: button.top, hit: hit?.tagName ?? null };
		});
		expect(geo.buttonTop, `table bottom=${geo.tableBottom}`).toBeGreaterThanOrEqual(geo.tableBottom);
		expect(geo.hit).toBe('TD');
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
