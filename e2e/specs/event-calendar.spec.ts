import { test, expect } from '../fixtures/test-vault';
import { openCommandPalette } from '../fixtures/helpers';
import type { Page } from '@playwright/test';

const BROKEN = '/test-vault/Events/Broken start.md';
const SOMEDAY = '/test-vault/Events/Someday.md';
const STANDUP = '/test-vault/Events/Standup.md';
const HOLIDAY = '/test-vault/Events/Holiday.md';

const EVENT_FILES: Record<string, string> = {
	'/test-vault/Events/': '',
	[BROKEN]: '---\n_type: Event\ndate: 2026-11-10\nstart: later\n---\nBroken start body text\n',
	[SOMEDAY]: '---\n_type: Event\n---\nSomeday body text\n',
	[STANDUP]: '---\n_type: Event\ndate: 2026-11-10\nstart: 09:00\nend: 10:00\nevent_color: pink\n---\nDaily sync notes\n',
	[HOLIDAY]: '---\n_type: Event\ndate: 2026-11-12\nall_day: true\n---\n',
};

/** Sakura's editor colors (`theme.logic.ts`, `SAKURA_THEME`). */
const SAKURA = { bg: '#FDF5F5', fg: '#3A2030' };

/** Reads an element's computed background and text colors as sRGB bytes, through a canvas. */
async function computedColors(page: Page, selector: string): Promise<{ bg: number[]; fg: number[] }> {
	return page.evaluate((sel) => {
		const el = document.querySelector(sel)!;
		const style = getComputedStyle(el);
		const ctx = document.createElement('canvas').getContext('2d')!;
		const toRgb = (color: string) => {
			ctx.clearRect(0, 0, 1, 1);
			ctx.fillStyle = color;
			ctx.fillRect(0, 0, 1, 1);
			return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
		};
		return { bg: toRgb(style.backgroundColor), fg: toRgb(style.color) };
	}, selector);
}

