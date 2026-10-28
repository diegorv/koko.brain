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

/**
 * Reads the block background and an inner element's text color, the text composited
 * over that background with the opacity of every element between them.
 */
async function compositedTextColors(page: Page, blockSelector: string, innerSelector: string): Promise<{ bg: number[]; fg: number[] }> {
	return page.evaluate(({ blockSel, innerSel }) => {
		const block = document.querySelector(blockSel)!;
		const inner = block.querySelector(innerSel)!;
		const ctx = document.createElement('canvas').getContext('2d')!;
		const toRgb = (color: string) => {
			ctx.clearRect(0, 0, 1, 1);
			ctx.fillStyle = color;
			ctx.fillRect(0, 0, 1, 1);
			return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
		};
		let alpha = 1;
		for (let el: Element | null = inner; el && el !== block.parentElement; el = el.parentElement) {
			alpha *= Number(getComputedStyle(el).opacity);
		}
		const bg = toRgb(getComputedStyle(block).backgroundColor);
		const fg = toRgb(getComputedStyle(inner).color);
		return { bg, fg: fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha))) };
	}, { blockSel: blockSelector, innerSel: innerSelector });
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

		for (const line of ['[data-event-time]', '[data-event-snippet]']) {
			const composited = await compositedTextColors(page, selector, line);
			expect(contrast(composited.bg, composited.fg)).toBeGreaterThanOrEqual(4.5);
		}
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

		const gridLeft = (await grid.boundingBox())!.x;
		await expect
			.poll(async () => Math.abs((await page.locator('[data-all-day-lane] > :first-child').boundingBox())!.x - gridLeft))
			.toBeLessThanOrEqual(1);
		const axis = (await page.locator('[data-time-axis]').boundingBox())!;
		expect(Math.abs(axis.x - gridLeft)).toBeLessThanOrEqual(1);

		const gridTop = (await grid.boundingBox())!.y;
		await grid.evaluate((el) => el.scrollTo({ top: el.scrollTop + 500 }));
		await expect.poll(() => grid.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
		const header = (await page.locator('[data-day-headers]').boundingBox())!;
		expect(Math.abs(header.y - gridTop)).toBeLessThanOrEqual(1);
		await expect(page.locator('[data-day-header="2026-11-10"]')).toBeInViewport();
	});

	test('overlapping events in a narrow pane show the title-only variant', async ({ vaultPage: page }) => {
		await page.setViewportSize({ width: 900, height: 800 });
		await page.evaluate(() => {
			const e2e = (window as any).__e2e;
			const files: Record<string, string> = {
				'/test-vault/Events/': '',
				'/test-vault/Events/Overlap A.md': '---\n_type: Event\ndate: 2026-11-10\nstart: 13:00\nend: 14:00\n---\n',
				'/test-vault/Events/Overlap B.md': '---\n_type: Event\ndate: 2026-11-10\nstart: 13:00\nend: 14:00\n---\n',
			};
			e2e.fs.populate(files);
			e2e.events.emit('vault-index-updated', {
				changed: true,
				affected: Object.keys(files).filter((p) => !p.endsWith('/')),
				version: e2e.vaultIndex.version,
			});
		});
		await openCalendar(page);

		const block = page.locator('[data-day-column="2026-11-10"] [data-event-path="/test-vault/Events/Overlap A.md"]');
		await expect(block).toBeAttached({ timeout: 10_000 });
		const width = (await block.boundingBox())!.width;
		expect(width).toBeLessThan(84);
		await expect(block.locator('[data-event-narrow-title]')).toBeVisible();
		await expect(block.locator('[data-event-narrow-title]')).toHaveText('Overlap A');
		await expect(block.locator('[data-event-time]')).toBeHidden();
	});
});

