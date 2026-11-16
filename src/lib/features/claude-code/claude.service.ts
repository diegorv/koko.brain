import type { ClaudeEventPayload } from '#lib/contracts/index.js';
import { call } from '#lib/contracts/ipc.js';
import { saveAllDirtyTabs } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { error } from '#lib/utils/debug.js';
import { activeNoteContextPath, chatFromStored, normalizeVaultPath, storedFromChat } from './claude.logic';
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
 * the chat, its session (keyed to the vault's directory) and the vault-relative
 * notes. A failed cancel is logged; the chat is cleared either way.
 */
export function resetClaude(): void {
	const runId = claudeStore.runId;
	if (runId) {
		call('claude_cancel_turn', { runId }).catch((err: unknown) => error('CLAUDE', 'claude_cancel_turn on vault close failed:', err));
	}
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
