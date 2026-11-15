// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();
// jsdom has no scrollIntoView; the slash menu calls it on the highlighted option.
Element.prototype.scrollIntoView ??= () => {};

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }));
vi.mock('#lib/utils/debug.js', () => ({ debug: vi.fn(), error: vi.fn() }));

import { flushSync, mount, tick, unmount } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import type { ClaudeEvent, ClaudeStatus } from '#lib/contracts/index.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { settingsPanelStore } from '#lib/core/settings/settings-panel.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { claudeStore } from '#lib/features/claude-code/claude.store.svelte.js';
import { claudeStatusStore } from '#lib/features/claude-code/claude-status.store.svelte.js';
import { quickSwitcherStore } from '#lib/features/quick-switcher/quick-switcher.store.svelte.js';
import ClaudePanel from '#lib/features/claude-code/ClaudePanel.svelte';
import ClaudeCodeSection from '#lib/features/claude-code/ClaudeCodeSection.svelte';

const INSTALLED: ClaudeStatus = { installed: true, path: '/bin/claude', version: '2.1.325 (Claude Code)', error: null };
const MISSING: ClaudeStatus = { installed: false, path: null, version: null, error: 'claude was not found on the login shell PATH' };

const file = (path: string): FileTreeNode => ({ name: path.split('/').pop()!, path, isDirectory: false });

let target: HTMLElement;
let component: Record<string, unknown> | null = null;
const onOpenWikilink = vi.fn();
const onOpenExternal = vi.fn();

/** Answers the status check with `status` and `claude_run_turn` with `runTurn`. */
function answer(status: ClaudeStatus, runTurn: () => Promise<unknown> = async () => 'r1') {
	vi.mocked(invoke).mockImplementation(async (cmd: string) => {
		if (cmd === 'claude_status') return status;
		if (cmd === 'claude_run_turn') return runTurn();
		return null;
	});
}

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await Promise.resolve();
		await tick();
		flushSync();
	}
}

async function render() {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(ClaudePanel, { target, props: { onOpenWikilink, onOpenExternal } });
	await settle();
}

const q = <T extends Element = HTMLElement>(selector: string) => target.querySelector<T>(selector);
const qa = (selector: string) => [...target.querySelectorAll<HTMLElement>(selector)];
const promptBox = () => q<HTMLTextAreaElement>('[data-claude-prompt]')!;
const chips = () => qa('[data-claude-chip]').map((el) => el.dataset.claudeChip);

function button(label: string): HTMLButtonElement {
	const found = [...target.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === label);
	if (!found) throw new Error(`no button ${label}`);
	return found;
}

async function type(text: string) {
	const box = promptBox();
	box.value = text;
	box.dispatchEvent(new Event('input', { bubbles: true }));
	await settle();
}

/** Types `text` and clicks Send. */
async function sendText(text: string) {
	await type(text);
	button('Send').click();
	await settle();
}

async function emit(event: ClaudeEvent, runId = 'r1') {
	claudeStore.receive({ runId, event });
	await settle();
}

/** Sends a keydown to the prompt. */
async function key(init: KeyboardEventInit) {
	promptBox().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
	await settle();
}

/** Loads `commands` as the slash commands of a finished turn, before the panel mounts. */
function seedSlashCommands(commands: string[]) {
	claudeStore.beginTurn('x');
	claudeStore.startRun('r0');
	claudeStore.receive({ runId: 'r0', event: { type: 'Init', sessionId: 's', model: 'm', slashCommands: commands, skills: [] } });
	claudeStore.receive({ runId: 'r0', event: { type: 'Done', exitCode: 0 } });
}

/**
 * Gives the message list the layout jsdom lacks: a 100 px viewport over
 * 500 px of content plus 10 px per character of the rendered messages and
 * tool cards, with `scrollTop` clamped as a browser does. The height grows
 * only once the DOM shows an update, so a follow that measures before the
 * render lands short of the bottom. `scrollTo` moves the list the way the
 * user does, with a scroll event.
 */
