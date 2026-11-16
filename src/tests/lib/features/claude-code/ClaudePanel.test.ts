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
import { error } from '#lib/utils/debug.js';
import type { ClaudeEvent, ClaudeStatus, SlashCommandInfo } from '#lib/contracts/index.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { settingsPanelStore } from '#lib/core/settings/settings-panel.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { resetClaude } from '#lib/features/claude-code/claude.service.js';
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

/** The CLI's command list the slash request answers with by default; the navigation tests run with these descriptions. */
const SLASH_ROWS: SlashCommandInfo[] = ['alpha', 'beta', 'gamma'].map((name) => ({ name, description: `The ${name} command`, argumentHint: '', aliases: [] }));

/** Answers the status check with `status`, `claude_run_turn` with `runTurn` and the slash request with `slash`. */
function answer(status: ClaudeStatus, runTurn: () => Promise<unknown> = async () => 'r1', slash: () => Promise<unknown> = async () => SLASH_ROWS) {
	vi.mocked(invoke).mockImplementation(async (cmd: string) => {
		if (cmd === 'claude_status') return status;
		if (cmd === 'claude_run_turn') return runTurn();
		if (cmd === 'claude_slash_commands') return slash();
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
	// The slash request state lives in the service: each test starts with no request made.
	resetClaude();
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

	it('says the next message starts a new conversation, instead of the CLI error, when the resumed session is gone', async () => {
		await render();
		await sendText('hi');
		await emit({ type: 'Result', sessionId: 's1', text: 'No conversation found with session ID: s1', isError: true, costUsd: null, numTurns: 0 });
		await emit({ type: 'Done', exitCode: 1 });

		expect(qa('[data-claude-error]').map((el) => el.textContent)).toEqual([
			'The earlier conversation is no longer available to Claude. Your next message starts a new one.',
		]);
		expect(target.textContent).not.toContain('No conversation found');
		expect(q('[data-claude-message="user"]')?.textContent).toBe('hi');
	});

	describe('a restored chat', () => {
		const saved = {
			version: 1 as const,
			chatId: '0f8fad5b-d9cb-469f-a165-70867728950e',
			sessionId: 's1',
			createdAt: '2026-11-16T10:00:00.000Z',
			updatedAt: '2026-11-16T10:05:00.000Z',
			title: 'earlier',
			messages: [{ role: 'user' as const, text: 'earlier' }, { role: 'assistant' as const, parts: [{ kind: 'text' as const, text: 'An answer' }] }],
		};
		const notice = () => q('[data-claude-restored]')?.textContent?.trim();

		it('shows its messages and the notice until the next send', async () => {
			claudeStore.restore(saved);
			await render();
			expect(notice()).toBe('Restored last chat. New chat starts over.');
			expect(q('[data-claude-message="user"]')?.textContent).toBe('earlier');
			expect(q('[data-claude-empty]')).toBeNull();

			await sendText('more');
			expect(notice()).toBeUndefined();
		});

		it('drops the notice on New chat', async () => {
			claudeStore.restore(saved);
			await render();
			button('New chat').click();
			await settle();
			expect(notice()).toBeUndefined();
			expect(q('[data-claude-empty]')).not.toBeNull();
		});

		it('shows no notice in a chat that was not restored', async () => {
			await render();
			await sendText('hi');
			await emit({ type: 'Done', exitCode: 0 });
			expect(notice()).toBeUndefined();
		});
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

	it('shows a working indicator at the end of the chat while a turn runs, until Done', async () => {
		await render();
		expect(q('[data-claude-working]')).toBeNull();

		await sendText('work');
		const list = q('[data-claude-messages]')!;
		expect(list.lastElementChild?.matches('[data-claude-working]')).toBe(true);
		expect(q('[data-claude-working]')?.textContent).toContain('Working');
		expect(q('[data-claude-working] .animate-spin')).not.toBeNull();

		await emit({ type: 'TextDelta', text: 'Partial' });
		expect(list.lastElementChild?.matches('[data-claude-working]')).toBe(true);

		await emit({ type: 'Done', exitCode: 0 });
		expect(q('[data-claude-working]')).toBeNull();
	});

	it('spins on a running tool card only', async () => {
		await render();
		await sendText('read a');
		await emit({ type: 'ToolStart', id: 't1', name: 'Read', input: { file_path: 'Notes/a.md' } });
		expect(q('[data-claude-tool] summary .animate-spin')).not.toBeNull();

		await emit({ type: 'ToolResult', id: 't1', isError: false, summary: '# A' });
		expect(q('[data-claude-tool] summary .animate-spin')).toBeNull();
	});

	it('lets the user select the text of the chat, which the app body makes unselectable', async () => {
		await render();
		expect(q('[data-claude-messages]')!.classList.contains('select-text')).toBe(true);
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

	it('offers the open note when it is not attached, and one click attaches it', async () => {
		await render();
		expect(q('[data-claude-suggested-note]')).toBeNull();

		editorStore.addTab({ path: '/vault/Notes/b.md', name: 'b.md', content: '', savedContent: '' });
		await settle();
		const suggested = q<HTMLButtonElement>('[data-claude-suggested-note]')!;
		expect(suggested.textContent?.trim()).toBe('b');
		expect(chips()).toEqual([]);

		suggested.click();
		await settle();
		expect(chips()).toEqual(['Notes/b.md']);
		expect(q('[data-claude-suggested-note]')).toBeNull();
	});

	it('offers the open note again after its chip is removed, and nothing for a file that is not a note', async () => {
		editorStore.addTab({ path: '/vault/Notes/a.md', name: 'a.md', content: '', savedContent: '' });
		claudeStore.addContextNote('Notes/a.md');
		await render();
		expect(q('[data-claude-suggested-note]')).toBeNull();

		target.querySelector<HTMLButtonElement>('[aria-label="Remove a"]')!.click();
		await settle();
		expect(q('[data-claude-suggested-note]')?.textContent?.trim()).toBe('a');

		editorStore.addTab({ path: '/vault/photo.png', name: 'photo.png', content: '', savedContent: '' });
		await settle();
		expect(q('[data-claude-suggested-note]')).toBeNull();
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
		expect(qa('[data-claude-slash-name]').map((el) => el.textContent)).toEqual(['/review', '/code-review']);

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

	it('shows the argument hint after the name and the description, collapsed, on a second line', async () => {
		answer(INSTALLED, undefined, async () => [
			{ name: 'debug', description: '  Enable debug\n\n logging  ', argumentHint: '[issue description]', aliases: [] },
			{ name: 'my-tool:sketch', description: 'Draw a sketch (my-tool)', argumentHint: '', aliases: ['sketch-internal'] },
		]);
		seedSlashCommands(['debug', 'sketch-internal', 'plain']);
		await render();
		await type('/');

		const option = (name: string) => q(`[data-claude-slash-option="${name}"]`)!;
		expect(option('debug').querySelector('[data-claude-slash-name]')?.textContent).toBe('/debug');
		expect(option('debug').querySelector('[data-claude-slash-hint]')?.textContent).toBe('[issue description]');
		const description = option('debug').querySelector('[data-claude-slash-description]')!;
		expect(description.textContent).toBe('Enable debug logging');
		expect(description.classList).toContain('line-clamp-2');

		// An Init names a skill by its internal name, an alias of the row.
		expect(option('sketch-internal').querySelector('[data-claude-slash-description]')?.textContent).toBe('Draw a sketch (my-tool)');
		expect(option('sketch-internal').querySelector('[data-claude-slash-hint]')).toBeNull();

		expect(option('plain').textContent).toBe('/plain');
		expect(option('plain').querySelector('[data-claude-slash-description]')).toBeNull();
		expect(q('[data-claude-slash-menu]')?.classList).toContain('max-h-64');
	});

	it('picks a command with a description by click, and inserts only its name', async () => {
		seedSlashCommands(['alpha', 'beta']);
		await render();
		await type('/');
		expect(q('[data-claude-slash-option="beta"] [data-claude-slash-description]')?.textContent).toBe('The beta command');

		q<HTMLButtonElement>('[data-claude-slash-option="beta"]')!.click();
		await settle();
		expect(promptBox().value).toBe('/beta ');
	});

	it('shows names only when the slash request fails', async () => {
		answer(INSTALLED, undefined, async () => { throw 'claude did not answer the initialize request within 30s'; });
		seedSlashCommands(['alpha']);
		await render();
		await type('/');

		expect(q('[data-claude-slash-option="alpha"]')?.textContent).toBe('/alpha');
		expect(q('[data-claude-slash-description]')).toBeNull();
		expect(error).toHaveBeenCalledWith('CLAUDE', expect.any(String), 'claude did not answer the initialize request within 30s');
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

	it('asks claude for the slash commands on mount with the binary override and the normalized vault path', async () => {
		settingsStore.updateClaudeCode({ binaryPath: '/opt/claude' });
		vaultStore.open('/vault/');
		await render();

		expect(invoke).toHaveBeenCalledWith('claude_slash_commands', { binaryPath: '/opt/claude', vaultPath: '/vault' });
	});

	it('asks once per vault: a remount makes no new call, the remount after a vault switch does', async () => {
		const slashCalls = () => vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'claude_slash_commands');
		await render();
		expect(slashCalls()).toHaveLength(1);

		unmount(component!);
		target.remove();
		await render();
		expect(slashCalls()).toHaveLength(1);

		// The switch sets the new path before teardown resets the settings: the
		// still-mounted panel must not ask with the previous vault's binary.
		vaultStore.open('/other');
		await settle();
		expect(slashCalls()).toHaveLength(1);

		// Teardown unmounts the panel and clears the requests; it remounts once
		// the new vault's settings have loaded.
		unmount(component!);
		target.remove();
		resetClaude();
		settingsStore.updateClaudeCode({ binaryPath: '/opt/other' });
		await render();
		expect(slashCalls()).toEqual([
			['claude_slash_commands', { binaryPath: '', vaultPath: '/vault' }],
			['claude_slash_commands', { binaryPath: '/opt/other', vaultPath: '/other' }],
		]);
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

describe('ClaudePanel history', () => {
	const ID_A = '0f8fad5b-d9cb-469f-a165-70867728950e';
	const ID_B = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
	const MINUTE = 60_000;

	/** A saved chat file's text. */
	const chatFile = (chatId: string, title: string) =>
		JSON.stringify({
			version: 1,
			chatId,
			sessionId: null,
			createdAt: '2026-11-16T10:00:00.000Z',
			updatedAt: '2026-11-16T10:05:00.000Z',
			title,
			messages: [{ role: 'user', text: title }, { role: 'assistant', parts: [{ kind: 'text', text: `reply to ${title}` }] }],
		});

	/** The chat folder of each vault: id, file text and mtime, newest first. */
	let vaults: Map<string, { chatId: string; text: string; modifiedMs: number }[]>;

	/** Answers the status check, `claude_run_turn` and the chat commands from `vaults`. */
	function answerHistory(overrides: (cmd: string, args: Record<string, string>) => unknown = () => undefined) {
		vi.mocked(invoke).mockImplementation(async (cmd: string, raw?: unknown) => {
			const args = (raw ?? {}) as Record<string, string>;
			const overridden = overrides(cmd, args);
			if (overridden !== undefined) return overridden;
			const chats = vaults.get(args.vaultPath) ?? [];
			if (cmd === 'claude_status') return INSTALLED;
			if (cmd === 'claude_run_turn') return 'r1';
			if (cmd === 'claude_chat_list') return chats.map(({ chatId, modifiedMs }) => ({ chatId, modifiedMs }));
			if (cmd === 'claude_chat_read') return chats.find((c) => c.chatId === args.chatId)?.text ?? null;
			if (cmd === 'claude_chat_delete') vaults.set(args.vaultPath, chats.filter((c) => c.chatId !== args.chatId));
			return null;
		});
	}

	const historyButton = () => q<HTMLButtonElement>('button[aria-label="Chat history"]')!;
	const rows = () => qa('[data-claude-history-row]');
	const rowTitles = () => rows().map((r) => r.querySelector('[data-claude-history-title]')?.textContent?.trim());
	const openButton = (chatId: string) => q<HTMLButtonElement>(`[data-claude-history-row="${chatId}"] [data-claude-history-open]`)!;
	const deleteButton = (chatId: string) => q<HTMLButtonElement>(`[data-claude-history-row="${chatId}"] [data-claude-history-delete]`)!;

	async function openHistory() {
		historyButton().click();
		await settle();
	}

	beforeEach(() => {
		const now = Date.now();
		vaults = new Map([
			['/vault', [
				{ chatId: ID_B, text: chatFile(ID_B, 'newest chat'), modifiedMs: now - 5 * MINUTE - 1000 },
				{ chatId: ID_A, text: chatFile(ID_A, 'older chat'), modifiedMs: now - 3 * 60 * MINUTE - 1000 },
			]],
		]);
		answerHistory();
	});

	it('the history button sits next to New chat and swaps the messages for the list, newest first', async () => {
		await render();
		const toolbar = button('New chat').parentElement!;
		expect(toolbar.contains(historyButton())).toBe(true);
		expect(historyButton().getAttribute('aria-pressed')).toBe('false');

		await openHistory();
		expect(q('[data-claude-messages]')).toBeNull();
		expect(historyButton().getAttribute('aria-pressed')).toBe('true');
		expect(rowTitles()).toEqual(['newest chat', 'older chat']);
		expect(rows().map((r) => r.querySelector('[data-claude-history-time]')?.textContent?.trim())).toEqual(['5m ago', '3h ago']);
		expect(invoke).toHaveBeenCalledWith('claude_chat_list', { vaultPath: '/vault' });
		expect(promptBox()).not.toBeNull();
	});

	it('the same button goes back to the chat', async () => {
		await render();
		await openHistory();
		await openHistory();
		expect(q('[data-claude-history]')).toBeNull();
		expect(q('[data-claude-messages]')).not.toBeNull();
	});

	it('Escape goes back to the chat', async () => {
		await render();
		await openHistory();
		openButton(ID_A).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
		await settle();
		expect(q('[data-claude-history]')).toBeNull();
		expect(q('[data-claude-messages]')).not.toBeNull();
	});

	it('Escape that closes the slash menu leaves the list open', async () => {
		seedSlashCommands(['review']);
		await render();
		await openHistory();
		await type('/');
		await key({ key: 'Escape' });
		expect(q('[data-claude-slash-menu]')).toBeNull();
		expect(q('[data-claude-history]')).not.toBeNull();
	});

	it('Escape that closes the note picker leaves the list open', async () => {
		await render();
		await openHistory();
		q<HTMLButtonElement>('[data-claude-add-note]')!.click();
		await settle();
		q<HTMLInputElement>('[data-claude-note-picker] input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
		await settle();
		expect(q('[data-claude-note-picker]')).toBeNull();
		expect(q('[data-claude-history]')).not.toBeNull();
	});

	it('New chat from the list goes back to an empty chat', async () => {
		claudeStore.restore(JSON.parse(chatFile(ID_A, 'older chat')));
		await render();
		await openHistory();
		button('New chat').click();
		await settle();
		expect(q('[data-claude-history]')).toBeNull();
		expect(q('[data-claude-empty]')).not.toBeNull();
		expect(qa('[data-claude-message="user"]')).toEqual([]);
	});

	it('says so when the vault has no saved chats', async () => {
		vaults.set('/vault', []);
		await render();
		await openHistory();
		expect(rows()).toEqual([]);
		expect(q('[data-claude-history-empty]')?.textContent?.trim()).toBe('No saved chats for this vault yet.');
	});

	it('marks the open chat', async () => {
		claudeStore.restore(JSON.parse(chatFile(ID_A, 'older chat')));
		await render();
		await openHistory();
		expect(openButton(ID_A).getAttribute('aria-current')).toBe('true');
		expect(openButton(ID_B).hasAttribute('aria-current')).toBe(false);
	});

	it('a row restores its chat and goes back to the chat view', async () => {
		await render();
		await openHistory();
		openButton(ID_A).click();
		await settle();

		expect(q('[data-claude-history]')).toBeNull();
		expect(qa('[data-claude-message="user"]').map((el) => el.textContent)).toEqual(['older chat']);
		expect(q('[data-claude-text]')?.textContent).toContain('reply to older chat');
		expect(claudeStore.chatId).toBe(ID_A);
	});

	it('a row that cannot be opened says so and stays on the list', async () => {
		await render();
		await openHistory();
		vaults.set('/vault', []);
		openButton(ID_A).click();
		await settle();

		expect(q('[data-claude-history] [role="alert"]')?.textContent).toBe('This chat was deleted.');
		expect(q('[data-claude-history]')).not.toBeNull();
		expect(claudeStore.chatId).toBeNull();
	});

	it('while a turn runs the history button, rows and delete buttons are disabled', async () => {
		await render();
		await sendText('working');
		expect(historyButton().disabled).toBe(true);

		await emit({ type: 'Done', exitCode: 0 });
		await openHistory();
		claudeStore.beginTurn('started elsewhere');
		await settle();
		expect(historyButton().disabled).toBe(true);
		expect(openButton(ID_A).disabled).toBe(true);
		expect(deleteButton(ID_A).disabled).toBe(true);
		expect(q('[data-claude-history]')?.textContent).toContain('Wait for Claude to finish, or press Stop.');
	});

	it('sending from the list goes back to the chat to show the reply', async () => {
		await render();
		await openHistory();
		await sendText('from the list');
		expect(q('[data-claude-history]')).toBeNull();
		expect(qa('[data-claude-message="user"]').at(-1)?.textContent).toBe('from the list');
	});

	it('the delete button removes the row and its file and leaves the open chat', async () => {
		claudeStore.restore(JSON.parse(chatFile(ID_B, 'newest chat')));
		await render();
		await openHistory();
		deleteButton(ID_A).click();
		await settle();

		expect(invoke).toHaveBeenCalledWith('claude_chat_delete', { vaultPath: '/vault', chatId: ID_A });
		expect(rowTitles()).toEqual(['newest chat']);
		expect(claudeStore.chatId).toBe(ID_B);
	});

	it('deleting the open chat leaves a new empty chat', async () => {
		claudeStore.restore(JSON.parse(chatFile(ID_B, 'newest chat')));
		await render();
		await openHistory();
		deleteButton(ID_B).click();
		await settle();
		expect(rowTitles()).toEqual(['older chat']);

		await openHistory();
		expect(q('[data-claude-empty]')).not.toBeNull();
		expect(q('[data-claude-message="user"]')).toBeNull();
		expect(claudeStore.chatId).toBeNull();
	});

	it('a failed delete keeps the row and says so', async () => {
		answerHistory((cmd) => (cmd === 'claude_chat_delete' ? Promise.reject('delete failed') : undefined));
		await render();
		await openHistory();
		deleteButton(ID_A).click();
		await settle();

		expect(rowTitles()).toEqual(['newest chat', 'older chat']);
		expect(q('[data-claude-history] [role="alert"]')?.textContent).toBe('Could not delete the chat.');
	});

	it('shows the new vault chats when the vault changes while the list is open', async () => {
		const ID_C = '16fd2706-8baf-433b-82eb-8c7fada847da';
		vaults.set('/other', [{ chatId: ID_C, text: chatFile(ID_C, 'other vault chat'), modifiedMs: Date.now() }]);
		await render();
		await openHistory();

		vaultStore.open('/other');
		await settle();
		expect(rowTitles()).toEqual(['other vault chat']);
	});

	it('a list that resolves after the vault changed is dropped', async () => {
		let release!: () => void;
		answerHistory((cmd, args) =>
			cmd === 'claude_chat_list' && args.vaultPath === '/vault'
				? new Promise((resolve) => { release = () => resolve([{ chatId: ID_A, modifiedMs: 1 }]); })
				: undefined,
		);
		vaults.set('/other', []);
		await render();
		await openHistory();

		vaultStore.open('/other');
		await settle();
		release();
		await settle();
		expect(rows()).toEqual([]);
		expect(q('[data-claude-history-empty]')).not.toBeNull();
	});

	it('a failed list says so', async () => {
		answerHistory((cmd) => (cmd === 'claude_chat_list' ? Promise.reject('read_dir failed') : undefined));
		await render();
		await openHistory();
		expect(q('[data-claude-history] [role="alert"]')?.textContent).toBe('Could not load the saved chats.');
	});
});