test.describe('Event calendar month view', () => {
	test('switching to Month shows the event chips in their day cells', async ({ vaultPage: page }) => {
		await seedEvents(page);
		await openCalendar(page);

		await page.getByRole('tab', { name: 'Month' }).click();
		await expect(page.locator('[data-month-grid]')).toBeVisible();
		await expect(page.locator('[data-time-grid]')).toHaveCount(0);

		const chip = page.locator(`[data-month-cell="2026-11-10"] [data-event-path="${STANDUP}"]`);
		await expect(chip).toBeVisible({ timeout: 10_000 });
		await expect(chip).toHaveText('09:00 Standup');
		await expect(page.locator(`[data-month-cell="2026-11-12"] [data-event-path="${HOLIDAY}"]`)).toHaveText('Holiday');
		await expect(page.locator('[data-month-cell="2026-11-10"] [data-month-day]')).toHaveAttribute('data-today', 'true');
	});
});

test.describe('Event calendar popover', () => {
	test('clicking a block shows the popover; "Open note" opens the note and the Calendar tab comes back without it', async ({ vaultPage: page }) => {
		await seedEvents(page);
		await openCalendar(page);

		const block = page.locator(`[data-day-column="2026-11-10"] [data-event-path="${STANDUP}"]`);
		await expect(block).toBeVisible({ timeout: 10_000 });
		// 09:00 sits under the sticky header after the mount scroll to 07:00, so the click's own
		// scroll-into-view would close the popover it opens. Scroll it clear first and
		// let that scroll event pass.
		await page.locator('[data-time-grid]').evaluate(
			(el) =>
				new Promise<void>((resolve) => {
					el.addEventListener('scroll', () => requestAnimationFrame(() => resolve()), { once: true });
					el.scrollTop = 6 * 64;
				}),
		);
		await block.click();

		const popover = page.locator('[data-event-popover]');
		await expect(popover).toBeVisible();
		await expect(popover.locator('[data-popover-title]')).toHaveText('Standup');
		await expect(popover.locator('[data-popover-time]')).toHaveText('09:00 – 10:00 · 1h');
		await expect(block).toHaveClass(/ring-primary\/70/);

		// A second event's click retargets the open popover, then back to the block.
		const holiday = page.locator(`[data-all-day-cell] [data-event-path="${HOLIDAY}"]`);
		await holiday.click();
		await expect(popover.locator('[data-popover-title]')).toHaveText('Holiday');
		await expect(holiday).toHaveClass(/ring-primary\/70/);
		await expect(block).not.toHaveClass(/ring-primary\/70/);
		await block.click();
		await expect(popover.locator('[data-popover-title]')).toHaveText('Standup');
		await expect(block).toHaveClass(/ring-primary\/70/);

		await popover.getByRole('button', { name: 'Open note' }).click();
		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Standup');
		await expect(page.locator('.cm-content')).toContainText('Daily sync notes');

		await page.locator('[role="tab"]', { hasText: 'Calendar' }).click();
		await expect(page.locator('[data-event-calendar]')).toBeVisible();
		await expect(block).toBeVisible();
		await expect(page.locator('[data-event-popover]')).toHaveCount(0);
		await expect(block).not.toHaveClass(/ring-primary\/70/);
	});
});

/**
 * Seeds the events and opens the Calendar tab once the auto-opened daily note
 * has landed, so that tab cannot take the selection from the calendar.
 */
async function openSeededCalendar(page: Page): Promise<void> {
	await expect(page.locator('[role="tab"]', { hasText: '2026-11-10.md' })).toBeVisible({ timeout: 10_000 });
	await seedEvents(page);
	await openCalendar(page);
}