function fakeMessageListLayout() {
	const list = q('[data-claude-messages]')!;
	const height = () => 500 + 10 * qa('[data-claude-message], [data-claude-tool]').reduce((n, el) => n + (el.textContent?.length ?? 0), 0);
	let top = 0;
	Object.defineProperty(list, 'clientHeight', { configurable: true, get: () => 100 });
	Object.defineProperty(list, 'scrollHeight', { configurable: true, get: height });
	Object.defineProperty(list, 'scrollTop', {
		configurable: true,
		get: () => top,
		set: (v: number) => { top = Math.max(0, Math.min(v, height() - 100)); },
	});
	return {
		/** The largest `scrollTop` of the content rendered now. */
		get bottom() { return height() - 100; },
		get scrollTop() { return top; },
		async scrollTo(v: number) {
			list.scrollTop = v;
			list.dispatchEvent(new Event('scroll'));
			await settle();
		},
	};
}

/**
 * WKWebView drops the focus of a field that gets disabled; jsdom keeps it and
 * ignores blur() on a disabled field. Focusing an element and removing it
 * leaves the focus on the body, as WebKit does.
 */
function dropFocus() {
	const sink = document.body.appendChild(document.createElement('button'));
	sink.focus();
	sink.remove();
}

const highlighted = () => q('[data-claude-slash-option][aria-selected="true"]')?.dataset.claudeSlashOption;
const runTurnCalled = () => vi.mocked(invoke).mock.calls.some(([cmd]) => cmd === 'claude_run_turn');

beforeEach(() => {
	vi.resetAllMocks();
	clearLocalStorage();
	claudeStore.reset();
	claudeStatusStore.reset();
	editorStore.reset();
	settingsStore.reset();
	settingsPanelStore._reset();
	quickSwitcherStore.reset();
	fsStore.reset();
	vaultStore._reset();
	vaultStore.open('/vault');
	answer(INSTALLED);
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	target?.remove();
});

