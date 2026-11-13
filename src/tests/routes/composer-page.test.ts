// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Tauri IPC boundary: the composer only talks to Rust through these two.
vi.mock('#lib/contracts/ipc.js', () => ({
	call: vi.fn(async () => undefined),
	on: vi.fn(async () => () => {}),
}));

import { mount, unmount, flushSync } from 'svelte';
import { EditorView } from '@codemirror/view';
import { call, on } from '#lib/contracts/ipc.js';
import { THEME_VARS_STORAGE_KEY } from '#lib/core/settings/theme.service.js';
import ComposerPage from '../../routes/composer/+page.svelte';
import { entryV2 } from '../fixtures/vault-entries.fixture';

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
		expect(target.querySelector('.cm-editor [aria-label="Quick capture composer"]')).not.toBeNull();
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

const TAGS = [
	{ name: 'project', count: 2, filePaths: [] },
	{ name: 'prose', count: 5, filePaths: [] },
];

const ENTRIES = [entryV2('/vault/Welcome.md'), entryV2('/vault/Weekly.md')];

describe('composer save', () => {
	const ERROR_TEXT = 'Could not save. ⌘↩ retries, ESC cancels.';
	const UNKNOWN_TEXT = 'Save not confirmed. ⌘↩ saves again, ESC cancels.';
	let target: HTMLElement;
	let component: ReturnType<typeof mount> | undefined;

	/**
	 * How one `submit_composer_capture` call ends: `ok` (the main window reports
	 * the note written), `write-fail` (it reports a failed write), `fail` (the
	 * Rust call rejects) or `silent` (no report ever arrives).
	 */
	type Outcome = 'ok' | 'write-fail' | 'fail' | 'silent';

	/** The composer's `qc:composer-capture-result` handler. */
	function resultHandler(): (result: { requestId: string; ok: boolean }) => void {
		const registered = vi.mocked(on).mock.calls.find(([name]) => name === 'qc:composer-capture-result');
		return registered![1] as (result: { requestId: string; ok: boolean }) => void;
	}

	/** The composer's `qc:open-composer` handler (a summon). */
	function summon(): void {
		const registered = vi.mocked(on).mock.calls.find(([name]) => name === 'qc:open-composer');
		(registered![1] as () => void)();
		flushSync();
	}

	/** Makes each `submit_composer_capture` call take the next outcome; `ok` once they run out. */
	function mockSubmit(...outcomes: Outcome[]): void {
		vi.mocked(call).mockImplementation((async (cmd: string, args?: { requestId: string }) => {
			if (cmd === 'get_all_tags_v2') return TAGS;
			if (cmd === 'get_all_vault_entries_v2') return ENTRIES;
			if (cmd !== 'submit_composer_capture') return undefined;
			const outcome = outcomes.shift() ?? 'ok';
			if (outcome === 'fail') throw new Error('emit failed');
			if (outcome !== 'silent') {
				// The main window answers once it has handled the emitted capture.
				const requestId = args!.requestId;
				setTimeout(() => resultHandler()({ requestId, ok: outcome === 'ok' }), 0);
			}
			return undefined;
		}) as typeof call);
	}

	function editorView(): EditorView {
		return EditorView.findFromDOM(target.querySelector('.cm-editor') as HTMLElement)!;
	}

	function editorText(): string {
		return editorView().state.doc.toString();
	}

	/** Sets the whole text at once, as a paste does: it opens no suggestion list. */
	function type(value: string): void {
		const view = editorView();
		view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
		flushSync();
	}

	/** Types `value` at the cursor one character at a time, as the keyboard does. */
	function typeKeys(value: string): void {
		const view = editorView();
		for (const ch of value) {
			const at = view.state.selection.main.head;
			view.dispatch({ changes: { from: at, insert: ch }, selection: { anchor: at + 1 }, userEvent: 'input.type' });
		}
		flushSync();
	}

	/** A key pressed in the editor; it reaches the window unless the editor stops it. */
	function pressInEditor(init: KeyboardEventInit): void {
		editorView().contentDOM.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
	}

	function listShown(): boolean {
		return target.querySelector('.cm-tooltip-autocomplete') !== null;
	}

	/** Waits for the suggestion list, then past its 75 ms interaction delay so Enter accepts. */
	async function waitForList(): Promise<void> {
		await vi.waitFor(() => expect(listShown()).toBe(true));
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	function press(init: KeyboardEventInit): void {
		window.dispatchEvent(new KeyboardEvent('keydown', init));
	}

	function saveKey(): void {
		press({ key: 'Enter', metaKey: true });
	}

	function hint(): HTMLElement {
		return target.querySelector('.hint')!;
	}

	function alertText(): string | null | undefined {
		return target.querySelector('[role="alert"]')?.textContent;
	}

	function commands(): string[] {
		return vi.mocked(call).mock.calls.map((c) => c[0]);
	}

	async function mountComposer(): Promise<void> {
		component = mount(ComposerPage, { target });
		await settle();
	}

	beforeEach(async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		localStorage.clear();
		mockSubmit();
		target = document.createElement('div');
		document.body.appendChild(target);
		await mountComposer();
	});

	afterEach(() => {
		vi.useRealTimers();
		if (component) unmount(component);
		component = undefined;
		target.remove();
		vi.mocked(call).mockReset();
		vi.mocked(on).mockClear();
		vi.restoreAllMocks();
	});

	it('keeps the text and shows an error when the save fails', async () => {
		mockSubmit('fail');
		type('idea');

		saveKey();

		await vi.waitFor(() => expect(alertText()).toBe(ERROR_TEXT));
		expect(editorText()).toBe('idea');
		expect(vi.mocked(call)).not.toHaveBeenCalledWith('dismiss_composer');
		expect(commands()).toEqual(['submit_composer_capture']);
		expect(target.querySelector('.composer-root')!.classList.contains('saved')).toBe(false);
		expect(console.error).toHaveBeenCalledWith('submit_composer_capture failed', expect.any(Error));
	});

	it('keeps the text and shows an error when the main window reports a failed write', async () => {
		mockSubmit('write-fail');
		type('an idea');

		saveKey();

		await vi.waitFor(() => expect(alertText()).toBe(ERROR_TEXT));
		expect(editorText()).toBe('an idea');
		expect(commands()).toEqual(['submit_composer_capture']);
		expect(target.querySelector('.composer-root')!.classList.contains('saved')).toBe(false);
	});

	it('flashes saved and dismisses once the main window reports the note written', async () => {
		type('an idea');

		saveKey();

		await vi.waitFor(() => expect(target.querySelector('.composer-root')!.classList.contains('saved')).toBe(true));
		expect(commands()).toEqual(['submit_composer_capture']);
		await vi.waitFor(() => expect(commands()).toEqual(['submit_composer_capture', 'dismiss_composer']));
		expect(vi.mocked(call)).toHaveBeenCalledWith('submit_composer_capture', {
			text: 'an idea',
			requestId: expect.any(String),
		});
		expect(hint().textContent).toBe('ESC cancels · ⌘↩ saves');

		summon();

		expect(editorText()).toBe('');
	});

	/** The `requestId` of the last `submit_composer_capture` call. */
	function lastRequestId(): string {
		const submits = vi.mocked(call).mock.calls.filter(([cmd]) => cmd === 'submit_composer_capture');
		const args = (submits.at(-1) as unknown[])[1] as { requestId: string };
		return args.requestId;
	}

	it('keeps the text typed while the save waited', async () => {
		mockSubmit('silent');
		type('an idea');
		saveKey();
		await settle();
		type('an idea, and more');

		resultHandler()({ requestId: lastRequestId(), ok: true });

		await vi.waitFor(() => expect(commands()).toEqual(['submit_composer_capture', 'dismiss_composer']));
		await vi.waitFor(() => expect(editorText()).toBe(', and more'));
		summon();
		expect(editorText()).toBe(', and more');
	});

	it('leaves a new summon open when the earlier save is reported late', async () => {
		mockSubmit('silent');
		type('an idea');
		saveKey();
		await settle();
		press({ key: 'Escape' });
		await vi.waitFor(() => expect(commands()).toEqual(['submit_composer_capture', 'dismiss_composer']));
		summon();
		expect(editorText()).toBe('an idea');
		type('an idea, new thought');

		resultHandler()({ requestId: lastRequestId(), ok: true });
		await new Promise((resolve) => setTimeout(resolve, 300));
		flushSync();

		expect(commands()).toEqual(['submit_composer_capture', 'dismiss_composer']);
		expect(target.querySelector('.composer-root')!.classList.contains('saved')).toBe(false);
		// The written text is dropped; what was typed after it stays.
		expect(editorText()).toBe(', new thought');
	});

	it('sends one capture when Cmd+Enter is pressed again during the saved flash', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		type('an idea');
		saveKey();
		await vi.advanceTimersByTimeAsync(1);
		flushSync();
		expect(target.querySelector('.composer-root')!.classList.contains('saved')).toBe(true);

		saveKey();
		await vi.advanceTimersByTimeAsync(500);
		flushSync();

		expect(commands()).toEqual(['submit_composer_capture', 'dismiss_composer']);
	});

	it('does not hide a composer summoned again during the saved flash', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		type('an idea');
		saveKey();
		await vi.advanceTimersByTimeAsync(1);
		flushSync();
		press({ key: 'Escape' });
		summon();

		await vi.advanceTimersByTimeAsync(500);
		flushSync();

		// Only the Esc dismissed; the written text is dropped from the new show.
		expect(commands()).toEqual(['submit_composer_capture', 'dismiss_composer']);
		expect(editorText()).toBe('');
	});

	it('a submit that rejects late leaves the save of a newer show alone', async () => {
		let rejectFirst!: (err: Error) => void;
		let submits = 0;
		vi.mocked(call).mockImplementation((async (cmd: string, args?: { requestId: string }) => {
			if (cmd !== 'submit_composer_capture') return undefined;
			submits++;
			if (submits === 1) return new Promise((_, reject) => (rejectFirst = reject));
			const requestId = args!.requestId;
			setTimeout(() => resultHandler()({ requestId, ok: true }), 50);
			return undefined;
		}) as typeof call);
		type('first');
		saveKey();
		await settle();
		press({ key: 'Escape' });
		summon();
		type('second');
		saveKey();
		await settle();

		rejectFirst(new Error('emit failed'));

		await vi.waitFor(() =>
			expect(commands()).toEqual([
				'submit_composer_capture',
				'dismiss_composer',
				'submit_composer_capture',
				'dismiss_composer',
			]),
		);
		expect(alertText()).toBeUndefined();
	});

	it('ignores a result for another request', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		mockSubmit('silent');
		type('an idea');
		saveKey();
		await settle();

		resultHandler()({ requestId: 'someone-else', ok: true });
		await vi.advanceTimersByTimeAsync(1000);

		expect(commands()).toEqual(['submit_composer_capture']);
		expect(target.querySelector('.composer-root')!.classList.contains('saved')).toBe(false);
	});

	it('keeps the text and says the result is unknown when no result arrives in time', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		mockSubmit('silent');
		type('an idea');
		saveKey();
		await settle();

		await vi.advanceTimersByTimeAsync(2999);
		expect(alertText()).toBeUndefined();
		await vi.advanceTimersByTimeAsync(1);
		flushSync();

		expect(alertText()).toBe(UNKNOWN_TEXT);
		expect(editorText()).toBe('an idea');
		expect(commands()).toEqual(['submit_composer_capture']);
	});

	it('dismisses on a retry that succeeds and clears the error', async () => {
		mockSubmit('fail', 'ok');
		type('an idea');

		saveKey();
		await vi.waitFor(() => expect(alertText()).toBe(ERROR_TEXT));
		saveKey();

		await vi.waitFor(() =>
			expect(commands()).toEqual(['submit_composer_capture', 'submit_composer_capture', 'dismiss_composer']),
		);
		expect(alertText()).toBeUndefined();
		expect(hint().textContent).toBe('ESC cancels · ⌘↩ saves');
	});

	it('dismisses an empty composer without saving', async () => {
		type('   ');

		saveKey();

		await vi.waitFor(() => expect(commands()).toEqual(['dismiss_composer']));
	});

	it('dismisses on Esc after a failed save', async () => {
		mockSubmit('fail');
		type('an idea');
		saveKey();
		await vi.waitFor(() => expect(alertText()).toBe(ERROR_TEXT));

		press({ key: 'Escape' });

		await vi.waitFor(() => expect(commands()).toEqual(['submit_composer_capture', 'dismiss_composer']));
	});

	it('clears the error and restores the unsaved text on the next summon', async () => {
		mockSubmit('write-fail');
		type('an idea');
		saveKey();
		await vi.waitFor(() => expect(alertText()).toBe(ERROR_TEXT));

		summon();

		expect(alertText()).toBeUndefined();
		expect(editorText()).toBe('an idea');
	});

	it('restores text dismissed without saving on the next summon', async () => {
		type('half a thought');
		press({ key: 'Escape' });
		await vi.waitFor(() => expect(commands()).toEqual(['dismiss_composer']));

		summon();

		expect(editorText()).toBe('half a thought');
	});

	it('restores the unsaved text after the composer window is rebuilt', async () => {
		type('half a thought');
		unmount(component!);

		await mountComposer();

		expect(editorText()).toBe('half a thought');
	});

	it('saves without a draft when storage throws', async () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('storage blocked');
		});
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('storage blocked');
		});
		vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
			throw new Error('storage blocked');
		});
		type('an idea');

		saveKey();

		await vi.waitFor(() => expect(commands()).toEqual(['submit_composer_capture', 'dismiss_composer']));
		summon();
		expect(editorText()).toBe('');
	});

	describe('completion', () => {
		function count(cmd: string): number {
			return commands().filter((c) => c === cmd).length;
		}

		it('suggests tags on #, reading them once per summon', async () => {
			typeKeys('see #pro');
			await waitForList();
			expect(target.querySelector('.cm-tooltip-autocomplete')!.textContent).toContain('project');
			typeKeys('j');
			await waitForList();
			expect(count('get_all_tags_v2')).toBe(1);

			press({ key: 'Escape' });
			summon();
			typeKeys(' #p');
			await waitForList();

			expect(count('get_all_tags_v2')).toBe(2);
			expect(count('get_all_vault_entries_v2')).toBe(0);
		});

		it('saves the link a suggestion completed', async () => {
			typeKeys('read [[Welc');
			await waitForList();
			pressInEditor({ key: 'Enter' });
			expect(editorText()).toBe('read [[Welcome]]');

			pressInEditor({ key: 'Enter', metaKey: true });

			await vi.waitFor(() => expect(commands()).toContain('dismiss_composer'));
			expect(vi.mocked(call)).toHaveBeenCalledWith('submit_composer_capture', {
				text: 'read [[Welcome]]',
				requestId: expect.any(String),
			});
		});

		it('closes an open list on Esc and dismisses on the second Esc', async () => {
			typeKeys('#pro');
			await waitForList();

			pressInEditor({ key: 'Escape' });
			await settle();
			expect(listShown()).toBe(false);
			expect(commands()).not.toContain('dismiss_composer');

			pressInEditor({ key: 'Escape' });
			await vi.waitFor(() => expect(count('dismiss_composer')).toBe(1));
			expect(editorText()).toBe('#pro');
		});

		it('dismisses once on Esc in the editor with no list', async () => {
			type('an idea');

			pressInEditor({ key: 'Escape' });

			await vi.waitFor(() => expect(commands()).toEqual(['dismiss_composer']));
		});

		it('closes a list left open when the composer is summoned again', async () => {
			typeKeys('#pro');
			await waitForList();

			summon();

			expect(listShown()).toBe(false);
			expect(editorText()).toBe('#pro');
		});

		it('keeps typing and saving when the tags cannot be read', async () => {
			vi.mocked(call).mockImplementation((async (cmd: string, args?: { requestId: string }) => {
				if (cmd === 'get_all_tags_v2') throw new Error('index unavailable');
				if (cmd !== 'submit_composer_capture') return undefined;
				const requestId = args!.requestId;
				setTimeout(() => resultHandler()({ requestId, ok: true }), 0);
				return undefined;
			}) as typeof call);
			typeKeys('#pro');
			await new Promise((resolve) => setTimeout(resolve, 250));
			expect(listShown()).toBe(false);

			saveKey();

			await vi.waitFor(() => expect(commands()).toContain('dismiss_composer'));
			expect(alertText()).toBeUndefined();
			expect(vi.mocked(call)).toHaveBeenCalledWith('submit_composer_capture', {
				text: '#pro',
				requestId: expect.any(String),
			});
		});

		it('hides the placeholder once there is text', () => {
			expect(target.querySelector('.placeholder')?.textContent).toBe('Quick capture...');

			type('a');

			expect(target.querySelector('.placeholder')).toBeNull();
		});
	});
});
