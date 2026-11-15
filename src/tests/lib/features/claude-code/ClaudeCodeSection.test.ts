// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('#lib/utils/debug.js', () => ({ debug: vi.fn(), error: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import type { ClaudeStatus } from '#lib/contracts/index.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import ClaudeCodeSection from '#lib/features/claude-code/ClaudeCodeSection.svelte';

const INSTALLED: ClaudeStatus = {
	installed: true,
	path: '/Users/me/.local/bin/claude',
	version: '2.1.325 (Claude Code)',
	error: null,
};

const MISSING: ClaudeStatus = {
	installed: false,
	path: null,
	version: null,
	error: 'claude was not found on the login shell PATH or in the known install locations',
};

const PRIVACY = 'note content goes to Anthropic through your Claude Code account';
const PERMISSIONS = 'full permissions';

describe('ClaudeCodeSection', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	/** Mounts the section and lets the status check on mount resolve. */
	async function render() {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(ClaudeCodeSection, { target });
		flushSync();
		await settle();
	}

	async function settle() {
		await Promise.resolve();
		await tick();
		flushSync();
	}

	function row(name: string): HTMLElement {
		const el = target.querySelector<HTMLElement>(`[data-setting="${name}"]`);
		if (!el) throw new Error(`no row ${name}`);
		return el;
	}

	const enableSwitch = () => row('enabled').querySelector<HTMLButtonElement>('[role="switch"]')!;

	function button(label: string): HTMLButtonElement {
		const found = [...target.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === label);
		if (!found) throw new Error(`no button ${label}`);
		return found;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		settingsStore.reset();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	it('shows the version and path when claude is installed', async () => {
		vi.mocked(invoke).mockResolvedValue(INSTALLED);
		await render();

		const text = row('status').textContent ?? '';
		expect(text).toContain('2.1.325 (Claude Code)');
		expect(text).toContain('/Users/me/.local/bin/claude');
		expect(invoke).toHaveBeenCalledWith('claude_status', { binaryPath: '' });
	});

	it('says why when claude is missing', async () => {
		vi.mocked(invoke).mockResolvedValue(MISSING);
		await render();

		const text = row('status').textContent ?? '';
		expect(text).toContain('Not installed');
		expect(text).toContain(MISSING.error);
	});

	it('shows an inline error when the check itself fails', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('ipc down'));
		await render();

		expect(row('status').textContent).toContain('Could not check for claude');
	});

	it('Check again re-runs the lookup with the current override path', async () => {
		vi.mocked(invoke).mockResolvedValue(MISSING);
		await render();
		vi.mocked(invoke).mockResolvedValue(INSTALLED);
		settingsStore.updateClaudeCode({ binaryPath: '/opt/claude' });
		flushSync();

		button('Check again').click();
		await settle();

		expect(invoke).toHaveBeenLastCalledWith('claude_status', { binaryPath: '/opt/claude' });
		expect(row('status').textContent).toContain('2.1.325 (Claude Code)');
	});

	it('typing an override path stores it', async () => {
		vi.mocked(invoke).mockResolvedValue(MISSING);
		await render();

		const input = row('binary-path').querySelector<HTMLInputElement>('[data-slot="input"]')!;
		input.value = '/opt/claude';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		expect(settingsStore.claudeCode.binaryPath).toBe('/opt/claude');
	});

	it('states the privacy sentence while the feature is off', async () => {
		vi.mocked(invoke).mockResolvedValue(INSTALLED);
		await render();

		expect(settingsStore.claudeCode.enabled).toBe(false);
		expect(row('enabled').textContent?.toLowerCase()).toContain(PRIVACY.toLowerCase());
	});

	it('the first enable shows both sentences and waits for Enable', async () => {
		vi.mocked(invoke).mockResolvedValue(INSTALLED);
		await render();

		enableSwitch().click();
		flushSync();

		const notice = target.querySelector<HTMLElement>('[data-setting="consent"]')!;
		expect(notice.textContent?.toLowerCase()).toContain(PRIVACY.toLowerCase());
		expect(notice.textContent).toContain(PERMISSIONS);
		expect(notice.textContent).toContain('any shell command');
		expect(settingsStore.claudeCode.enabled).toBe(false);

		button('Enable').click();
		flushSync();

		expect(settingsStore.claudeCode).toMatchObject({ enabled: true, privacyAcknowledged: true });
		expect(target.querySelector('[data-setting="consent"]')).toBeNull();
		expect(enableSwitch().getAttribute('aria-checked')).toBe('true');
	});

	it('Cancel leaves the feature off and the notice unacknowledged', async () => {
		vi.mocked(invoke).mockResolvedValue(INSTALLED);
		await render();

		enableSwitch().click();
		flushSync();
		button('Cancel').click();
		flushSync();

		expect(settingsStore.claudeCode).toMatchObject({ enabled: false, privacyAcknowledged: false });
		expect(target.querySelector('[data-setting="consent"]')).toBeNull();
		expect(enableSwitch().getAttribute('aria-checked')).toBe('false');

		// The next click must ask again, not silently turn a phantom ON switch off.
		enableSwitch().click();
		flushSync();
		expect(target.querySelector('[data-setting="consent"]')).not.toBeNull();
	});

	it('a second click on the switch while the notice is open cancels it', async () => {
		vi.mocked(invoke).mockResolvedValue(INSTALLED);
		await render();

		enableSwitch().click();
		flushSync();
		enableSwitch().click();
		flushSync();

		expect(target.querySelector('[data-setting="consent"]')).toBeNull();
		expect(enableSwitch().getAttribute('aria-checked')).toBe('false');
		expect(settingsStore.claudeCode).toMatchObject({ enabled: false, privacyAcknowledged: false });
	});

	it('enables straight away once the notice was acknowledged, and turns off', async () => {
		settingsStore.updateClaudeCode({ privacyAcknowledged: true });
		vi.mocked(invoke).mockResolvedValue(INSTALLED);
		await render();

		enableSwitch().click();
		flushSync();
		expect(target.querySelector('[data-setting="consent"]')).toBeNull();
		expect(settingsStore.claudeCode.enabled).toBe(true);

		enableSwitch().click();
		flushSync();
		expect(settingsStore.claudeCode.enabled).toBe(false);
	});
});
