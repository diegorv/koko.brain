import { test, expect } from '../fixtures/test-vault';
import { openCommandPalette } from '../fixtures/helpers';
import type { Page } from '@playwright/test';

test.use({ clockTime: '2026-11-10T10:00:00+01:00', timezoneId: 'Europe/Berlin' });

const STANDUP = '/test-vault/Events/Standup.md';
const HOLIDAY = '/test-vault/Events/Holiday.md';
const RETREAT = '/test-vault/Events/Retreat.md';

// No note with a problem: a Needs-attention badge would land above the grid
// after the chips and shift them under a press measured before it.
const FILES: Record<string, string> = {
	'/test-vault/Events/': '',
	[STANDUP]: '---\n_type: Event\ndate: 2026-11-10\nstart: 09:00\nend: 10:00\n---\nDaily sync notes\n',
	[HOLIDAY]: '---\n_type: Event\ndate: 2026-11-12\nall_day: true\n---\n',
	[RETREAT]: '---\n_type: Event\ndate: 2026-11-10\nend_date: 2026-11-11\n---\n',
};

async function seedEvents(page: Page): Promise<void> {
	await page.evaluate(({ files }) => {
		const e2e = (window as any).__e2e;
		e2e.fs.populate(files);
		e2e.events.emit('vault-index-updated', {
			changed: true,
			affected: Object.keys(files).filter((p) => !p.endsWith('/')),
			version: e2e.vaultIndex.version,
		});
	}, { files: FILES });
}

/** Seeds the events and opens the Calendar tab once the auto-opened daily note has landed. */
async function openCalendar(page: Page): Promise<void> {
	await seedEvents(page);
	await expect(page.locator('[role="tab"]', { hasText: '2026-11-10.md' })).toBeVisible({ timeout: 10_000 });
	await openCommandPalette(page);
	await page.locator('input[placeholder*="command"]:visible').first().fill('Toggle Calendar View');
	await page.getByRole('option', { name: /Toggle Calendar View/ }).click();
	await expect(page.locator('[data-event-calendar]')).toBeVisible();
}

/** Reads a note's bytes from the E2E disk. */
function readNote(page: Page, path: string): Promise<string> {
	return page.evaluate((p) => window.__e2e.fs.readFile(p), path);
}

/** Presses the mouse on the center of `from`, drags in steps to the center of `to`, and releases. */
async function dragTo(page: Page, from: { x: number; y: number; width: number; height: number }, to: { x: number; y: number; width: number; height: number }): Promise<void> {
	await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
	await page.mouse.down();
	await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
	await page.mouse.up();
}

test.describe('Event calendar day drag: month view', () => {
	const chip = (page: Page, day: string, path: string) => page.locator(`[data-month-cell="${day}"] [data-event-path="${path}"]`);

	async function openMonth(page: Page): Promise<void> {
		await openCalendar(page);
		await page.getByRole('tab', { name: 'Month' }).click();
		await expect(chip(page, '2026-11-10', STANDUP)).toBeVisible({ timeout: 10_000 });
	}

	test('dragging a chip to another cell moves the day only, and Meta+Z undoes it', async ({ vaultPage: page }) => {
		await openMonth(page);

		const from = (await chip(page, '2026-11-10', STANDUP).boundingBox())!;
		const to = (await page.locator('[data-month-cell="2026-11-12"]').boundingBox())!;
		await dragTo(page, from, to);

		await expect(chip(page, '2026-11-12', STANDUP)).toHaveText('09:00 Standup');
		await expect(chip(page, '2026-11-10', STANDUP)).toHaveCount(0);
		await expect.poll(() => readNote(page, STANDUP)).toContain('\ndate: 2026-11-12\n');
		const bytes = await readNote(page, STANDUP);
		expect(bytes).toContain('\nstart: 09:00\n');
		expect(bytes).toContain('\nend: 10:00\n');
		// The drop's click is swallowed: no popover.
		await expect(page.locator('[data-event-popover]')).toHaveCount(0);

		await page.keyboard.press('Meta+z');
		await expect.poll(() => readNote(page, STANDUP)).toContain('\ndate: 2026-11-10\n');
		await expect(page.locator('[data-sonner-toast]', { hasText: 'Undone: Move event' })).toBeVisible();
		await expect(chip(page, '2026-11-10', STANDUP)).toHaveText('09:00 Standup');
	});

	test('a span chip does not drag: it stays and the note is unchanged', async ({ vaultPage: page }) => {
		await openMonth(page);

		const span = chip(page, '2026-11-10', RETREAT);
		await expect(span).toHaveAttribute('data-readonly', 'true');
		const from = (await span.boundingBox())!;
		const to = (await page.locator('[data-month-cell="2026-11-17"]').boundingBox())!;
		await dragTo(page, from, to);

		await expect(chip(page, '2026-11-10', RETREAT)).toHaveText('Retreat');
		await expect(chip(page, '2026-11-11', RETREAT)).toHaveText('Retreat');
		await expect(chip(page, '2026-11-17', RETREAT)).toHaveCount(0);
		expect(await readNote(page, RETREAT)).toBe(FILES[RETREAT]);
	});
});

test.describe('Event calendar day drag: all-day lane', () => {
	const chip = (page: Page, day: string, path: string) => page.locator(`[data-all-day-cell="${day}"] [data-event-path="${path}"]`);

	async function openWeek(page: Page): Promise<void> {
		await openCalendar(page);
		await expect(chip(page, '2026-11-12', HOLIDAY)).toBeVisible({ timeout: 10_000 });
	}

	test('dragging a chip to another day keeps it all-day, and Meta+Z undoes it', async ({ vaultPage: page }) => {
		await openWeek(page);

		const from = (await chip(page, '2026-11-12', HOLIDAY).boundingBox())!;
		const to = (await page.locator('[data-all-day-cell="2026-11-13"]').boundingBox())!;
		await dragTo(page, from, to);

		await expect(chip(page, '2026-11-13', HOLIDAY)).toHaveText('Holiday');
		await expect(chip(page, '2026-11-12', HOLIDAY)).toHaveCount(0);
		await expect.poll(() => readNote(page, HOLIDAY)).toContain('\ndate: 2026-11-13\n');
		const bytes = await readNote(page, HOLIDAY);
		expect(bytes).toContain('\nall_day: true\n');
		expect(bytes).not.toMatch(/\n(start|end):/);
		await expect(page.locator('[data-event-popover]')).toHaveCount(0);

		await page.keyboard.press('Meta+z');
		await expect.poll(() => readNote(page, HOLIDAY)).toContain('\ndate: 2026-11-12\n');
		await expect(page.locator('[data-sonner-toast]', { hasText: 'Undone: Move event' })).toBeVisible();
		await expect(chip(page, '2026-11-12', HOLIDAY)).toHaveText('Holiday');
	});

	test('a span chip does not drag: it stays and the note is unchanged', async ({ vaultPage: page }) => {
		await openWeek(page);

		const span = chip(page, '2026-11-10', RETREAT);
		await expect(span).toHaveAttribute('data-readonly', 'true');
		const from = (await span.boundingBox())!;
		const to = (await page.locator('[data-all-day-cell="2026-11-13"]').boundingBox())!;
		await dragTo(page, from, to);

		await expect(chip(page, '2026-11-10', RETREAT)).toHaveText('Retreat');
		await expect(chip(page, '2026-11-11', RETREAT)).toHaveText('Retreat');
		await expect(chip(page, '2026-11-13', RETREAT)).toHaveCount(0);
		expect(await readNote(page, RETREAT)).toBe(FILES[RETREAT]);
	});
});
