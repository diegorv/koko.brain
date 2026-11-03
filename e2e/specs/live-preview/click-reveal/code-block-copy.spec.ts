import { test, expect } from '../../../fixtures/live-preview';
import { END_LINE, activeLineText, clickAtOffset, isRevealed, openAndSettle } from '../../../fixtures/click-reveal';

const CONTENT = `Above line.

\`\`\`js
const x = 1;
\`\`\`

After line.

${END_LINE}
`;

test.describe('Live Preview click-reveal - Code block Copy button', () => {
	test('copy button acts and keeps the block rendered', async ({ lpPage: page }) => {
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
		await openAndSettle(page, CONTENT);

		const copy = page.locator('.cm-lp-codeblock-copy').first();
		await expect(copy).toBeAttached();

		const hit = await clickAtOffset(page, copy);
		expect(hit.hit).toContain('cm-lp-codeblock-copy');

		await expect(copy).toHaveText('Copied!');
		await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('const x = 1;');

		await expect(page.locator('.cm-lp-codeblock').first()).toBeVisible();
		expect(await isRevealed(page, '```js')).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});
});
