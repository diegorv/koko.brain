import { describe, expect, it } from 'vitest';
import { createLanSyncPlugin } from '$lib/plugins/lan-sync/lan-sync.plugin';

describe('createLanSyncPlugin', () => {
	it('returns a plugin with stable id', () => {
		const plugin = createLanSyncPlugin();
		expect(plugin.id).toBe('lan-sync');
	});

	it('init resolves without throwing (Stage 0 no-op)', async () => {
		const plugin = createLanSyncPlugin();
		await expect(plugin.init()).resolves.toBeUndefined();
	});

	it('init is idempotent', async () => {
		const plugin = createLanSyncPlugin();
		await plugin.init();
		await expect(plugin.init()).resolves.toBeUndefined();
	});

	it('getSettingsTab returns null until panel ships', () => {
		expect(createLanSyncPlugin().getSettingsTab()).toBeNull();
	});

	it('getContextMenuEntry returns null for folders until push dialog ships', () => {
		const plugin = createLanSyncPlugin();
		expect(plugin.getContextMenuEntry('/vault/some-folder', true)).toBeNull();
	});

	it('getContextMenuEntry returns null for files until push dialog ships', () => {
		const plugin = createLanSyncPlugin();
		expect(plugin.getContextMenuEntry('/vault/note.md', false)).toBeNull();
	});
});
