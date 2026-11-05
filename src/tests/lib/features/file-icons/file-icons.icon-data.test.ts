import { describe, it, expect } from 'vitest';
import { getIconsForPack, getIconSync, preloadPacks } from '#lib/features/file-icons/file-icons.icon-data.js';

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
});