/** WCAG relative luminance of sRGB bytes. */
function luminance([r, g, b]: number[]): number {
	const lin = (c: number) => {
		const s = c / 255;
		return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio of two sRGB colors. */
function contrast(a: number[], b: number[]): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

test.use({ clockTime: '2026-11-10T10:00:00+01:00', timezoneId: 'Europe/Berlin' });

/** Seeds the event notes and announces them the way Rust does. */
async function seedEvents(page: Page): Promise<void> {
	await page.evaluate(({ files }) => {
		const e2e = (window as any).__e2e;
		e2e.fs.populate(files);
		e2e.events.emit('vault-index-updated', {
			changed: true,
			affected: Object.keys(files).filter((p) => !p.endsWith('/')),
			version: e2e.vaultIndex.version,
		});
	}, { files: EVENT_FILES });
}

/** Opens the Calendar tab through the command palette. */
async function openCalendar(page: Page): Promise<void> {
	await openCommandPalette(page);
	await page.locator('input[placeholder*="command"]:visible').first().fill('Toggle Calendar View');
	await page.getByRole('option', { name: /Toggle Calendar View/ }).click();
	await expect(page.locator('[data-event-calendar]')).toBeVisible();
}

test.describe('Event calendar', () => {
	test('the palette opens the Calendar tab with the range header', async ({ vaultPage: page }) => {
		await openCalendar(page);

		await expect(page.locator('[role="tab"][aria-selected="true"]', { hasText: 'Calendar' })).toBeVisible();
		await expect(page.locator('[data-calendar-title]')).toHaveText('November, 2026');
		await expect(page.locator('[data-calendar-subtitle]')).toContainText('Week 46');
		await expect(page.getByRole('tablist', { name: 'Calendar view' })).toBeVisible();
		await expect(page.getByRole('tab', { name: 'Week' })).toHaveAttribute('aria-selected', 'true');
	});

	test('invalid and dateless event notes land in Needs attention and Unscheduled', async ({ vaultPage: page }) => {
		await seedEvents(page);
		await openCalendar(page);

		await expect(page.locator('[data-attention-badge]')).toHaveText('1 event needs attention', { timeout: 10_000 });
		const attention = page.locator('[data-attention-list]');
		const brokenRow = attention.locator(`[data-issue-path="${BROKEN}"]`);
		await expect(brokenRow.locator('[data-issue-title]')).toHaveText('Broken start');
		await expect(brokenRow.locator('[data-issue-reason]')).toHaveText('start is not a valid time (HH:mm)');
		await expect(attention.locator(`[data-issue-path="${SOMEDAY}"]`)).toHaveCount(0);

		const unscheduled = page.locator('details[data-unscheduled]');
		await expect(unscheduled.locator('summary')).toHaveText('Unscheduled (1)');
		await unscheduled.locator('summary').click();
		await expect(unscheduled.locator(`[data-issue-path="${SOMEDAY}"] [data-issue-title]`)).toHaveText('Someday');
	});

	test('clicking a Needs-attention row opens that note', async ({ vaultPage: page }) => {
		await seedEvents(page);
		await openCalendar(page);

		const row = page.locator(`[data-attention-list] [data-issue-path="${BROKEN}"]`);
		await expect(row).toBeVisible({ timeout: 10_000 });
		await row.click();

		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Broken start');
		await expect(page.locator('.cm-content')).toContainText('Broken start body text');
	});
});

test.describe('Event calendar time grid', () => {
	test('seeded timed and all-day events render with title and time', async ({ vaultPage: page }) => {
		await seedEvents(page);
		await openCalendar(page);

		const block = page.locator(`[data-day-column="2026-11-10"] [data-event-path="${STANDUP}"]`);
		await expect(block).toBeVisible({ timeout: 10_000 });
		await expect(block.locator('[data-event-title]')).toHaveText('Standup');
		await expect(block.locator('[data-event-time]')).toHaveText('09:00 – 10:00');
		await expect(block.locator('[data-event-snippet]')).toContainText('Daily sync notes');

		const chip = page.locator(`[data-all-day-cell="2026-11-12"] [data-event-path="${HOLIDAY}"]`);
		await expect(chip).toHaveText('Holiday');
		await expect(page.locator('[data-day-column="2026-11-10"] [data-now-line]')).toHaveCount(1);
	});

	test('event colors follow a light theme with at least 4.5:1 contrast', async ({ vaultPage: page }) => {
		await seedEvents(page);
		await openCalendar(page);
		const selector = `[data-event-path="${STANDUP}"]`;
		await expect(page.locator(selector)).toBeVisible({ timeout: 10_000 });

		// What applyTheme does: inline variables on the root element.
		await page.evaluate(({ bg, fg }) => {
			document.documentElement.style.setProperty('--editor-bg', bg);
			document.documentElement.style.setProperty('--editor-fg', fg);
		}, SAKURA);

		const { bg, fg } = await computedColors(page, selector);
		expect(luminance(bg)).toBeGreaterThan(0.5);
		expect(contrast(bg, fg)).toBeGreaterThanOrEqual(4.5);
	});

	test('a narrow pane scrolls sideways and keeps the day headers on top', async ({ vaultPage: page }) => {
		await page.setViewportSize({ width: 900, height: 800 });
		await seedEvents(page);
		await openCalendar(page);
		const grid = page.locator('[data-time-grid]');
		await expect(grid).toBeVisible();

		const widths = await grid.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
		expect(widths.scroll).toBeGreaterThan(widths.client);
		await grid.evaluate((el) => el.scrollTo({ left: 200 }));
		await expect.poll(() => grid.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);

		const gridTop = (await grid.boundingBox())!.y;
		await grid.evaluate((el) => el.scrollTo({ top: el.scrollTop + 500 }));
		await expect.poll(() => grid.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
		const header = (await page.locator('[data-day-headers]').boundingBox())!;
		expect(Math.abs(header.y - gridTop)).toBeLessThanOrEqual(1);
		await expect(page.locator('[data-day-header="2026-11-10"]')).toBeInViewport();
	});
});

test.describe('Event calendar now-line on a DST day', () => {
	test.use({ clockTime: '2026-10-25T10:00:00+01:00', timezoneId: 'Europe/Berlin' });

	test('the fall-back day places 10:00 at 640px, not 704px', async ({ vaultPage: page }) => {
		await openCalendar(page);

		const line = page.locator('[data-day-column="2026-10-25"] [data-now-line]');
		await expect(line).toHaveCount(1);
		expect(await line.evaluate((el) => (el as HTMLElement).style.top)).toBe('640px');
	});
});
