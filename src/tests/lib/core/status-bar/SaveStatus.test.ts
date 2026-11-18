// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// settingsStore reads localStorage at module load; stub it before any import pulls it in.
setupLocalStorage();

import { mount, unmount, flushSync } from 'svelte';
import SaveStatus from '#lib/core/status-bar/SaveStatus.svelte';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';

/** Text of the labels assistive technology can reach (outside any `aria-hidden` subtree). */
function exposedText(root: HTMLElement): string {
	const clone = root.cloneNode(true) as HTMLElement;
	for (const hidden of clone.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
	return clone.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

describe('SaveStatus (the status bar save slot)', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	function mountStatus() {
		component = mount(SaveStatus, { target });
		flushSync();
	}

	function slot(): HTMLElement | null {
		return target.querySelector<HTMLElement>('[data-save-status]');
	}

	beforeEach(() => {
		clearLocalStorage();
		editorStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		editorStore.reset();
		document.body.innerHTML = '';
	});

	it('a dirty tab shows Modified without a pulse', () => {
		editorStore.addTab({ path: '/vault/a.md', name: 'a', content: 'edited', savedContent: 'original' });
		mountStatus();

		expect(slot()).not.toBeNull();
		expect(exposedText(slot()!)).toBe('Modified');
		expect(target.querySelector('.animate-pulse')).toBeNull();
	});

	it('a saved tab shows Saved', () => {
		editorStore.addTab({ path: '/vault/a.md', name: 'a', content: 'same', savedContent: 'same' });
		mountStatus();

		expect(exposedText(slot()!)).toBe('Saved');
	});

	it('keeps both labels in the slot and hides only the inactive one', () => {
		editorStore.addTab({ path: '/vault/a.md', name: 'a', content: 'same', savedContent: 'same' });
		mountStatus();

		// Both labels are laid out so the slot is as wide as the wider one.
		expect(slot()!.textContent).toContain('Saved');
		expect(slot()!.textContent).toContain('Modified');
		const hidden = slot()!.querySelectorAll<HTMLElement>('[aria-hidden="true"].invisible');
		expect(hidden).toHaveLength(1);
		expect(hidden[0].textContent?.trim()).toBe('Modified');
	});

	it('swaps the exposed label when the tab turns dirty and back', () => {
		editorStore.addTab({ path: '/vault/a.md', name: 'a', content: 'same', savedContent: 'same' });
		mountStatus();
		const before = slot();

		editorStore.updateContent('same plus');
		flushSync();
		expect(exposedText(slot()!)).toBe('Modified');
		// The same element stays mounted, so the slot is never rebuilt.
		expect(slot()).toBe(before);

		editorStore.markSavedByPath('/vault/a.md', 'same plus');
		flushSync();
		expect(exposedText(slot()!)).toBe('Saved');
		expect(slot()).toBe(before);
	});

	it('renders nothing with no tab', () => {
		mountStatus();
		expect(slot()).toBeNull();
		expect(target.textContent?.trim()).toBe('');
	});

	it('renders nothing for a virtual tab', () => {
		editorStore.addTab({ path: '__virtual__/tasks', name: 'Tasks', content: '', savedContent: '', fileType: 'tasks' });
		mountStatus();
		expect(slot()).toBeNull();
		expect(target.textContent?.trim()).toBe('');
	});
});
