import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { getIconsForPack, getIconSync, preloadPacks } from '#lib/features/file-icons/file-icons.icon-data.js';
import { filterIcons } from '#lib/features/file-icons/file-icons.logic.js';

// Loads the real lucide-static: the shape of its exports is what this guards.
describe('lucide pack', () => {
	it('loads the icons of the installed lucide-static', async () => {
		const icons = await getIconsForPack('lucide');
		const names = icons.map((i) => i.name);

		expect(names).toEqual(expect.arrayContaining(['check', 'file-text', 'arrow-right']));
	});

	it('gives every icon a unique name, as the picker grid keys by it', async () => {
		const names = (await getIconsForPack('lucide')).map((i) => i.name);

		expect(new Set(names).size).toBe(names.length);
	});

	it('keeps only the inner svg content', async () => {
		const icons = await getIconsForPack('lucide');
		const check = icons.find((i) => i.name === 'check');

		expect(check?.svgContent).toContain('<path');
		expect(check?.svgContent).not.toContain('<svg');
		expect(check?.viewBox).toBe('0 0 24 24');
	});

	it('resolves a name synchronously once preloaded', async () => {
		await preloadPacks(['lucide']);

		expect(getIconSync('lucide', 'check')?.name).toBe('check');
	});

	it('returns undefined for a name the pack does not have', async () => {
		await preloadPacks(['lucide']);

		expect(getIconSync('lucide', 'not-a-lucide-icon')).toBeUndefined();
	});

	it.each(['clock-1', 'calendar-1', 'columns-2', 'arrow-down-a-z', 'grid-2x2', 'arrow-down-0-1'])(
		'names the icon %s as lucide does',
		async (name) => {
			await preloadPacks(['lucide']);

			expect(getIconSync('lucide', name)?.name).toBe(name);
		},
	);

	// These exports' class attribute drops the digit (Trash2 is class lucide-trash), and the
	// spelling still names a file of the package.
	it.each([
		['trash-2', 'trash'],
		['layers-3', 'layers'],
		['music-2', 'eighth-note'],
	])('resolves %s to the icon it became, %s', async (spelling, name) => {
		await preloadPacks(['lucide']);

		expect(getIconSync('lucide', spelling)?.name).toBe(name);
	});

	it.each([
		['trash2', 'trash'],
		['clock1', 'clock-1'],
		['calendar1', 'calendar-1'],
		['columns2', 'columns-2'],
		['arrow-down-az', 'arrow-down-a-z'],
		['grid2x2', 'grid-2x2'],
		['grid2-x2', 'grid-2x2'],
		['arrow-down01', 'arrow-down-0-1'],
		['axis3-d', 'axis-3d'],
		['home', 'house'],
	])('keeps resolving %s, the spelling the picker used to write', async (spelling, name) => {
		await preloadPacks(['lucide']);

		expect(getIconSync('lucide', spelling)?.name).toBe(name);
	});

	it('keeps resolving the spelling the picker used to write for every export', async () => {
		await preloadPacks(['lucide']);
		const lucide = (await import('lucide-static')) as unknown as Record<string, unknown>;
		const spellings = Object.keys(lucide)
			.filter((key) => typeof lucide[key] === 'string')
			.map((key) => key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase());

		expect(spellings.length).toBeGreaterThan(0);
		expect(spellings.filter((name) => !getIconSync('lucide', name))).toEqual([]);
	});

	it('resolves every icon file name the installed package ships', async () => {
		await preloadPacks(['lucide']);
		const shipped = readdirSync(join(process.cwd(), 'node_modules/lucide-static/icons'))
			.filter((file) => file.endsWith('.svg'))
			.map((file) => file.slice(0, -'.svg'.length));

		expect(shipped.length).toBeGreaterThan(0);
		expect(shipped.filter((name) => !getIconSync('lucide', name))).toEqual([]);
	});

	it('finds an icon by any of its spellings in the picker search', async () => {
		const icons = await getIconsForPack('lucide');

		for (const query of ['trash-2', 'trash2', 'clock-1', 'clock1', 'arrow-down-a-z', 'arrow-down-az']) {
			expect(filterIcons(icons, query).length, query).toBeGreaterThan(0);
		}
		expect(filterIcons(icons, 'trash-2').map((i) => i.name)).toContain('trash');
	});

	it('does not lend its spellings to another pack', async () => {
		await preloadPacks(['lucide', 'feather']);

		expect(getIconSync('feather', 'clock1')).toBeUndefined();
	});
});
