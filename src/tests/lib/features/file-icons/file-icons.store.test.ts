import { describe, it, expect, beforeEach } from 'vitest';
import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';

describe('fileIconsStore', () => {
	beforeEach(() => {
		fileIconsStore.reset();
	});

	it('starts with empty state', () => {
		expect(fileIconsStore.entries).toEqual([]);
		expect(fileIconsStore.recentIcons).toEqual([]);
		expect(fileIconsStore.frontmatterIcons.size).toBe(0);
	});

	describe('setEntries', () => {
		it('replaces entries list', () => {
			const entries = [{ path: '/a', iconPack: 'lucide', iconName: 'file' }] as any;
			fileIconsStore.setEntries(entries);
			expect(fileIconsStore.entries).toBe(entries);
		});
	});

	describe('entries lookup', () => {
		it('entries are accessible after set', () => {
			const entries = [
				{ path: '/a', iconPack: 'lucide', iconName: 'file' },
				{ path: '/b', iconPack: 'lucide', iconName: 'folder' },
			] as any;
			fileIconsStore.setEntries(entries);

			expect(fileIconsStore.entries).toHaveLength(2);
			expect(fileIconsStore.entries[0].path).toBe('/a');
		});
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

	describe('entriesMap (derived Map)', () => {
		it('returns Map of path to entry', () => {
			const entries = [
				{ path: '/a', iconPack: 'lucide', iconName: 'file' },
				{ path: '/b', iconPack: 'lucide', iconName: 'folder' },
			] as any;
			fileIconsStore.setEntries(entries);

			const map = fileIconsStore.entriesMap;
			expect(map).toBeInstanceOf(Map);
			expect(map.size).toBe(2);
			expect(map.get('/a')).toEqual(entries[0]);
			expect(map.get('/b')).toEqual(entries[1]);
		});

		it('is empty when no entries exist', () => {
			expect(fileIconsStore.entriesMap.size).toBe(0);
		});
	});

	describe('getIcon', () => {
		it('returns matching entry for path', () => {
			fileIconsStore.setEntries([
				{ path: '/a', iconPack: 'lucide', iconName: 'file' },
			] as any);

			expect(fileIconsStore.getIcon('/a')).toEqual(
				expect.objectContaining({ path: '/a', iconName: 'file' }),
			);
		});

		it('returns undefined for non-existing path', () => {
			fileIconsStore.setEntries([
				{ path: '/a', iconPack: 'lucide', iconName: 'file' },
			] as any);

			expect(fileIconsStore.getIcon('/b')).toBeUndefined();
		});
	});

	describe('hasIcon', () => {
		it('returns true when path has an icon', () => {
			fileIconsStore.setEntries([
				{ path: '/a', iconPack: 'lucide', iconName: 'file' },
			] as any);

			expect(fileIconsStore.hasIcon('/a')).toBe(true);
		});

		it('returns false when path has no icon', () => {
			fileIconsStore.setEntries([
				{ path: '/a', iconPack: 'lucide', iconName: 'file' },
			] as any);

			expect(fileIconsStore.hasIcon('/b')).toBe(false);
		});
	});

	describe('reset', () => {
		it('clears all state', () => {
			fileIconsStore.setEntries([{ path: '/a' }] as any);
			fileIconsStore.setRecentIcons([{ iconName: 'star' }] as any);
			fileIconsStore.updateFrontmatterIcon('/a', { iconPack: 'lucide' as any, iconName: 'star' });

			fileIconsStore.reset();

			expect(fileIconsStore.entries).toEqual([]);
			expect(fileIconsStore.recentIcons).toEqual([]);
			expect(fileIconsStore.frontmatterIcons.size).toBe(0);
		});

		it('clears derived state too', () => {
			fileIconsStore.setEntries([{ path: '/a', iconPack: 'lucide', iconName: 'file' }] as any);
			fileIconsStore.reset();

			expect(fileIconsStore.entriesMap.size).toBe(0);
			expect(fileIconsStore.getIcon('/a')).toBeUndefined();
			expect(fileIconsStore.hasIcon('/a')).toBe(false);
		});
	});
});