describe('ClaudePanel chat', () => {
	it('shows the prompt and an empty chat before the first message', async () => {
		await render();
		expect(q('[data-claude-empty]')?.textContent).toContain('whole vault');
		expect(promptBox().disabled).toBe(false);
	});

	it('renders a streamed reply as Markdown', async () => {
		await render();
		await sendText('hello');

		expect(q('[data-claude-message="user"]')?.textContent).toBe('hello');
		await emit({ type: 'TextDelta', text: 'Hi **the' });
		await emit({ type: 'TextDelta', text: 're**' });

		const reply = q('[data-claude-message="assistant"] [data-claude-text]')!;
		expect(reply.querySelector('strong')?.textContent).toBe('there');
		expect(reply.textContent).toContain('Hi there');
	});

	it('shows a tool card with its name and target, then its result', async () => {
		await render();
		await sendText('read a');
		await emit({ type: 'ToolStart', id: 't1', name: 'Read', input: { file_path: 'Notes/a.md' } });

		const card = q('[data-claude-tool]')!;
		expect(card.tagName).toBe('DETAILS');
		expect((card as HTMLDetailsElement).open).toBe(false);
		expect(card.querySelector('[data-claude-tool-name]')?.textContent).toBe('Read');
		expect(card.querySelector('[data-claude-tool-target]')?.textContent).toBe('Notes/a.md');
		expect(card.dataset.claudeTool).toBe('running');

		await emit({ type: 'ToolResult', id: 't1', isError: false, summary: '# A' });
		expect(q('[data-claude-tool]')!.dataset.claudeTool).toBe('done');
		expect(q('[data-claude-tool] pre')?.textContent).toBe('# A');
	});

	it('shows a tool card whose result never came as stopped once the turn ends', async () => {
		await render();
		await sendText('run it');
		await emit({ type: 'ToolStart', id: 't1', name: 'Bash', input: { command: 'sleep 60' } });
		await emit({ type: 'Done', exitCode: null });

		const card = q('[data-claude-tool]')!;
		expect(card.dataset.claudeTool).toBe('stopped');
		expect(card.querySelector('summary')?.textContent).toContain('stopped');
	});

	it('opens a wikilink of the reply as a note and a web link outside', async () => {
		await render();
		await sendText('links');
		await emit({ type: 'TextDelta', text: 'See [[Project Plan]] and [site](https://example.com).' });

		const links = qa('[data-claude-text] a');
		links[0].click();
		links[1].click();
		expect(onOpenWikilink).toHaveBeenCalledWith('Project Plan');
		expect(onOpenExternal).toHaveBeenCalledWith('https://example.com');
	});

	it('shows a failed turn inline', async () => {
		answer(INSTALLED, async () => { throw 'a turn is already running for this vault'; });
		await render();
		await sendText('hi');

		expect(q('[role="alert"]')?.textContent).toBe('a turn is already running for this vault');
		expect(promptBox().disabled).toBe(false);
	});

	it('shows an Error event inline', async () => {
		await render();
		await sendText('hi');
		await emit({ type: 'Error', message: 'claude exited with code 1' });
		await emit({ type: 'Done', exitCode: 1 });

		expect(q('[data-claude-error]')?.textContent).toBe('claude exited with code 1');
	});

	it('keeps Stop and the disabled prompt after an Error event until the run is Done', async () => {
		await render();
		await sendText('hi');
		await emit({ type: 'Error', message: 'stream broke' });

		expect(q('[data-claude-error]')?.textContent).toBe('stream broke');
		expect(promptBox().disabled).toBe(true);
		expect(button('Stop')).toBeDefined();

		await emit({ type: 'Done', exitCode: 1 });
		expect(promptBox().disabled).toBe(false);
		expect(button('Send')).toBeDefined();
	});

	it('a failed Stop shows inline and keeps Stop for another try', async () => {
		await render();
		await sendText('hi');
		vi.mocked(invoke).mockRejectedValue(new Error('ipc down'));
		button('Stop').click();
		await settle();

		expect(q('[data-claude-error]')?.textContent).toBe('Could not stop Claude. Try again.');
		expect(promptBox().disabled).toBe(true);
		expect(claudeStore.runId).toBe('r1');
		expect(button('Stop')).toBeDefined();
	});

	it('disables the prompt and offers Stop while running, with the overwrite notice', async () => {
		await render();
		await sendText('work');

		expect(promptBox().disabled).toBe(true);
		expect(q('[data-claude-running-notice]')?.textContent).toContain('Editing a note Claude is changing can overwrite its edit');
		expect(button('New chat').disabled).toBe(true);
		button('Stop').click();
		await settle();
		expect(invoke).toHaveBeenCalledWith('claude_cancel_turn', { runId: 'r1' });

		await emit({ type: 'Done', exitCode: null });
		expect(promptBox().disabled).toBe(false);
		expect(q('[data-claude-running-notice]')).toBeNull();
		expect(button('Send')).toBeDefined();
	});

	it('sends with Enter and keeps Shift+Enter for a new line', async () => {
		await render();
		await type('line one');
		promptBox().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
		await settle();
		expect(invoke).not.toHaveBeenCalledWith('claude_run_turn', expect.anything());

		promptBox().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		await settle();
		expect(invoke).toHaveBeenCalledWith('claude_run_turn', expect.objectContaining({ request: expect.objectContaining({ prompt: 'line one' }) }));
	});

	it('follows a new message and the growing reply when the list is near its bottom', async () => {
		await render();
		const layout = fakeMessageListLayout();
		// 20 px above the bottom of 500 px content in a 100 px viewport.
		await layout.scrollTo(380);

		await sendText('hello');
		expect(layout.scrollTop).toBeGreaterThan(400);
		expect(layout.scrollTop).toBe(layout.bottom);

		let before = layout.scrollTop;
		await emit({ type: 'TextDelta', text: 'a long reply' });
		expect(layout.scrollTop).toBeGreaterThan(before);
		expect(layout.scrollTop).toBe(layout.bottom);

		before = layout.scrollTop;
		await emit({ type: 'ToolStart', id: 't1', name: 'Read', input: { file_path: 'a.md' } });
		expect(layout.scrollTop).toBeGreaterThan(before);
		expect(layout.scrollTop).toBe(layout.bottom);
	});

	it('stays where the user scrolled up to when a message arrives', async () => {
		await render();
		const layout = fakeMessageListLayout();
		await layout.scrollTo(100);

		await sendText('hello');
		expect(layout.scrollTop).toBe(100);

		await emit({ type: 'TextDelta', text: 'a long reply' });
		expect(layout.scrollTop).toBe(100);

		// Back at the bottom, the list follows again.
		await layout.scrollTo(layout.bottom);
		const before = layout.scrollTop;
		await emit({ type: 'TextDelta', text: ' and more' });
		expect(layout.scrollTop).toBeGreaterThan(before);
		expect(layout.scrollTop).toBe(layout.bottom);
	});

	it('stops following on a small scroll up during a streamed reply', async () => {
		await render();
		const layout = fakeMessageListLayout();
		await sendText('hello');
		await emit({ type: 'TextDelta', text: 'a long reply' });
		expect(layout.scrollTop).toBe(layout.bottom);

		// 10 px up from where the list followed to, inside the follow threshold.
		const scrolledTo = layout.scrollTop - 10;
		await layout.scrollTo(scrolledTo);
		await emit({ type: 'TextDelta', text: ' that keeps going' });
		expect(layout.scrollTop).toBe(scrolledTo);
		expect(layout.bottom).toBeGreaterThan(scrolledTo + 32);
	});

	it('gives focus back to the prompt when a turn sent from it ends', async () => {
		await render();
		promptBox().focus();
		await type('hi');
		await key({ key: 'Enter' });
		expect(promptBox().disabled).toBe(true);
		dropFocus();
		expect(document.activeElement).toBe(document.body);

		await emit({ type: 'Done', exitCode: 0 });
		expect(document.activeElement).toBe(promptBox());
	});

	it('gives focus back after a turn that fails to start', async () => {
		let fail!: (reason: unknown) => void;
		answer(INSTALLED, () => new Promise((_, reject) => { fail = reject; }));
		await render();
		promptBox().focus();
		await type('hi');
		await key({ key: 'Enter' });
		expect(promptBox().disabled).toBe(true);
		dropFocus();

		fail('a turn is already running for this vault');
		await settle();
		expect(q('[role="alert"]')).not.toBeNull();
		expect(document.activeElement).toBe(promptBox());
	});

	it('focuses the prompt again when the engine kept focus on it while disabled', async () => {
		await render();
		promptBox().focus();
		await type('hi');
		await key({ key: 'Enter' });
		// jsdom keeps activeElement on the disabled prompt, as some WebKit builds may.
		expect(document.activeElement).toBe(promptBox());
		const focus = vi.spyOn(promptBox(), 'focus');

		await emit({ type: 'Done', exitCode: 0 });
		expect(focus).toHaveBeenCalled();
		expect(document.activeElement).toBe(promptBox());
	});

	it('does not take focus when the prompt did not have it at send', async () => {
		await render();
		await sendText('hi');
		expect(document.activeElement).not.toBe(promptBox());

		await emit({ type: 'Done', exitCode: 0 });
		expect(document.activeElement).not.toBe(promptBox());
	});

	it('leaves focus where the user moved it during the turn', async () => {
		const elsewhere = document.body.appendChild(document.createElement('input'));
		try {
			await render();
			promptBox().focus();
			await type('hi');
			await key({ key: 'Enter' });
			elsewhere.focus();

			await emit({ type: 'Done', exitCode: 0 });
			expect(document.activeElement).toBe(elsewhere);
		} finally {
			elsewhere.remove();
		}
	});

	it('does not send on an Enter that confirms an IME composition', async () => {
		await render();
		await type('にほんご');
		await key({ key: 'Enter', isComposing: true });
		// WebKit sends the confirming Enter after compositionend, with isComposing false and keyCode 229.
		await key({ key: 'Enter', keyCode: 229 });

		expect(runTurnCalled()).toBe(false);
		expect(promptBox().value).toBe('にほんご');
	});
});

