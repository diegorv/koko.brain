// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as Record<string, unknown>).__APP_CHANNEL__ = 'stable';
(globalThis as Record<string, unknown>).__BUILD_INFO__ = '9.9.9 (abc1234) (test)';

vi.mock('#lib/utils/log.service.js');
vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn() },
}));

import { mount, unmount, flushSync } from 'svelte';
import { toast } from 'svelte-sonner';
import TroubleshootingSection from '#lib/core/settings/sections/TroubleshootingSection.svelte';
import { DECORATOR_LABELS, DECORATOR_NAMES } from '#lib/core/markdown-editor/extensions/live-preview/core/decorator-names.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { initLogSession, isLogSessionActive, startHeartbeat } from '#lib/utils/log.service.js';

describe('TroubleshootingSection', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(initLogSession).mockResolvedValue(undefined);
		vi.mocked(isLogSessionActive).mockReturnValue(false);
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
	});

	/** The rows between the heading `heading` and the next one. */
	function rowsUnder(root: HTMLElement, heading: string): HTMLElement[] {
		const start = [...root.querySelectorAll('h3')].find((h) => h.textContent?.trim() === heading)!;
		const rows: HTMLElement[] = [];
		for (let el = start.nextElementSibling; el && el.tagName !== 'H3'; el = el.nextElementSibling) {
			if (el.classList.contains('bg-setting-item-bg')) rows.push(el as HTMLElement);
		}
		return rows;
	}

	function render(): HTMLElement {
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(TroubleshootingSection, { target });
		flushSync();
		return target;
	}

	it('requires separate raw-message consent and explains the sensitivity and opt-out limits', () => {
		const root = render();
		const toggle = root.querySelector<HTMLButtonElement>('[role="switch"][aria-label="Save mod run messages to file"]');
		expect(toggle).not.toBeNull();
		expect(toggle!.getAttribute('aria-checked')).toBe('false');
		expect(settingsStore.debugModRunMessages).toBe(false);
		for (const warning of ['Save debug log to file', 'note text', 'paths', 'prompts', 'API responses', 'secrets', 'Inspect log files before sharing', 'does not delete']) {
			expect(root.textContent).toContain(warning);
		}
		toggle!.click();
		flushSync();
		expect(settingsStore.debugModRunMessages).toBe(true);
		expect(settingsStore.debugLogToFile).toBe(false);
		expect(toggle!.getAttribute('aria-checked')).toBe('true');
		toggle!.click();
		flushSync();
		expect(settingsStore.debugModRunMessages).toBe(false);
		expect(toggle!.getAttribute('aria-checked')).toBe('false');
	});

	it('leaves the build info to the Update page', () => {
		const root = render();

		expect(root.textContent).not.toContain('9.9.9 (abc1234) (test)');
		expect([...root.querySelectorAll('h3')].map((h) => h.textContent?.trim())).not.toContain('About');
	});

	it('starts with the Frontend group and keeps the others', () => {
		const headings = [...render().querySelectorAll('h3')].map((h) => h.textContent?.trim());

		expect(headings).toEqual(['Frontend', 'Live preview', 'Live preview decorators', 'Backend (Tauri)']);
	});

	it('labels every decorator switch with a readable name, under its own heading', () => {
		const labels = rowsUnder(render(), 'Live preview decorators').map((row) => row.querySelector('span')?.textContent);

		expect(labels).toEqual(DECORATOR_NAMES.map((name) => DECORATOR_LABELS[name]));
		expect(labels).toHaveLength(22);
		for (const name of DECORATOR_NAMES) expect(labels).not.toContain(name);
	});

	it('names each decorator switch for assistive technology', () => {
		const root = render();

		for (const name of DECORATOR_NAMES) {
			expect(root.querySelector(`[role="switch"][aria-label="${DECORATOR_LABELS[name]}"]`), name).not.toBeNull();
		}
	});

	it('keeps the persisted key when a decorator is turned off by its readable name', () => {
		const root = render();

		root.querySelector<HTMLButtonElement>('[aria-label="Math blocks"]')!.click();
		flushSync();

		expect(settingsStore.disabledDecorators.blockMath).toBe(true);
	});

	it('says what the switches do, without a restart claim or internal log tags', () => {
		const text = render().textContent ?? '';

		expect(text).toContain('Turn one off to isolate a rendering problem. A change applies the next time a note opens.');
		expect(text).not.toContain('require app restart');
		expect(text).not.toContain('[HB]');
	});

	it('shortens the Heartbeat row and names the log folder action', () => {
		const root = render();
		const text = root.textContent ?? '';

		expect(text).toContain('Log a tick every 250 ms, UI and main-thread stalls, and click-to-paint time. Needs a log file. Leave off unless you are chasing a stall.');
		expect([...root.querySelectorAll('button')].map((b) => b.textContent?.trim())).toContain('Show in Finder');
	});

	/** The switch in the row labelled `label` (the log switches have no `aria-label`). */
	function toggle(root: HTMLElement, label: string): HTMLButtonElement {
		const row = [...root.querySelectorAll<HTMLElement>('.bg-setting-item-bg')].find((r) => r.querySelector('span')?.textContent?.trim() === label)!;
		return row.querySelector<HTMLButtonElement>('[role="switch"]')!;
	}

	describe('switches that need a log file', () => {
		function dependent(root: HTMLElement, label: string): HTMLButtonElement {
			return root.querySelector<HTMLButtonElement>(`[role="switch"][aria-label="${label}"]`)!;
		}

		it('disables Heartbeat and Profile decoration plugins while both log options are off', () => {
			const root = render();

			expect(dependent(root, 'Heartbeat').disabled).toBe(true);
			expect(dependent(root, 'Profile decoration plugins').disabled).toBe(true);
		});

		it('enables both when either log option is on', () => {
			settingsStore.updateDebugLogToFile(true);
			const root = render();
			expect(dependent(root, 'Heartbeat').disabled).toBe(false);
			expect(dependent(root, 'Profile decoration plugins').disabled).toBe(false);

			settingsStore.updateDebugLogToFile(false);
			settingsStore.updateDebugTauriLogToFile(true);
			flushSync();
			expect(dependent(root, 'Heartbeat').disabled).toBe(false);
			expect(dependent(root, 'Profile decoration plugins').disabled).toBe(false);
		});

		it('keeps a stored-on Heartbeat enabled with both logs off so it can be turned off', () => {
			settingsStore.updateDebugHeartbeat(true);
			const root = render();

			expect(dependent(root, 'Heartbeat').disabled).toBe(false);
			dependent(root, 'Heartbeat').click();
			flushSync();

			expect(settingsStore.debugHeartbeat).toBe(false);
			expect(dependent(root, 'Heartbeat').disabled).toBe(true);
		});

		it('keeps a stored-on Profile decoration plugins enabled with both logs off so it can be turned off', () => {
			settingsStore.updateLivePreviewProfiling(true);
			const root = render();

			expect(dependent(root, 'Profile decoration plugins').disabled).toBe(false);
			dependent(root, 'Profile decoration plugins').click();
			flushSync();

			expect(settingsStore.livePreviewProfiling).toBe(false);
			expect(dependent(root, 'Profile decoration plugins').disabled).toBe(true);
		});

		it('does not change the stored dependents when a log option flips', () => {
			settingsStore.updateDebugLogToFile(true);
			settingsStore.updateDebugHeartbeat(true);
			settingsStore.updateLivePreviewProfiling(true);
			const root = render();

			toggle(root, 'Save debug log to file').click();
			flushSync();

			expect(settingsStore.debugLogToFile).toBe(false);
			expect(settingsStore.debugHeartbeat).toBe(true);
			expect(settingsStore.livePreviewProfiling).toBe(true);
		});
	});

	describe('a log switch whose session could not start', () => {
		const cases = [
			{ label: 'Save debug log to file', stored: () => settingsStore.debugLogToFile },
			{ label: 'Save Tauri log to file', stored: () => settingsStore.debugTauriLogToFile },
		];

		for (const { label, stored } of cases) {
			it(`turns "${label}" back off, shows a toast and starts no heartbeat`, async () => {
				settingsStore.updateDebugHeartbeat(true);
				const root = render();
				const sw = toggle(root, label);

				sw.click();
				flushSync();
				await vi.waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
				flushSync();

				expect(initLogSession).toHaveBeenCalledTimes(1);
				expect(stored()).toBe(false);
				expect(sw.getAttribute('aria-checked')).toBe('false');
				expect(startHeartbeat).not.toHaveBeenCalled();
			});

			it(`keeps "${label}" on with no toast when the other log already holds a session`, async () => {
				vi.mocked(isLogSessionActive).mockReturnValue(true);
				settingsStore.updateDebugHeartbeat(true);
				const root = render();
				const sw = toggle(root, label);

				sw.click();
				flushSync();
				await vi.waitFor(() => expect(startHeartbeat).toHaveBeenCalledTimes(1));
				flushSync();

				expect(stored()).toBe(true);
				expect(sw.getAttribute('aria-checked')).toBe('true');
				expect(toast.error).not.toHaveBeenCalled();
			});
		}
	});
});
