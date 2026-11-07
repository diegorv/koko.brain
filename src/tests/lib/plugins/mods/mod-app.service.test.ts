// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

import { saveFileByPath, syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { openOrCreateNote } from '#lib/core/note-creator/note-creator.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { MOD_APP } from '#lib/plugins/mods/mod-app.service.js';

describe('MOD_APP raw extension members', () => {
	it.each([
		['railRegistryStore', railRegistryStore],
		['settingsStore', settingsStore],
		['openOrCreateNote', openOrCreateNote],
		['saveFileByPath', saveFileByPath],
		['syncExternalContentToEditor', syncExternalContentToEditor],
	] as const)('%s is the app object itself, not a wrapper or copy', (name, value) => {
		expect(MOD_APP[name]).toBe(value);
	});
});
