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
