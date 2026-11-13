import { test, expect } from '../../../fixtures/live-preview';
import { activeLineText, END_LINE, isRevealed, openAndSettle, clickAtOffset } from '../../../fixtures/click-reveal';

const SAMPLE = `Above line.

\`\`\`js
const x = 1;
\`\`\`

After line.

${END_LINE}
`;

const SELECT = '.cm-lp-codeblock-lang-select';

test.describe('Live Preview click-reveal - code block language switcher (select)', () => {
	test('choosing a language through selectOption (no mouse press) changes the fence and keeps the block rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const select = page.locator(SELECT);
		await expect(select).toBeVisible();

		await select.selectOption('python');

		await expect(page.locator(SELECT)).toHaveValue('python');
		await expect.poll(() => page.evaluate(() => window.__e2e.fs.readFileSafe('/test-vault/test.md')), { timeout: 10_000 }).toContain('```python\n');
		await expect(page.locator(SELECT)).toBeVisible();
		expect(await isRevealed(page, '```python')).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('a mouse press on the select, then Escape, keeps the block rendered and the cursor where it was', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const select = page.locator(SELECT);
		await expect(select).toBeVisible();

		const click = await clickAtOffset(page, select);
		expect(click.hit).toContain('SELECT');
		await page.keyboard.press('Escape');
		await page.waitForTimeout(150);

		await expect(page.locator(SELECT)).toBeVisible();
		expect(await isRevealed(page, '```js')).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});
});
