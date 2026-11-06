import type { Page } from '@playwright/test';
import { test, expect, TEST_FILES, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { pressShortcut } from '../fixtures/helpers';

const SETTINGS_PATH = `${TEST_VAULT_PATH}/.kokobrain/settings.json`;
const MODS = `${TEST_VAULT_PATH}/_system/mods`;
const MOD_BUTTONS = [
	['tasks', 'Tasks'],
	['capture', 'Quick capture'],
	['weekly', 'Weekly review board'],
	['ideas', 'Ideas'],
	['stats', 'Stats'],
];

/** The test vault with two pins, on the given theme (null keeps the default dark theme). */
function vaultFiles(activeTheme: string | null): Record<string, string> {
	const settings = JSON.parse(TEST_FILES[SETTINGS_PATH]);
	if (activeTheme) settings.appearance = { activeTheme };
	return {
		...TEST_FILES,
		[SETTINGS_PATH]: JSON.stringify(settings, null, 2),
		[`${TEST_VAULT_PATH}/Open projects.view`]:
			"_rail: true\nfilters: '_type == \"Project\"'\nviews:\n  - type: table\n    name: Open projects\n",
		[`${TEST_VAULT_PATH}/Reading queue.view`]:
			"_rail: true\nfilters: '_type == \"Book\"'\nviews:\n  - type: table\n    name: Reading queue\n",
	};
}

/** A real mod with one picker action and five rail buttons. */
const MANY_MOD: Record<string, string> = {
	[`${MODS}/many/manifest.json`]: JSON.stringify({ id: 'many', name: 'Many', version: '1.0.0' }),
	[`${MODS}/many/main.js`]: `export default {
	onload(ctx) {
		ctx.addAction({ id: 'go', title: 'Say hello', run: async () => ctx.notify('Hello from the rail') });
${MOD_BUTTONS.map(([id, title]) => `		ctx.addRailButton({ id: '${id}', title: '${title}', icon: 'lucide:sparkles' });`).join('\n')}
	},
};
`,
};

/** Turns vault mods on through Settings > Labs and waits for the mod to load. */
async function loadMods(page: Page): Promise<void> {
	await pressShortcut(page, 'Mod+Comma');
	const panel = page.locator('[role="dialog"][aria-label="Settings"]');
	await panel.getByRole('button', { name: /^labs$/i }).click();
	await panel.getByRole('switch', { name: 'Vault mods' }).click();
	await expect(panel.locator('[data-mod-folder="many"]')).toContainText('Loaded');
	await page.keyboard.press('Escape');
	await expect(panel).toBeHidden();
}

/** Where the first content of the header strip right of the rail starts, and where the rail ends. */
function headerStart(page: Page): Promise<{ start: number; railRight: number }> {
	return page.evaluate(() => {
		const railRight = document.querySelector('[data-rail]')!.getBoundingClientRect().right;
		const strip = document
			.elementsFromPoint(railRight + 2, 20)
			.map((el) => el.closest('.bg-tab-bar'))
			.find(Boolean)!;
		// The first child too: the Search header holds an input whose own icon and padding push its start right.
		const lefts = [strip.firstElementChild!.getBoundingClientRect().left];
		const range = document.createRange();
		const walker = document.createTreeWalker(strip, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			if (!node.textContent?.trim()) continue;
			range.selectNodeContents(node);
			const rect = range.getBoundingClientRect();
			if (rect.width > 0) lefts.push(rect.left);
		}
		return { start: Math.min(...lefts), railRight };
	});
}

/** WCAG contrast of the last color against the one painted before it, composited through a canvas. */
function contrastOver(page: Page, read: string): Promise<number> {
	return page.evaluate((read) => {
		const paint = (colors: string[]) => {
			const canvas = document.createElement('canvas');
			canvas.width = canvas.height = 1;
			const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
			for (const color of colors) {
				ctx.fillStyle = color;
				ctx.fillRect(0, 0, 1, 1);
			}
			return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
		};
		const luminance = (rgb: number[]) => {
			const [r, g, b] = rgb.map((v) => {
				const c = v / 255;
				return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
			});
			return 0.2126 * r + 0.7152 * g + 0.0722 * b;
		};
		const rail = getComputedStyle(document.querySelector('[data-rail]')!).backgroundColor;
		// `read` names either a divider, painted on the rail, or an active row, whose title is painted on its tint.
		const el = document.querySelector(read)!;
		const title = el.querySelector('[data-rail-title]');
		const below = title ? [rail, getComputedStyle(el).backgroundColor] : [rail];
		const top = title ? getComputedStyle(title).color : getComputedStyle(el).backgroundColor;
		const a = luminance(paint(below));
		const b = luminance(paint([...below, top]));
		return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
	}, read);
}

test.describe('Labeled rail', () => {
	test.use({ viewport: { width: 1440, height: 900 }, vaultFiles: { ...vaultFiles(null), ...MANY_MOD } });

	test('is 192 px wide, with the four section titles once a mod is loaded', async ({ vaultPage: page }) => {
		await page.locator('[data-rail-item^="view:"]').first().waitFor();
		const titles = page.locator('[data-rail-section-title]');
		await expect(titles).toHaveCount(3);
		await loadMods(page);

		expect((await page.locator('[data-rail]').boundingBox())!.width).toBe(192);
		for (const text of ['Workspace', 'Browse', 'Pinned', 'Actions']) {
			await expect(page.locator(`[data-rail-section-title="${text}"]`)).toBeVisible();
		}
		await expect(titles).toHaveCount(4);
	});

	for (const key of ['inbox', 'search', 'types', 'calendar', 'files']) {
		test(`the header beside the rail starts past it, with ${key} picked`, async ({ vaultPage: page }) => {
			await page.locator(`[data-rail-item="${key}"]`).click();
			await expect(page.locator(`[data-rail-item="${key}"]`)).toHaveAttribute('aria-current', 'page');
			await expect.poll(async () => (await headerStart(page)).start).toBeLessThan(1440);
			const { start, railRight } = await headerStart(page);
			// 12 px is the pad at this width, so an unset variable (0 px) fails here.
			expect(start).toBeGreaterThanOrEqual(railRight + 12);
		});
	}

	test('the top strip continues the neighbouring header, and the edge starts below it', async ({ vaultPage: page }) => {
		await page.locator('[data-rail-item="inbox"]').click();
		await expect(page.locator('[data-note-list-label]')).toBeVisible();
		const top = await page.evaluate(() => {
			const nav = document.querySelector('[data-rail]')!;
			const strip = document.querySelector('[data-rail-strip]')!;
			const edge = document.querySelector('[data-rail-edge]')!.getBoundingClientRect();
			const header = document.querySelector('[data-note-list-label]')!.parentElement!;
			return {
				navBorder: getComputedStyle(nav).borderRightWidth,
				stripBorder: getComputedStyle(strip).borderRightWidth,
				stripBg: getComputedStyle(strip).backgroundColor,
				headerBg: getComputedStyle(header).backgroundColor,
				edgeTop: edge.top,
				edgeWidth: edge.width,
			};
		});
		expect(top.navBorder).toBe('0px');
		expect(top.stripBorder).toBe('0px');
		expect(top.stripBg).toBe(top.headerBg);
		expect(top.edgeTop).toBe(40);
		expect(top.edgeWidth).toBe(1);
	});

	test('a mod button found by its title opens the picker with the mod action', async ({ vaultPage: page }) => {
		await loadMods(page);
		await page.locator('[data-rail-actions] [aria-label="Tasks"]').click();
		await expect(page.getByText('Say hello')).toBeVisible();
	});
});

test.describe('Resizing the labeled rail', () => {
	/** A note without `_organized` counts as organized, so the Inbox lens needs these for its rows. */
	const FILES = {
		...vaultFiles(null),
		[`${TEST_VAULT_PATH}/Unsorted one.md`]: '---\n_organized: false\n---\nUnsorted one\n',
		[`${TEST_VAULT_PATH}/Unsorted two.md`]: '---\n_organized: false\n---\nUnsorted two\n',
	};

	test.use({ viewport: { width: 1440, height: 900 }, vaultFiles: FILES });

	const handle = (page: Page) => page.locator('[data-rail-resize]');

	/** Presses the handle at height `y` and drags it so its center lands on `x`. */
	async function dragRailTo(page: Page, x: number, y = 400): Promise<void> {
		const box = (await handle(page).boundingBox())!;
		await page.mouse.move(box.x + box.width / 2, y);
		await page.mouse.down();
		await page.mouse.move(x, y, { steps: 8 });
		await page.mouse.up();
		await page.mouse.move(900, 500);
	}

	async function railWidth(page: Page): Promise<number> {
		return Math.round((await page.locator('[data-rail]').boundingBox())!.width);
	}

	function settingsFile(page: Page): Promise<string> {
		return page.evaluate((path) => window.__e2e.fs.readFile(path), SETTINGS_PATH);
	}

	/** The width in settings.json on the mock FS; the write comes up to 500 ms after the drag ends, so poll it. */
	async function savedWidth(page: Page): Promise<unknown> {
		return JSON.parse(await settingsFile(page)).layout.railWidth;
	}

	/** A page load wipes the mock FS, so the vault's files go back in, with this settings.json, before the vault reopens. */
	async function restartWithSettings(page: Page, settingsJson: string): Promise<void> {
		await page.reload({ waitUntil: 'networkidle' });
		await page.waitForFunction(() => window.__e2e?.fs !== undefined, { timeout: 10_000 });
		await page.evaluate((files) => window.__e2e.fs.populate(files), { ...FILES, [SETTINGS_PATH]: settingsJson });
		await page.evaluate((path) => window.__e2e.dialog.setOpenResponse(path), TEST_VAULT_PATH);
		await page.getByRole('button', { name: 'Open Vault' }).click();
		await expect(page.locator('[data-rail]')).toBeVisible({ timeout: 10_000 });
	}

	test('a drag to 260 gives about 260 px, is saved, and a restart opens at it', async ({ vaultPage: page }) => {
		expect(await railWidth(page)).toBe(192);

		await dragRailTo(page, 260);
		const width = await railWidth(page);
		expect(Math.abs(width - 260)).toBeLessThanOrEqual(2);
		await expect.poll(() => savedWidth(page)).toBe(width);

		await restartWithSettings(page, await settingsFile(page));
		expect(await railWidth(page)).toBe(width);
	});

	test('a drag clamps to 320 and to 140, and a double-click on the handle gives 192 and saves it', async ({ vaultPage: page }) => {
		await dragRailTo(page, 1000);
		expect(await railWidth(page)).toBe(320);

		await dragRailTo(page, 10);
		expect(await railWidth(page)).toBe(140);
		await expect.poll(() => savedWidth(page)).toBe(140);

		await handle(page).dblclick();
		expect(await railWidth(page)).toBe(192);
		await expect.poll(() => savedWidth(page)).toBe(192);
	});

	// Chromium has two guards against the row's native drag: the handle's mousedown preventDefault and the window's
	// dragstart block. Either alone keeps this passing, so it fails only with both gone; Rail.test.ts pins each one.
	test('a drag left from 320 px on the Inbox lens follows the pointer past a note row, whose native drag does not cancel it', async ({ vaultPage: page }) => {
		await page.locator('[data-rail-item="inbox"]').click();
		const row = page.locator('[data-note-row]').first();
		await row.waitFor();
		await dragRailTo(page, 1000);
		expect(await railWidth(page)).toBe(320);
		const rowBox = (await row.boundingBox())!;
		const y = rowBox.y + rowBox.height / 2;

		await dragRailTo(page, 150, y);

		// The premise: the rail shrank enough to bring a draggable row under the pressed point.
		const underPress = await page.evaluate(
			([x, y]) => document.elementsFromPoint(x, y).some((el) => el.closest('[data-note-row]')?.getAttribute('draggable') === 'true'),
			[320, y],
		);
		expect(underPress).toBe(true);
		expect(Math.abs((await railWidth(page)) - 150)).toBeLessThanOrEqual(2);
		await expect.poll(async () => Math.abs(Number(await savedWidth(page)) - 150)).toBeLessThanOrEqual(2);
	});

	for (const [target, width] of [[1000, 320], [10, 140]] as const) {
		test(`the header text starts past the rail at ${width} px`, async ({ vaultPage: page }) => {
			await dragRailTo(page, target);
			expect(await railWidth(page)).toBe(width);
			for (const key of ['inbox', 'search', 'types', 'calendar', 'files']) {
				await page.locator(`[data-rail-item="${key}"]`).click();
				await expect(page.locator(`[data-rail-item="${key}"]`)).toHaveAttribute('aria-current', 'page');
				await expect.poll(async () => (await headerStart(page)).start, key).toBeLessThan(1440);
				const { start, railRight } = await headerStart(page);
				expect(start, key).toBeGreaterThanOrEqual(railRight + 12);
			}
		});
	}
});

test.describe('Labeled rail at 600 px height, with 2 pins and 5 mod buttons', () => {
	test.use({ viewport: { width: 1440, height: 600 }, vaultFiles: { ...vaultFiles(null), ...MANY_MOD } });

	test('the whole rail scrolls with no scrollbar, and nothing is lost', async ({ vaultPage: page }) => {
		await page.locator('[data-rail-pinned] [data-rail-item]').first().waitFor();
		await loadMods(page);
		await expect(page.locator('[data-rail-actions] [data-rail-item]')).toHaveCount(MOD_BUTTONS.length);

		const measured = await page.evaluate(() => {
			const rail = document.querySelector<HTMLElement>('[data-rail]')!;
			const overflowing = rail.scrollHeight > rail.clientHeight;
			const sideways = rail.scrollWidth > rail.clientWidth;
			const scrollbar = getComputedStyle(rail).scrollbarWidth;
			const gutter = rail.offsetWidth - rail.clientWidth;
			rail.scrollTop = rail.scrollHeight;
			const view = rail.getBoundingClientRect();
			const archive = document.querySelector('[data-rail-item="archive"]')!.getBoundingClientRect();
			const edge = document.querySelector('[data-rail-edge]')!.getBoundingClientRect();
			return {
				overflowing,
				sideways,
				scrollbar,
				gutter,
				moved: rail.scrollTop > 0,
				pinHeights: [...document.querySelectorAll('[data-rail-pinned] [data-rail-item]')].map((pin) => pin.getBoundingClientRect().height),
				archiveTop: archive.top,
				archiveBelowView: archive.bottom - view.bottom,
				stripTop: document.querySelector('[data-rail-strip]')!.getBoundingClientRect().top,
				edgeTop: edge.top,
				edgeBelowView: edge.bottom - view.bottom,
			};
		});
		expect(measured).toMatchObject({
			overflowing: true,
			sideways: false,
			scrollbar: 'none',
			gutter: 0,
			moved: true,
			pinHeights: [28, 28],
			stripTop: 0,
			edgeTop: 40,
			edgeBelowView: 0,
		});
		// Reachable: fully in view, below the strip.
		expect(measured.archiveBelowView).toBeLessThanOrEqual(0);
		expect(measured.archiveTop).toBeGreaterThanOrEqual(40);
	});
});

for (const [name, theme, htmlClass] of [['Lavender Haze', 'Lavender Haze', /^(?!.*\bdark\b)/], ['the default dark theme', null, /\bdark\b/]] as const) {
	test.describe(`Labeled rail contrast on ${name}`, () => {
		test.use({ viewport: { width: 1440, height: 900 }, vaultFiles: vaultFiles(theme) });

		test('the dividers show on the rail background', async ({ vaultPage: page }) => {
			// The measurements below mean nothing on the wrong theme.
			await expect(page.locator('html')).toHaveClass(htmlClass);
			for (const divider of ['[data-rail-divider]', '[data-rail-pinned-divider]']) {
				await page.locator(divider).waitFor();
				expect(await contrastOver(page, divider)).toBeGreaterThanOrEqual(1.5);
			}
		});

		test('every active title stays readable on its tint', async ({ vaultPage: page }) => {
			for (const key of ['inbox', 'today', 'favorites', 'types', 'calendar', 'files', 'archive']) {
				const item = page.locator(`[data-rail-item="${key}"]`);
				await item.click();
				await expect(item).toHaveAttribute('aria-current', 'page');
				expect(await contrastOver(page, `[data-rail-item="${key}"]`), key).toBeGreaterThanOrEqual(4.5);
			}
		});
	});
}