describe('ClaudePanel note context', () => {
	it('shows a chip per attached note, which can be removed, and a remount does not attach the active note again', async () => {
		editorStore.addTab({ path: '/vault/Notes/a.md', name: 'a.md', content: '', savedContent: '' });
		claudeStore.addContextNote('Notes/a.md');
		await render();
		expect(chips()).toEqual(['Notes/a.md']);
		expect(q('[data-claude-chip="Notes/a.md"]')?.textContent?.trim()).toBe('a');

		target.querySelector<HTMLButtonElement>('[aria-label="Remove a"]')!.click();
		await settle();
		expect(chips()).toEqual([]);

		unmount(component!);
		target.remove();
		await render();
		expect(chips()).toEqual([]);
	});

	it('attaches nothing without an open note, and sends with no notes', async () => {
		await render();
		expect(chips()).toEqual([]);
		await sendText('summarize the vault');
		const call = vi.mocked(invoke).mock.calls.find(([cmd]) => cmd === 'claude_run_turn')!;
		expect((call[1] as { request: { contextNotePaths: string[] } }).request.contextNotePaths).toEqual([]);
	});

	it('adds notes from the picker, which lists Markdown notes matching the query', async () => {
		fsStore.setFileTree([file('/vault/Project Plan.md'), file('/vault/Projector.md'), file('/vault/photo.png'), file('/vault/Other.md')]);
		await render();

		q<HTMLButtonElement>('[data-claude-add-note]')!.click();
		await settle();
		const input = q<HTMLInputElement>('[data-claude-note-picker] input')!;
		input.value = 'proj';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();

		const options = qa('[data-claude-note-option]').map((el) => el.dataset.claudeNoteOption);
		expect(options).toContain('/vault/Project Plan.md');
		expect(options).toContain('/vault/Projector.md');
		expect(options).not.toContain('/vault/Other.md');
		expect(options).not.toContain('/vault/photo.png');

		q<HTMLButtonElement>('[data-claude-note-option="/vault/Project Plan.md"]')!.click();
		await settle();
		expect(chips()).toEqual(['Project Plan.md']);
		expect(q('[data-claude-note-picker]')).toBeNull();
	});

	it('New chat clears the messages and sets the chips back to the active note', async () => {
		editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content: '', savedContent: '' });
		await render();
		claudeStore.addContextNote('b.md');
		await sendText('hi');
		await emit({ type: 'Done', exitCode: 0 });
		claudeStore.removeContextNote('a.md');
		await settle();
		expect(chips()).toEqual(['b.md']);

		button('New chat').click();
		await settle();
		expect(qa('[data-claude-message]')).toEqual([]);
		expect(chips()).toEqual(['a.md']);
	});
});

