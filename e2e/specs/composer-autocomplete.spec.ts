import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/console-guard';
import { TEST_FILES } from '../fixtures/test-vault';

/**
 * The Quick Capture composer route on its own, as its popover window loads
 * it: 600x240, no vault opened in this page. The suggestions come from the
 * mocked Rust index, which `populate` fills.
 */
async function loadComposer(page: Page) {
	await page.setViewportSize({ width: 600, height: 240 });
	await page.goto('/composer', { waitUntil: 'networkidle' });
	await page.waitForFunction(() => window.__e2e?.fs !== undefined, { timeout: 10_000 });
	await page.evaluate((files) => window.__e2e.fs.populate(files), TEST_FILES);
}

async function openComposer(page: Page) {
	await loadComposer(page);
	await page.locator('.cm-content').click();
}

const tooltip = (page: Page) => page.locator('.cm-tooltip-autocomplete');

test.describe('Composer completion', () => {
	test('takes typing as soon as it loads, without a click', async ({ page }) => {
		await loadComposer(page);

		await page.keyboard.type('an idea');

		await expect(page.locator('.cm-content')).toHaveText('an idea');
	});

	test('[[ lists the vault notes and narrows as you type', async ({ page }) => {
		await openComposer(page);

		await page.keyboard.type('[[');
		await expect(tooltip(page)).toBeVisible({ timeout: 3_000 });
		await expect(tooltip(page).locator('.cm-completionLabel').first()).toBeVisible();

		await page.keyboard.type('Wel');
		await expect(tooltip(page).locator('.cm-completionLabel').first()).toHaveText('Welcome');
	});

	test('Enter inserts the note link with closing brackets', async ({ page }) => {
		await openComposer(page);

		await page.keyboard.type('read [[Welc');
		await expect(tooltip(page)).toBeVisible({ timeout: 3_000 });
		await page.waitForTimeout(150);
		await page.keyboard.press('Enter');

		await expect(page.locator('.cm-content')).toHaveText('read [[Welcome]]');
		await expect(tooltip(page)).toBeHidden();
	});

	test('# lists the vault tags and Enter inserts one', async ({ page }) => {
		await openComposer(page);

		await page.keyboard.type('#pl');
		await expect(tooltip(page).locator('.cm-completionLabel', { hasText: 'plan' })).toBeVisible({ timeout: 3_000 });
		await page.waitForTimeout(150);
		await page.keyboard.press('Enter');

		await expect(page.locator('.cm-content')).toHaveText('#plan');
	});

	test('the list fits inside the popover window', async ({ page }) => {
		await openComposer(page);

		await page.keyboard.type('[[');
		await expect(tooltip(page)).toBeVisible({ timeout: 3_000 });

		const box = (await tooltip(page).boundingBox())!;
		expect(box.x).toBeGreaterThanOrEqual(0);
		expect(box.y).toBeGreaterThanOrEqual(0);
		expect(box.x + box.width).toBeLessThanOrEqual(600);
		expect(box.y + box.height).toBeLessThanOrEqual(240);
	});

	test('Escape closes the list and keeps the text', async ({ page }) => {
		await openComposer(page);

		await page.keyboard.type('#pl');
		await expect(tooltip(page)).toBeVisible({ timeout: 3_000 });
		await page.keyboard.press('Escape');

		await expect(tooltip(page)).toBeHidden();
		await expect(page.locator('.cm-content')).toHaveText('#pl');
	});
});
