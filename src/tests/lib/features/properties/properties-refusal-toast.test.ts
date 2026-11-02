// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn().mockResolvedValue(undefined),
}));

// svelte-sonner is NOT mocked: the assertion is on the real toast list, which is
// what the user sees stack up.
import { toast } from 'svelte-sonner';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { resetEditor } from '#lib/core/editor/editor.service.js';
import {
	parseAndSetProperties,
	resetProperties,
	updateProperty,
} from '#lib/features/properties/properties.service.js';

const NOTE = '/vault/rich.md';
const COMMENT = '---\ntitle: x  # reviewed\n---\n# Body\n';

describe('panel refusal toast on a note the rewrite would lose', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		resetEditor();
		resetProperties();
		toast.dismiss();
	});
	afterEach(() => {
		toast.dismiss();
		resetEditor();
		vi.useRealTimers();
	});

	it('two refused keystrokes in a text field show one toast', () => {
		editorStore.addTab({ path: NOTE, name: 'rich.md', content: COMMENT, savedContent: COMMENT });
		parseAndSetProperties(COMMENT, NOTE);

		expect(updateProperty('title', 'xa')).toBe(false);
		expect(updateProperty('title', 'xab')).toBe(false);

		const active = toast.getActiveToasts();
		expect(active).toHaveLength(1);
		expect(active[0].title).toMatch(/^rich\.md: .*has comments/);
		expect(editorStore.activeTab?.content).toBe(COMMENT);
	});
});
