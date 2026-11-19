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
	const DEFAULT_HINT = 'Esc hides (draft kept) · ⌘↩ saves';
	const ERROR_TEXT = 'Could not save. ⌘↩ retries, Esc hides (draft kept).';
	const UNKNOWN_TEXT = 'Save not confirmed. ⌘↩ saves again, Esc hides (draft kept).';
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

	it('says Esc hides and keeps the draft', () => {
		expect(hint().textContent).toBe(DEFAULT_HINT);
		expect(alertText()).toBeUndefined();
	});

	it('does not say cancels in either error hint', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		mockSubmit('fail', 'silent');
		type('an idea');

		saveKey();
		await settle();
		expect(alertText()).toBe(ERROR_TEXT);
		expect(alertText()).not.toContain('cancels');

		saveKey();
		await settle();
		await vi.advanceTimersByTimeAsync(3000);
		flushSync();
		expect(alertText()).toBe(UNKNOWN_TEXT);
		expect(alertText()).not.toContain('cancels');
	});

	it('reads Saving... while the save waits, then holds Saved for 600 ms', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		mockSubmit('silent');
		type('an idea');

		saveKey();
		await settle();
		expect(hint().textContent).toBe('Saving...');
		expect(alertText()).toBeUndefined();

		resultHandler()({ requestId: lastRequestId(), ok: true });
		await settle();
		expect(target.querySelector('.composer-root')!.classList.contains('saved')).toBe(true);
		expect(hint().textContent?.trim()).toBe('Saved');
		expect(hint().querySelector('svg')).not.toBeNull();

		await vi.advanceTimersByTimeAsync(599);
		flushSync();
		expect(commands()).toEqual(['submit_composer_capture']);
		expect(target.querySelector('.composer-root')!.classList.contains('saved')).toBe(true);
		expect(hint().textContent?.trim()).toBe('Saved');
		await vi.advanceTimersByTimeAsync(1);
		flushSync();
		expect(commands()).toEqual(['submit_composer_capture', 'dismiss_composer']);
		expect(target.querySelector('.composer-root')!.classList.contains('saved')).toBe(false);
		expect(hint().textContent).toBe(DEFAULT_HINT);
	});

	it('stores only the text typed after the submit once the save is confirmed, before the hold ends', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		mockSubmit('silent');
		type('an idea');
		saveKey();
		await settle();
		expect(localStorage.getItem('kokobrain:composer-draft')).toBe('an idea');

		resultHandler()({ requestId: lastRequestId(), ok: true });
		await settle();

		expect(localStorage.getItem('kokobrain:composer-draft')).toBeNull();
		expect(editorText()).toBe('an idea');
		expect(commands()).toEqual(['submit_composer_capture']);
	});

	it('keeps text typed while the save waited in the stored draft during the hold', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		mockSubmit('silent');
		type('an idea');
		saveKey();
		await settle();
		type('an idea, and more');

		resultHandler()({ requestId: lastRequestId(), ok: true });
		await settle();

		expect(localStorage.getItem('kokobrain:composer-draft')).toBe(', and more');
		expect(editorText()).toBe('an idea, and more');
	});

	it('shows an empty composer and sends no second capture after Esc and a summon during the hold', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		type('an idea');
		saveKey();
		await vi.advanceTimersByTimeAsync(1);
		flushSync();
		expect(target.querySelector('.composer-root')!.classList.contains('saved')).toBe(true);

		press({ key: 'Escape' });
		summon();

		expect(editorText()).toBe('');
		expect(target.textContent).not.toContain('Draft restored');
		saveKey();
		await vi.advanceTimersByTimeAsync(600);
		flushSync();
		expect(commands().filter((c) => c === 'submit_composer_capture')).toHaveLength(1);
		expect(editorText()).toBe('');
	});

	it.each(['write-fail', 'silent'] as const)(
		'keeps the stored draft after a %s save and restores it on the next summon',
		async (outcome) => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			mockSubmit(outcome);
			type('an idea');
			saveKey();
			await vi.advanceTimersByTimeAsync(3000);
			flushSync();
			expect(alertText()).not.toBeUndefined();
			expect(localStorage.getItem('kokobrain:composer-draft')).toBe('an idea');

			press({ key: 'Escape' });
			summon();

			expect(editorText()).toBe('an idea');
			expect(localStorage.getItem('kokobrain:composer-draft')).toBe('an idea');
		},
	);

	it('replaces the failed hint with Saving... while a retry waits', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		mockSubmit('silent', 'silent');
		type('an idea');
		saveKey();
		await settle();

		resultHandler()({ requestId: lastRequestId(), ok: false });
		await settle();
		expect(alertText()).toBe(ERROR_TEXT);

		saveKey();
		await settle();
		expect(alertText()).toBeUndefined();
		expect(hint().textContent).toBe('Saving...');
	});

	it('replaces the unconfirmed hint with Saving... while a retry waits', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		mockSubmit('silent', 'silent');
		type('an idea');
		saveKey();
		await settle();

		await vi.advanceTimersByTimeAsync(3000);
		flushSync();
		expect(alertText()).toBe(UNKNOWN_TEXT);

		saveKey();
		await settle();
		expect(alertText()).toBeUndefined();
		expect(hint().textContent).toBe('Saving...');
	});

	describe('draft restored', () => {
		function restoredNote(): HTMLElement | null {
			return target.querySelector('.restored');
		}

		function discardButton(): HTMLButtonElement | null {
			return target.querySelector('.restored button');
		}

		async function remountWithDraft(draft: string): Promise<void> {
			unmount(component!);
			// summon() must reach the new mount's listener, not the unmounted one's.
			vi.mocked(on).mockClear();
			localStorage.setItem('kokobrain:composer-draft', draft);
			await mountComposer();
		}

		it('says Draft restored with a Discard button when mounted with a stored draft', async () => {
			await remountWithDraft('half a thought');

			expect(editorText()).toBe('half a thought');
			expect(restoredNote()?.textContent).toBe('Draft restored · Discard');
			expect(discardButton()?.textContent).toBe('Discard');
			expect(discardButton()?.getAttribute('data-tauri-drag-region')).toBe('false');
			// The note sits beside the hint, not in it.
			expect(hint().textContent).toBe(DEFAULT_HINT);
		});

		it('says nothing about a draft when none was stored', async () => {
			expect(restoredNote()).toBeNull();
			expect(target.querySelector('button')).toBeNull();

			press({ key: 'Escape' });
			await vi.waitFor(() => expect(commands()).toEqual(['dismiss_composer']));
			summon();

			expect(restoredNote()).toBeNull();
			expect(target.textContent).not.toContain('Draft restored');
		});

		it('says Draft restored when a summon restores a dismissed draft', async () => {
			type('half a thought');
			expect(restoredNote()).toBeNull();
			press({ key: 'Escape' });
			await vi.waitFor(() => expect(commands()).toEqual(['dismiss_composer']));

			// The editor already holds the draft, so the restore changes no text.
			summon();

			expect(editorText()).toBe('half a thought');
			expect(restoredNote()?.textContent).toBe('Draft restored · Discard');
		});

		it('keeps the note when the restore replaces the editor text', async () => {
			type('older text');
			localStorage.setItem('kokobrain:composer-draft', 'newer draft');

			summon();

			expect(editorText()).toBe('newer draft');
			expect(restoredNote()).not.toBeNull();
		});

		it('drops the note when a late confirmed save empties the restored text', async () => {
			mockSubmit('silent');
			type('an idea');
			saveKey();
			await settle();
			press({ key: 'Escape' });
			summon();
			expect(restoredNote()).not.toBeNull();

			resultHandler()({ requestId: lastRequestId(), ok: true });
			await vi.waitFor(() => expect(editorText()).toBe(''));
			flushSync();

			expect(restoredNote()).toBeNull();
		});

		it('keeps the note when a late confirmed save leaves text typed after the submit', async () => {
			mockSubmit('silent');
			type('an idea');
			saveKey();
			await settle();
			type('an idea, more');
			press({ key: 'Escape' });
			summon();
			expect(restoredNote()).not.toBeNull();

			resultHandler()({ requestId: lastRequestId(), ok: true });
			await vi.waitFor(() => expect(editorText()).toBe(', more'));
			flushSync();

			expect(restoredNote()).not.toBeNull();
		});

		it('drops the note once the restored draft is being saved', async () => {
			mockSubmit('silent');
			await remountWithDraft('half a thought');

			saveKey();
			await settle();

			expect(hint().textContent).toBe('Saving...');
			expect(restoredNote()).toBeNull();
		});

		it('drops the note on the first typed character', async () => {
			await remountWithDraft('half a thought');
			typeKeys('!');
			expect(restoredNote()).toBeNull();

			press({ key: 'Escape' });
			summon();
			expect(restoredNote()).not.toBeNull();
			typeKeys('?');
			expect(restoredNote()).toBeNull();
			expect(editorText()).toBe('half a thought!?');
		});

		it('Discard empties the editor and the stored draft and keeps focus in the editor', async () => {
			await remountWithDraft('half a thought');

			// A real click moves focus to the button; jsdom's .click() does not.
			discardButton()!.focus();
			expect(document.activeElement).toBe(discardButton());
			discardButton()!.click();
			flushSync();

			expect(editorText()).toBe('');
			expect(localStorage.getItem('kokobrain:composer-draft')).toBeNull();
			expect(restoredNote()).toBeNull();
			expect(document.activeElement).toBe(editorView().contentDOM);
			expect(commands()).toEqual([]);

			summon();
			expect(editorText()).toBe('');
			expect(restoredNote()).toBeNull();
		});
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
		expect(hint().textContent).toBe(DEFAULT_HINT);

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
		await vi.advanceTimersByTimeAsync(600);
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

		await vi.advanceTimersByTimeAsync(600);
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
		expect(hint().textContent).toBe('Saving...');
		press({ key: 'Escape' });
		summon();
		expect(hint().textContent).toBe(DEFAULT_HINT);
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
		expect(hint().textContent).toBe(DEFAULT_HINT);
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
			// The query ran again: `#proj` no longer offers prose.
			await vi.waitFor(() => expect(target.querySelector('.cm-tooltip-autocomplete')!.textContent).not.toContain('prose'));
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

		it('switches the editor to dark and back with the theme the main window stores', async () => {
			localStorage.setItem(THEME_VARS_STORAGE_KEY, JSON.stringify({ '--editor-bg': '#fafafa' }));
			summon();
			expect(editorView().state.facet(EditorView.darkTheme)).toBe(false);

			localStorage.setItem(THEME_VARS_STORAGE_KEY, JSON.stringify({ '--editor-bg': '#101010' }));
			window.dispatchEvent(new StorageEvent('storage', { key: THEME_VARS_STORAGE_KEY }));
			expect(editorView().state.facet(EditorView.darkTheme)).toBe(true);

			localStorage.setItem(THEME_VARS_STORAGE_KEY, JSON.stringify({ '--editor-bg': '#fafafa' }));
			summon();
			expect(editorView().state.facet(EditorView.darkTheme)).toBe(false);
		});

		it('focuses the editor on mount and on each summon', async () => {
			expect(document.activeElement).toBe(editorView().contentDOM);

			editorView().contentDOM.blur();
			expect(document.activeElement).not.toBe(editorView().contentDOM);
			summon();
			await Promise.resolve();

			expect(document.activeElement).toBe(editorView().contentDOM);
		});

		it('hides the placeholder once there is text', () => {
			expect(target.querySelector('.placeholder')?.textContent).toBe('Quick capture...');

			type('a');

			expect(target.querySelector('.placeholder')).toBeNull();
		});
	});
});