describe('ClaudePanel slash commands', () => {
	it('says the menu is empty before the first turn', async () => {
		await render();
		await type('/');
		expect(q('[data-claude-slash-empty]')?.textContent).toContain('load after the first message');
	});

	it('filters the commands from Init and inserts the picked one', async () => {
		await render();
		await sendText('hi');
		await emit({ type: 'Init', sessionId: 's1', model: 'm', slashCommands: ['review', 'hello', 'code-review'], skills: [] });
		await emit({ type: 'Done', exitCode: 0 });

		await type('/rev');
		expect(qa('[data-claude-slash-option]').map((el) => el.textContent)).toEqual(['/review', '/code-review']);

		q<HTMLButtonElement>('[data-claude-slash-option="code-review"]')!.click();
		await settle();
		expect(promptBox().value).toBe('/code-review ');
		expect(q('[data-claude-slash-menu]')).toBeNull();
	});

	it('opens only at the start of the prompt', async () => {
		claudeStore.beginTurn('x');
		claudeStore.startRun('r0');
		claudeStore.receive({ runId: 'r0', event: { type: 'Init', sessionId: 's', model: 'm', slashCommands: ['review'], skills: [] } });
		claudeStore.receive({ runId: 'r0', event: { type: 'Done', exitCode: 0 } });
		await render();

		await type('please /review');
		expect(q('[data-claude-slash-menu]')).toBeNull();
		await type('/review now');
		expect(q('[data-claude-slash-menu]')).toBeNull();
	});

	it('moves the highlight with ArrowDown and ArrowUp, wrapping at both ends', async () => {
		seedSlashCommands(['alpha', 'beta', 'gamma']);
		await render();
		await type('/');
		expect(highlighted()).toBe('alpha');

		await key({ key: 'ArrowDown' });
		expect(highlighted()).toBe('beta');
		await key({ key: 'ArrowDown' });
		await key({ key: 'ArrowDown' });
		expect(highlighted()).toBe('alpha');
		await key({ key: 'ArrowUp' });
		expect(highlighted()).toBe('gamma');
	});

	it('scrolls the highlighted command into view after each arrow, the wrap included', async () => {
		const scrolled: { name: string | undefined; options: unknown }[] = [];
		const spy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (this: Element, options) {
			scrolled.push({ name: (this as HTMLElement).dataset.claudeSlashOption, options });
		});
		try {
			seedSlashCommands(['alpha', 'beta', 'gamma']);
			await render();
			await type('/');

			await key({ key: 'ArrowUp' });
			expect(scrolled.at(-1)).toEqual({ name: 'gamma', options: { block: 'nearest' } });
			await key({ key: 'ArrowDown' });
			expect(scrolled.at(-1)).toEqual({ name: 'alpha', options: { block: 'nearest' } });
			await key({ key: 'ArrowDown' });
			expect(scrolled.at(-1)).toEqual({ name: 'beta', options: { block: 'nearest' } });
			expect(scrolled).toHaveLength(3);
		} finally {
			spy.mockRestore();
		}
	});

	it('inserts the highlighted command with Enter, without sending', async () => {
		seedSlashCommands(['alpha', 'beta', 'gamma']);
		await render();
		await type('/');
		await key({ key: 'ArrowDown' });
		await key({ key: 'Enter' });

		expect(promptBox().value).toBe('/beta ');
		expect(q('[data-claude-slash-menu]')).toBeNull();
		expect(runTurnCalled()).toBe(false);
	});

	it('inserts the highlighted command with Tab', async () => {
		seedSlashCommands(['alpha', 'beta', 'gamma']);
		await render();
		await type('/ga');
		await key({ key: 'Tab' });

		expect(promptBox().value).toBe('/gamma ');
		expect(q('[data-claude-slash-menu]')).toBeNull();
	});

	it('ignores the menu keys of an IME composition', async () => {
		seedSlashCommands(['alpha', 'beta', 'gamma']);
		await render();
		await type('/');
		await key({ key: 'ArrowDown', isComposing: true });
		await key({ key: 'ArrowDown', keyCode: 229 });
		expect(highlighted()).toBe('alpha');

		await key({ key: 'Enter', keyCode: 229 });
		await key({ key: 'Tab', isComposing: true });
		await key({ key: 'Escape', keyCode: 229 });
		expect(promptBox().value).toBe('/');
		expect(q('[data-claude-slash-menu]')).not.toBeNull();
		expect(runTurnCalled()).toBe(false);
	});

	it('closes the menu with Escape and keeps the typed text', async () => {
		seedSlashCommands(['alpha']);
		await render();
		await type('/al');
		expect(q('[data-claude-slash-menu]')).not.toBeNull();

		await key({ key: 'Escape' });
		expect(q('[data-claude-slash-menu]')).toBeNull();
		expect(promptBox().value).toBe('/al');
	});
});

