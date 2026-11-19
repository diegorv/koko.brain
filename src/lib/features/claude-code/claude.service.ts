import type { ClaudeEventPayload } from '#lib/contracts/index.js';
import { call } from '#lib/contracts/ipc.js';
import { saveAllDirtyTabs } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { error } from '#lib/utils/debug.js';
import { activeNoteContextPath, chatFromStored, normalizeVaultPath, storedFromChat, untriedSlashNames } from './claude.logic';
import { claudeStore } from './claude.store.svelte';

/** The message of an IPC rejection, which Tauri sends as a plain string. */
function messageOf(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

/** Where a turn's chat is saved, captured at send: its reply is saved only into that chat, in that vault. */
interface SaveTarget {
	/** `vaultStore.path` at send. */
	vaultPath: string;
	/** The chat's id at send. */
	chatId: string;
	/** The turn's run, once `claude_run_turn` returned it. */
	runId: string | null;
}

/** The target of the last turn sent; `null` before the first send. */
let saveTarget: SaveTarget | null = null;

/**
 * Writes the chat as it is now to its file, when it is still the target's chat
 * in the target's vault. A failed write is logged and the chat goes on.
 */
async function saveChat(target: SaveTarget): Promise<void> {
	if (claudeStore.chatId !== target.chatId || vaultStore.path !== target.vaultPath) return;
	const stored = storedFromChat(claudeStore, new Date().toISOString());
	if (!stored) return;
	try {
		await call('claude_chat_write', { vaultPath: target.vaultPath, chatId: target.chatId, content: JSON.stringify(stored, null, '\t') });
	} catch (err) {
		error('CLAUDE', 'Could not save the chat:', err);
	}
}

/**
 * Sends one prompt as an agent turn. Dirty tabs are saved first: a dirty tab
 * wins over disk, so its next auto-save would undo what Claude writes. The chat
 * is then saved to the vault. The text goes to `claude_run_turn` unchanged (a
 * leading `/name` must stay first for the CLI to expand it), with the attached
 * notes and the session of the last `Result`. A run id that comes back after
 * the chat was reset (a vault switch) belongs to no chat: that run is
 * cancelled. A failure ends the turn with an inline error and is rethrown.
 * Does nothing for blank text or while a turn runs.
 */
export async function sendPrompt(text: string): Promise<void> {
	if (claudeStore.isRunning || text.trim() === '') return;
	const vaultPath = vaultStore.path;
	claudeStore.beginTurn(text);
	// Read before any await: a reset during one, then a send in the next vault, gives the store another chat.
	const chatId = claudeStore.chatId!;
	let target: SaveTarget | null = null;
	try {
		if (!vaultPath) throw new Error('Open a vault to chat with Claude.');
		const unsaved = await saveAllDirtyTabs();
		// The chat was reset (a vault switch) while the tabs saved: this turn belongs to no chat now.
		if (claudeStore.chatId !== chatId) return;
		// The vault changed without a reset: end the turn rather than run it in the closed vault.
		if (vaultStore.path !== vaultPath) throw new Error('The vault changed before the turn started.');
		if (unsaved.length > 0) {
			throw new Error(`Could not save ${unsaved.join(', ')}. Save it before sending, or Claude's edits to it could be overwritten.`);
		}
		target = { vaultPath, chatId, runId: null };
		saveTarget = target;
		// Awaited so this write cannot land after the one at Done.
		await saveChat(target);
		const runId = await call('claude_run_turn', {
			request: {
				vaultPath: normalizeVaultPath(vaultPath),
				prompt: text,
				resumeSessionId: claudeStore.sessionId ?? undefined,
				contextNotePaths: [...claudeStore.contextNotes],
				binaryPath: settingsStore.claudeCode.binaryPath,
			},
		});
		if (!claudeStore.isRunning || claudeStore.runId !== null || claudeStore.chatId !== chatId) {
			await call('claude_cancel_turn', { runId }).catch((err: unknown) => error('CLAUDE', 'claude_cancel_turn of a stale run failed:', err));
			return;
		}
		target.runId = runId;
		claudeStore.startRun(runId);
	} catch (err) {
		error('CLAUDE', 'sendPrompt failed:', err);
		// The chat may be another one by now (a reset while the turn started).
		if (claudeStore.chatId === chatId) claudeStore.failTurn(messageOf(err));
		throw err;
	}
	// A Done replayed by startRun ended the run before the listener could see it.
	if (target && claudeStore.runId === null) await saveChat(target);
	// Stop was clicked while the turn had no run id yet; a replayed Done already cleared it.
	if (claudeStore.stopRequested && claudeStore.runId) {
		await stop().catch(() => claudeStore.showError(STOP_FAILED));
	}
}

/**
 * Saves the chat after the `claude-event` listener applied `payload`, when it
 * is the `Done` that ended the current run of the chat it was sent in, in the
 * vault it was sent in; otherwise writes nothing. Never rejects.
 */
export async function saveChatOnDone(payload: ClaudeEventPayload): Promise<void> {
	const target = saveTarget;
	if (payload.event.type !== 'Done' || !target || target.runId !== payload.runId || claudeStore.runId !== null) return;
	await saveChat(target);
}

/**
 * Shows the newest saved chat of the vault, called on vault open. With no
 * chat file, or one that cannot be parsed (logged and left on disk), the chat
 * is reset, so no chat of the previous vault stays. Results that arrive after
 * the vault changed are dropped. The store ignores a restore while a turn
 * runs. A failed list or read resets the chat and is rethrown.
 */
export async function restoreLastChat(vaultPath: string): Promise<void> {
	try {
		const [newest] = await call('claude_chat_list', { vaultPath });
		if (vaultStore.path !== vaultPath) return;
		if (!newest) {
			claudeStore.restore(null);
			return;
		}
		const text = await call('claude_chat_read', { vaultPath, chatId: newest.chatId });
		if (vaultStore.path !== vaultPath) return;
		const stored = text === null ? null : chatFromStored(text);
		if (text !== null && stored?.chatId !== newest.chatId) {
			error('CLAUDE', `Chat file ${newest.chatId}.json is not a chat Kokobrain can read; it is left as it is.`);
		}
		claudeStore.restore(stored?.chatId === newest.chatId ? stored : null);
	} catch (err) {
		if (vaultStore.path === vaultPath) claudeStore.restore(null);
		throw err;
	}
}

/** One row of the history list. */
export interface ChatHistoryRow {
	/** The chat's id, also its file name. */
	chatId: string;
	/** The chat's stored title; empty for a chat without a prompt. */
	title: string;
	/** The file's modification time, in ms since the Unix epoch. */
	modifiedMs: number;
}

/** True when a read begun in `vaultPath` no longer applies: the vault changed, or a turn runs. */
function historyStale(vaultPath: string): boolean {
	return vaultStore.path !== vaultPath || claudeStore.isRunning;
}

/**
 * The vault's saved chats for the history list, in `claude_chat_list` order
 * (newest modification first). Each file is read for its title; a file that is
 * gone is left out, and one that cannot be read or parsed is logged, left on
 * disk and left out. `null` when the vault changed or a turn started before
 * the list resolved. A failed list is logged and rethrown.
 */
export async function loadChatHistory(vaultPath: string): Promise<ChatHistoryRow[] | null> {
	let entries;
	try {
		entries = await call('claude_chat_list', { vaultPath });
	} catch (err) {
		error('CLAUDE', 'claude_chat_list failed:', err);
		throw err;
	}
	if (historyStale(vaultPath)) return null;
	const rows = await Promise.all(
		entries.map(async ({ chatId, modifiedMs }): Promise<ChatHistoryRow | null> => {
			let text: string | null;
			try {
				text = await call('claude_chat_read', { vaultPath, chatId });
			} catch (err) {
				error('CLAUDE', `Could not read chat ${chatId}.json:`, err);
				return null;
			}
			if (text === null) return null;
			const stored = chatFromStored(text);
			if (stored?.chatId !== chatId) {
				error('CLAUDE', `Chat file ${chatId}.json is not a chat Kokobrain can read; it is left as it is.`);
				return null;
			}
			return { chatId, title: stored.title, modifiedMs };
		}),
	);
	if (historyStale(vaultPath)) return null;
	return rows.filter((row) => row !== null);
}

/**
 * Shows a saved chat from the history list. The chat already open stays as it
 * is, without a read. Returns whether the chat now shows: `false` while a turn
 * runs, and when the vault changed or a turn started before the read resolved.
 * A chat that is gone or cannot be parsed throws an `Error` for the user and
 * leaves the open chat; a failed read is logged and rethrown.
 */
export async function openChat(vaultPath: string, chatId: string): Promise<boolean> {
	if (claudeStore.isRunning) return false;
	if (claudeStore.chatId === chatId) return true;
	let text: string | null;
	try {
		text = await call('claude_chat_read', { vaultPath, chatId });
	} catch (err) {
		error('CLAUDE', 'claude_chat_read failed:', err);
		throw err;
	}
	if (historyStale(vaultPath)) return false;
	if (text === null) throw new Error('This chat was deleted.');
	const stored = chatFromStored(text);
	if (stored?.chatId !== chatId) {
		error('CLAUDE', `Chat file ${chatId}.json is not a chat Kokobrain can read; it is left as it is.`);
		throw new Error('This chat cannot be read. Its file is left in the vault.');
	}
	claudeStore.restore(stored);
	return true;
}

/**
 * Deletes a saved chat's file (never the CLI transcript). Deleting the open
 * chat leaves a new empty chat, as New chat does. Does nothing while a turn
 * runs. A failed delete is logged and rethrown.
 */
export async function deleteChat(vaultPath: string, chatId: string): Promise<void> {
	if (claudeStore.isRunning) return;
	try {
		await call('claude_chat_delete', { vaultPath, chatId });
	} catch (err) {
		error('CLAUDE', 'claude_chat_delete failed:', err);
		throw err;
	}
	if (!historyStale(vaultPath) && claudeStore.chatId === chatId) newChat();
}

/** The slash command list requests of one vault in this app session. */
interface SlashFetch {
	/** `vaultStore.path` the requests are for. */
	vaultPath: string;
	/** A request was made for the vault (it may have failed or still run). */
	asked: boolean;
	/** A request is running. */
	inFlight: boolean;
	/** `Init` names that already caused a request, so they never cause another. */
	tried: Set<string>;
	/** The run whose `Done` makes the next request; `null` when none is due. */
	refetchRunId: string | null;
}

/** The open vault's requests; replaced on a vault change, cleared by `resetClaude`, so a reply to a replaced one is dropped. */
let slashFetch: SlashFetch | null = null;

function slashFetchFor(vaultPath: string): SlashFetch {
	if (slashFetch?.vaultPath !== vaultPath) slashFetch = { vaultPath, asked: false, inFlight: false, tried: new Set(), refetchRunId: null };
	return slashFetch;
}

/**
 * Asks `claude` for its command list in the vault and puts it in the store.
 * The reply is the user's private setup: nothing of it is logged. A failure is
 * logged, leaves the map as it was (the menu shows names only), and is rethrown.
 */
async function requestSlashCommands(fetch: SlashFetch): Promise<void> {
	fetch.asked = true;
	fetch.inFlight = true;
	try {
		const rows = await call('claude_slash_commands', {
			binaryPath: settingsStore.claudeCode.binaryPath,
			vaultPath: normalizeVaultPath(fetch.vaultPath),
		});
		if (slashFetch === fetch && vaultStore.path === fetch.vaultPath) claudeStore.setSlashCommandRows(rows);
	} catch (err) {
		error('CLAUDE', 'Could not load the slash command descriptions:', err);
		throw err;
	} finally {
		fetch.inFlight = false;
	}
}

/**
 * Loads the slash command descriptions of the open vault, called when the
 * panel mounts and when the vault changes. Asks only when no request was made
 * for this vault in this app session, so a remount (canvas, kanban or view
 * tab) makes no new call and a failed request is retried only by
 * `slashCommandDetailsAfterEvent`. A failure is logged and rethrown.
 */
export async function loadSlashCommandDetails(): Promise<void> {
	const vaultPath = vaultStore.path;
	if (!vaultPath) return;
	const fetch = slashFetchFor(vaultPath);
	if (fetch.asked) return;
	await requestSlashCommands(fetch);
}

/**
 * Asks again for the command list after a turn whose `Init` brought slash
 * commands that are neither in the map nor tried for this vault (a skill added
 * since, an MCP prompt that never joins): once, after that run's `Done`, so
 * never while the turn runs. An `Init` while a request runs causes none.
 * Called by the `claude-event` listener for every event. Never rejects.
 */
export async function slashCommandDetailsAfterEvent(payload: ClaudeEventPayload): Promise<void> {
	const vaultPath = vaultStore.path;
	if (!vaultPath) return;
	const fetch = slashFetchFor(vaultPath);
	const { event, runId } = payload;
	if (event.type === 'Init') {
		if (fetch.inFlight) return;
		const untried = untriedSlashNames(event.slashCommands, claudeStore.slashCommandDetails, fetch.tried);
		if (untried.length === 0) return;
		for (const name of untried) fetch.tried.add(name);
		fetch.refetchRunId = runId;
		return;
	}
	if (event.type !== 'Done' || fetch.refetchRunId !== runId) return;
	fetch.refetchRunId = null;
	if (fetch.inFlight) return;
	await requestSlashCommands(fetch).catch(() => {});
}

/** Inline message when `claude_cancel_turn` fails; the turn keeps running and Stop stays. */
export const STOP_FAILED = 'Could not stop Claude. Try again.';

/**
 * Stops the running turn (`claude_cancel_turn`). Before its run id is known the
 * stop is remembered and `sendPrompt` cancels once `claude_run_turn` returns.
 * Errors are logged and rethrown.
 */
export async function stop(): Promise<void> {
	const runId = claudeStore.runId;
	if (!runId) {
		claudeStore.requestStop();
		return;
	}
	try {
		await call('claude_cancel_turn', { runId });
	} catch (err) {
		error('CLAUDE', 'claude_cancel_turn failed:', err);
		throw err;
	}
}

/**
 * Closes the chat when the vault closes: cancels a running turn, then clears
 * the chat, its session (keyed to the vault's directory), the vault-relative
 * notes and the slash command descriptions with their request state (a reply
 * still running is then dropped). A failed cancel is logged; the chat is
 * cleared either way.
 */
export function resetClaude(): void {
	const runId = claudeStore.runId;
	if (runId) {
		call('claude_cancel_turn', { runId }).catch((err: unknown) => error('CLAUDE', 'claude_cancel_turn on vault close failed:', err));
	}
	slashFetch = null;
	claudeStore.reset();
}

/** The active tab as a context path, or `null` when it is not a Markdown note in the vault. */
function activeNote(): string | null {
	return activeNoteContextPath(editorStore.activeTabPath, vaultStore.path);
}

/** Starts a new chat: no messages, no session, and the active note as the only attached note. */
export function newChat(): void {
	const note = activeNote();
	claudeStore.newChat(note ? [note] : []);
}

/** Attaches the active note, when there is one. Returns whether a note was attached or already there. */
export function attachActiveNote(): boolean {
	const note = activeNote();
	if (note) claudeStore.addContextNote(note);
	return note !== null;
}