/** Opens the edit dialog of the Standup block through its popover. */
async function openStandupEditor(page: Page): Promise<void> {
	const block = page.locator(`[data-day-column="2026-11-10"] [data-event-path="${STANDUP}"]`);
	await expect(block).toBeVisible({ timeout: 10_000 });
	// Scroll 09:00 clear of the sticky header first, so the click does not scroll and close the popover.
	await page.locator('[data-time-grid]').evaluate(
		(el) =>
			new Promise<void>((resolve) => {
				el.addEventListener('scroll', () => requestAnimationFrame(() => resolve()), { once: true });
				el.scrollTop = 6 * 64;
			}),
	);
	await block.click();
	await page.locator('[data-event-popover]').getByRole('button', { name: 'Edit' }).click();
	await expect(page.locator('[data-event-dialog]')).toBeVisible();
}

/** Current version of the E2E vault index. */
function indexVersion(page: Page): Promise<number> {
	return page.evaluate(() => window.__e2e.vaultIndex.version);
}

test.describe('Event calendar edit dialog', () => {
	test('editing the time updates the block and the note frontmatter', async ({ vaultPage: page }) => {
		await openSeededCalendar(page);
		await openStandupEditor(page);

		const dialog = page.locator('[data-event-dialog]');
		await dialog.getByLabel('Start').fill('11:00');
		await expect(dialog.getByLabel('End')).toHaveValue('12:00');
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog).toHaveCount(0);

		const block = page.locator(`[data-day-column="2026-11-10"] [data-event-path="${STANDUP}"]`);
		await expect(block.locator('[data-event-time]')).toHaveText('11:00 – 12:00');
		const bytes = await page.evaluate((path) => window.__e2e.fs.readFile(path), STANDUP);
		expect(bytes).toContain('\nstart: 11:00\n');
		expect(bytes).toContain('\nend: 12:00\n');
		expect(bytes).toContain('Daily sync notes');
	});

	test('renaming through the title leaves one settled block at the new path', async ({ vaultPage: page }) => {
		const renamed = '/test-vault/Events/Daily sync.md';
		await openSeededCalendar(page);
		await openStandupEditor(page);
		const before = await indexVersion(page);

		const dialog = page.locator('[data-event-dialog]');
		await dialog.getByLabel('Title').fill('Daily sync');
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog).toHaveCount(0);

		await expect.poll(() => indexVersion(page)).toBeGreaterThan(before);
		await page.waitForTimeout(300);
		// The throttled vault-index refresh settles the overlay (2 s after the event, 10 s spacing).
		await expect(page.locator(`[data-event-path="${renamed}"][data-pending="false"]`)).toHaveCount(1, { timeout: 15_000 });
		await expect(page.locator('[data-day-column] [data-event-path]', { hasText: 'Daily sync' })).toHaveCount(1);
		await expect(page.locator(`[data-event-path="${STANDUP}"]`)).toHaveCount(0);
		expect(await page.evaluate((path) => window.__e2e.fs.exists(path), STANDUP)).toBe(false);
	});

	test('renaming to "1:1 sync" keeps the typed title in event_title', async ({ vaultPage: page }) => {
		const renamed = '/test-vault/Events/1-1 sync.md';
		await openSeededCalendar(page);
		await openStandupEditor(page);

		const dialog = page.locator('[data-event-dialog]');
		await dialog.getByLabel('Title').fill('1:1 sync');
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog).toHaveCount(0);

		const block = page.locator(`[data-day-column="2026-11-10"] [data-event-path="${renamed}"]`);
		await expect(block.locator('[data-event-title]')).toHaveText('1:1 sync');
		expect(await page.evaluate((path) => window.__e2e.fs.exists(path), renamed)).toBe(true);
		const bytes = await page.evaluate((path) => window.__e2e.fs.readFile(path), renamed);
		expect(bytes).toMatch(/^event_title: 1:1 sync$/m);
	});
});