describe('ClaudePanel without claude', () => {
	it('shows the binary status with a link to Settings instead of the chat', async () => {
		answer(MISSING);
		await render();

		expect(q('[data-claude-unavailable]')?.textContent).toContain('claude was not found on the login shell PATH');
		expect(q('[data-claude-prompt]')).toBeNull();
		button('Open Claude Code settings').click();
		expect(settingsPanelStore.isOpen).toBe(true);
		expect(settingsPanelStore.activeSection).toBe('claude-code');
	});

	it('says so when the check itself fails', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('ipc down'));
		await render();
		expect(q('[data-claude-unavailable]')?.textContent).toContain('Could not check for the claude command');
	});

	it('checks on mount without recapturing the login shell env', async () => {
		await render();

		expect(invoke).toHaveBeenCalledWith('claude_status', { binaryPath: '', refreshEnv: false });
		expect(invoke).not.toHaveBeenCalledWith('claude_status', expect.objectContaining({ refreshEnv: true }));
	});

	it('shows the chat once Check again in Settings finds claude, without a remount', async () => {
		answer(MISSING);
		await render();
		expect(q('[data-claude-unavailable]')).not.toBeNull();

		const settingsTarget = document.body.appendChild(document.createElement('div'));
		const section = mount(ClaudeCodeSection, { target: settingsTarget });
		try {
			await settle();
			expect(q('[data-claude-unavailable]')).not.toBeNull();

			answer(INSTALLED);
			const checkAgain = [...settingsTarget.querySelectorAll<HTMLButtonElement>('button')].find(
				(b) => b.textContent?.trim() === 'Check again',
			)!;
			checkAgain.click();
			await settle();

			expect(settingsTarget.textContent).toContain('Installed: 2.1.325 (Claude Code)');
			expect(q('[data-claude-unavailable]')).toBeNull();
			expect(q('[data-claude-prompt]')).not.toBeNull();
		} finally {
			unmount(section);
			settingsTarget.remove();
		}
	});
});
