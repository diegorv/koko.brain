// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Tauri IPC boundary: the composer only talks to Rust through these two.
vi.mock('#lib/contracts/ipc.js', () => ({
	call: vi.fn(async () => undefined),
	on: vi.fn(async () => () => {}),
}));

import { mount, unmount, flushSync } from 'svelte';
import { on } from '#lib/contracts/ipc.js';
import { THEME_VARS_STORAGE_KEY } from '#lib/core/settings/theme.service.js';
import ComposerPage from '../../routes/composer/+page.svelte';

const root = document.documentElement;

function storeThemeVars(vars: Record<string, string>): void {
	localStorage.setItem(THEME_VARS_STORAGE_KEY, JSON.stringify(vars));
}

async function settle(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
	flushSync();
}

describe('composer route theme', () => {
	let target: HTMLElement;
	let component: ReturnType<typeof mount> | undefined;

	beforeEach(() => {
		localStorage.clear();
		root.style.cssText = '';
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (component) unmount(component);
		component = undefined;
		target.remove();
		vi.mocked(on).mockClear();
	});

	it('applies the main window theme on mount', async () => {
		storeThemeVars({ '--popover': '#101010', '--popover-foreground': '#fafafa' });

		component = mount(ComposerPage, { target });
		await settle();

		expect(root.style.getPropertyValue('--popover')).toBe('#101010');
		expect(root.style.getPropertyValue('--popover-foreground')).toBe('#fafafa');
	});

	it('keeps the default CSS theme when the main window stored nothing', async () => {
		component = mount(ComposerPage, { target });
		await settle();

		expect(root.style.getPropertyValue('--popover')).toBe('');
		expect(target.querySelector('textarea')).not.toBeNull();
	});

	it('follows a theme change made in the main window', async () => {
		storeThemeVars({ '--popover': '#101010' });
		component = mount(ComposerPage, { target });
		await settle();

		storeThemeVars({ '--popover': '#202020' });
		window.dispatchEvent(new StorageEvent('storage', { key: THEME_VARS_STORAGE_KEY }));

		expect(root.style.getPropertyValue('--popover')).toBe('#202020');
	});

	it('ignores storage events for other keys', async () => {
		storeThemeVars({ '--popover': '#101010' });
		component = mount(ComposerPage, { target });
		await settle();

		storeThemeVars({ '--popover': '#202020' });
		window.dispatchEvent(new StorageEvent('storage', { key: 'some-other-key' }));

		expect(root.style.getPropertyValue('--popover')).toBe('#101010');
	});

	it('re-reads the theme each time the composer is summoned', async () => {
		component = mount(ComposerPage, { target });
		await settle();
		const onOpen = vi.mocked(on).mock.calls[0][1] as () => void;

		storeThemeVars({ '--popover': '#303030' });
		onOpen();

		expect(root.style.getPropertyValue('--popover')).toBe('#303030');
	});
});