test.describe('Event calendar create, delete and undo', () => {
	test('"New Calendar Event" creates a note the calendar shows, in the folder createNoteOfType uses', async ({ vaultPage: page }) => {
		// No Event type definition and no types base folder: `createNoteOfType` writes to the vault root.
		// The Event type's `_folder` routing is covered by the createEvent service test
		// ("uses the Event type's folder and template").
		const created = '/test-vault/Planning.md';
		await openSeededCalendar(page);

		await openCommandPalette(page);
		await page.locator('input[placeholder*="command"]:visible').first().fill('New Calendar Event');
		await page.getByRole('option', { name: /New Calendar Event/ }).click();
		const dialog = page.locator('[data-event-dialog]');
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled();
		// The clock is 10:00 today, so the default slot is 10:00 to 11:00.
		await expect(dialog.getByLabel('Start')).toHaveValue('10:00');

		await dialog.getByLabel('Title').fill('Planning');
		await dialog.getByLabel('Notes').fill('Agenda items');
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog).toHaveCount(0);

		const block = page.locator(`[data-day-column="2026-11-10"] [data-event-path="${created}"]`);
		await expect(block).toBeVisible();
		await expect(block).toContainText('Planning');
		const bytes = await page.evaluate((path) => window.__e2e.fs.readFile(path), created);
		expect(bytes).toContain('_type: Event\n');
		expect(bytes).toContain('\ndate: 2026-11-10\n');
		expect(bytes).toContain('\nstart: 10:00\n');
		expect(bytes).toContain('Agenda items');
	});

	test('deleting from the popover hides the block, and the toast Undo brings it back settled', async ({ vaultPage: page }) => {
		const block = page.locator(`[data-day-column="2026-11-10"] [data-event-path="${STANDUP}"]`);
		await openSeededCalendar(page);
		await expect(block).toBeVisible({ timeout: 10_000 });
		await page.locator('[data-time-grid]').evaluate(
			(el) =>
				new Promise<void>((resolve) => {
					el.addEventListener('scroll', () => requestAnimationFrame(() => resolve()), { once: true });
					el.scrollTop = 6 * 64;
				}),
		);
		await block.click();
		await page.locator('[data-event-popover]').getByRole('button', { name: 'Delete event' }).click();

		await expect(block).toHaveCount(0);
		await expect(page.locator('[data-event-calendar]')).toBeFocused();
		// The block hides as soon as the pending delete starts; the toast shows once the note is in the Trash.
		const toast = page.locator('[data-sonner-toast]', { hasText: 'Event deleted' });
		await expect(toast).toBeVisible();
		await expect(toast).toContainText('Standup');
		await expect.poll(() => page.evaluate((path) => window.__e2e.fs.exists(path), STANDUP)).toBe(false);
		const before = await indexVersion(page);
		await toast.getByRole('button', { name: 'Undo' }).click();

		await expect(block).toHaveCount(1);
		await expect.poll(() => page.evaluate((path) => window.__e2e.fs.exists(path), STANDUP)).toBe(true);
		await expect.poll(() => indexVersion(page)).toBeGreaterThan(before);
		// The throttled vault-index refresh settles the overlay (2 s after the event, 10 s spacing).
		await expect(page.locator(`[data-event-path="${STANDUP}"][data-pending="false"]`)).toHaveCount(1, { timeout: 15_000 });
		await expect(page.locator('[data-event-calendar]')).toBeFocused();
	});
});

test.describe('Event calendar selected day in a narrow pane', () => {
	test.use({ clockTime: '2026-11-15T10:00:00+01:00', timezoneId: 'Europe/Berlin' });

	test('a selected day at the end of the week scrolls into view', async ({ vaultPage: page }) => {
		await page.setViewportSize({ width: 900, height: 800 });
		await openCalendar(page);
		const grid = page.locator('[data-time-grid]');
		await expect(grid).toBeVisible();

		const days = await page.locator('[data-day-column]').evaluateAll((els) => els.map((el) => el.getAttribute('data-day-column')));
		expect(days.at(-1)).toBe('2026-11-15');
		await expect.poll(() => grid.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
		await expect(page.locator('[data-day-header="2026-11-15"]')).toBeInViewport({ ratio: 1 });
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
