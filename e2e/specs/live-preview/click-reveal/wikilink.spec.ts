import { test, expect } from '../../../fixtures/live-preview';
import {
	END_LINE,
	activeLineText,
	clickAtOffset,
	clickTextInLine,
	isRevealed,
	openAndSettle,
} from '../../../fixtures/click-reveal';

const RAW_LINK = '[[Wiki]]';
const LINK_LINE = 'See [[Wiki]] here.';
const CONTENT = `Above line.\n\n${LINK_LINE}\n\n${END_LINE}\n`;

const ALIAS_LINE = 'See [[Target|shown alias]] here.';
const RAW_ALIAS = '[[Target|shown alias]]';
const ALIAS_CONTENT = `Above line.\n\n${ALIAS_LINE}\n\n${END_LINE}\n`;

const activeTab = '[role="tab"][aria-selected="true"]';

test.describe('Live Preview - click reveal: wikilink', () => {
	test('plain click on the rendered wikilink opens its target and the source stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const link = page.locator('.cm-lp-wikilink', { hasText: 'Wiki' }).first();
		await expect(link).toBeVisible();

		const click = await clickAtOffset(page, link);

		await expect(page.locator('[role="tab"][aria-selected="true"]'), `click hit ${click.hit}`).toContainText('Wiki');

		await page.locator('[role="tab"]', { hasText: 'test.md' }).click();
		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('test.md');
		await expect(page.locator('.cm-lp-wikilink', { hasText: 'Wiki' })).toBeVisible();
		expect(await isRevealed(page, RAW_LINK)).toBe(false);
		expect(await activeLineText(page), `click hit ${click.hit}`).toBe(END_LINE);
	});

	test('plain text on the same line reveals the wikilink source', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const line = page.locator('.cm-line', { hasText: 'here.' }).first();
		await expect(page.locator('.cm-lp-wikilink', { hasText: 'Wiki' })).toBeVisible();

		const click = await clickTextInLine(page, line, 'here');
		expect(click.hit, `click hit ${click.hit}`).not.toContain('cm-lp-wikilink');

		expect(await activeLineText(page), `click hit ${click.hit}`).toBe(LINK_LINE);
		expect(await isRevealed(page, RAW_LINK)).toBe(true);
		await expect(page.locator('.cm-lp-wikilink')).toHaveCount(0);
		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('test.md');
	});

	test('Cmd/Ctrl+click on the rendered wikilink opens its target and the source stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const link = page.locator('.cm-lp-wikilink', { hasText: 'Wiki' }).first();
		await expect(link).toBeVisible();

		await page.keyboard.down('ControlOrMeta');
		let click;
		try {
			click = await clickAtOffset(page, link);
		} finally {
			await page.keyboard.up('ControlOrMeta');
		}

		await expect(page.locator(activeTab), `click hit ${click.hit}`).toContainText('Wiki');
		await page.locator('[role="tab"]', { hasText: 'test.md' }).click();
		await expect(page.locator(activeTab)).toContainText('test.md');
		await expect(page.locator('.cm-lp-wikilink', { hasText: 'Wiki' })).toBeVisible();
		expect(await isRevealed(page, RAW_LINK)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('plain click on an alias wikilink opens the target, not the alias, and the source stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, ALIAS_CONTENT);
		const link = page.locator('.cm-lp-wikilink', { hasText: 'shown alias' }).first();
		await expect(link).toBeVisible();
		await expect(page.locator('.cm-line', { hasText: 'here.' }).first()).not.toContainText('Target');

		const click = await clickAtOffset(page, link);

		await expect(page.locator(activeTab), `click hit ${click.hit}`).toContainText('Target');
		await expect(page.locator(activeTab)).not.toContainText('shown alias');
		await page.locator('[role="tab"]', { hasText: 'test.md' }).click();
		await expect(page.locator(activeTab)).toContainText('test.md');
		await expect(page.locator('.cm-lp-wikilink', { hasText: 'shown alias' })).toBeVisible();
		expect(await isRevealed(page, RAW_ALIAS)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('plain text on the line of an alias wikilink reveals the full [[Target|alias]] source', async ({ lpPage: page }) => {
		await openAndSettle(page, ALIAS_CONTENT);
		const line = page.locator('.cm-line', { hasText: 'here.' }).first();

		const click = await clickTextInLine(page, line, 'here');
		expect(click.hit).not.toContain('cm-lp-wikilink');

		expect(await activeLineText(page)).toBe(ALIAS_LINE);
		expect(await isRevealed(page, RAW_ALIAS)).toBe(true);
		await expect(page.locator(activeTab)).toContainText('test.md');
	});
});
