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
