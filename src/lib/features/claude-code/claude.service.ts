import { call } from '#lib/contracts/ipc.js';
import { saveAllDirtyTabs } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { error } from '#lib/utils/debug.js';
import { activeNoteContextPath, normalizeVaultPath } from './claude.logic';
import { claudeStore } from './claude.store.svelte';

/** The message of an IPC rejection, which Tauri sends as a plain string. */
function messageOf(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

/**
 * Sends one prompt as an agent turn. Dirty tabs are saved first: a dirty tab
 * wins over disk, so its next auto-save would undo what Claude writes. The text
 * goes to `claude_run_turn` unchanged (a leading `/name` must stay first for the
 * CLI to expand it), with the attached notes and the session of the last
 * `Result`. A failure ends the turn with an inline error and is rethrown.
 * Does nothing for blank text or while a turn runs.
 */
export async function sendPrompt(text: string): Promise<void> {
	if (claudeStore.isRunning || text.trim() === '') return;
	const vaultPath = vaultStore.path;
	claudeStore.beginTurn(text);
	try {
		if (!vaultPath) throw new Error('Open a vault to chat with Claude.');
		const unsaved = await saveAllDirtyTabs();
		if (unsaved.length > 0) {
			throw new Error(`Could not save ${unsaved.join(', ')}. Save it before sending, or Claude's edits to it could be overwritten.`);
		}
		const runId = await call('claude_run_turn', {
			request: {
				vaultPath: normalizeVaultPath(vaultPath),
				prompt: text,
				resumeSessionId: claudeStore.sessionId ?? undefined,
				contextNotePaths: [...claudeStore.contextNotes],
				binaryPath: settingsStore.claudeCode.binaryPath,
			},
		});
		claudeStore.startRun(runId);
	} catch (err) {
		error('CLAUDE', 'sendPrompt failed:', err);
		claudeStore.failTurn(messageOf(err));
		throw err;
	}
	// Stop was clicked while the turn had no run id yet; a replayed Done already cleared it.
	if (claudeStore.stopRequested && claudeStore.runId) {
		await stop().catch(() => claudeStore.showError(STOP_FAILED));
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
