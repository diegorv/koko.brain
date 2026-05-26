import { describe, it, expect, beforeEach } from 'vitest';
import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';

describe('fileIconsStore', () => {
	beforeEach(() => {
		fileIconsStore.reset();
	});

	it('starts with empty state', () => {
		expect(fileIconsStore.recentIcons).toEqual([]);
		expect(fileIconsStore.frontmatterIcons.size).toBe(0);
	});

	describe('frontmatter icons', () => {
		it('setFrontmatterIcons replaces the map', () => {
			const icons = new Map([['/ a', { iconPack: 'lucide' as any, iconName: 'star' }]]);
			fileIconsStore.setFrontmatterIcons(icons);
			expect(fileIconsStore.frontmatterIcons).toEqual(icons);
		});

		it('getFrontmatterIcon returns matching icon', () => {
			fileIconsStore.setFrontmatterIcons(
				new Map([['/a', { iconPack: 'lucide' as any, iconName: 'star' }]]),
			);
			expect(fileIconsStore.getFrontmatterIcon('/a')).toEqual({ iconPack: 'lucide', iconName: 'star' });
		});

		it('updateFrontmatterIcon sets a new icon', () => {
			fileIconsStore.updateFrontmatterIcon('/a', { iconPack: 'lucide' as any, iconName: 'star' });
			expect(fileIconsStore.frontmatterIcons.get('/a')).toEqual({ iconPack: 'lucide', iconName: 'star' });
		});

		it('updateFrontmatterIcon removes icon when null', () => {
			fileIconsStore.updateFrontmatterIcon('/a', { iconPack: 'lucide' as any, iconName: 'star' });
			fileIconsStore.updateFrontmatterIcon('/a', null);
			expect(fileIconsStore.frontmatterIcons.has('/a')).toBe(false);
		});
	});

	describe('reset', () => {
		it('clears all state', () => {
			fileIconsStore.setRecentIcons([{ iconName: 'star' }] as any);
			fileIconsStore.updateFrontmatterIcon('/a', { iconPack: 'lucide' as any, iconName: 'star' });

			fileIconsStore.reset();

			expect(fileIconsStore.recentIcons).toEqual([]);
			expect(fileIconsStore.frontmatterIcons.size).toBe(0);
		});
	});
});
