import { settingsStore } from './settings.store.svelte';
import { writeSettingsFile } from './settings.service';
import { normalizeSettings } from './settings.logic';
import { debug, error } from '#lib/utils/debug.js';
import type { SettingsLoadOutcome } from './settings.types';

/**
 * Debounce window for settings writes, in milliseconds.
 * Matches the window the settings panel used while it owned the save duty.
 */
const PERSIST_DEBOUNCE_MS = 500;

/**
 * The running persistence session: the vault path captured at start, whether
 * it may write settings.json, and the disposer of its effect root. `null`
 * while persistence is stopped.
 */
let session: { path: string; writable: boolean; dispose: () => void } | null = null;

/** Handle of the pending debounced write, cleared on flush, stop and reschedule */
let timer: ReturnType<typeof setTimeout> | null = null;

/** Last content handed to disk, used to skip writes that would change nothing */
let lastWritten = '';

/**
 * Serializes the settings store exactly as the file on disk stores them.
 *
 * Normalizing here is what keeps an out-of-range value off disk: the numeric
 * settings inputs write the raw typed value into the store on every keystroke
 * and only clamp it when the edit is committed, so the value this effect sees
 * can still be out of range.
 */
function serialize(): string {
	return JSON.stringify(normalizeSettings(settingsStore.settings), null, 2);
}

/**
 * Starts persisting every settings mutation to `vaultPath`.
 *
 * `outcome` is what `loadSettings` resolved for this vault. On
 * `'file-protected'` the store holds defaults the file never contained, and the
 * file's bytes exist nowhere else, so the session never writes it: not the
 * debounced write, not the quit flush, not the flush when the vault is left.
 * Omitting `outcome` means the file loaded and the session may write it, so a
 * caller that ran `loadSettings` must always pass its result.
 *
 * The path is CAPTURED here and never re-read from `vaultStore`: teardown of a
 * previous vault runs from inside `initializeVault` of the next one, so the
 * vault store already points at the new vault by then.
 *
 * Restarting stops any previous session first (flushing its pending write to
 * the vault it was started with).
 */
export function startSettingsPersistence(vaultPath: string, outcome: SettingsLoadOutcome = 'loaded'): void {
	void stopSettingsPersistence();
	// The settings just loaded from this vault are already on disk; treat them
	// as the baseline so starting up does not immediately rewrite the file.
	lastWritten = serialize();
	const started: { path: string; writable: boolean; dispose: () => void } = {
		path: vaultPath,
		writable: outcome !== 'file-protected',
		dispose: () => {},
	};
	started.dispose = $effect.root(() => {
		$effect(() => {
			// Serializing INSIDE the effect is what subscribes to every leaf of
			// the settings object. A shallow read would miss nested mutations
			// such as `layout.railPanelsVisible`.
			if (serialize() === lastWritten) return;
			if (timer !== null) clearTimeout(timer);
			timer = setTimeout(() => {
				timer = null;
				void flushSettingsPersistence();
			}, PERSIST_DEBOUNCE_MS);
		});
	});
	session = started;
}

/**
 * Writes the pending settings change immediately instead of waiting out the
 * debounce. Used on quit, where the window is destroyed before the timer fires.
 * Resolves once the write finished; failures are logged, never rethrown.
 */
export async function flushSettingsPersistence(): Promise<void> {
	if (timer !== null) {
		clearTimeout(timer);
		timer = null;
	}
	if (!session) return;
	const content = serialize();
	if (content === lastWritten) return;
	if (!session.writable) {
		debug('SETTINGS', 'settings.json was not loaded this session; change kept in memory only');
		return;
	}
	try {
		await writeSettingsFile(session.path, content);
		lastWritten = content;
	} catch (err) {
		error('SETTINGS', 'Failed to persist settings:', err);
	}
}

/**
 * Flushes the pending write, then stops persisting.
 *
 * Disposal is SYNCHRONOUS with the caller even though the flush is awaited:
 * `teardownVault` calls `resetSettings()` a few lines after this, and a still
 * live effect would serialize `DEFAULT_SETTINGS` into the vault being left.
 */
export async function stopSettingsPersistence(): Promise<void> {
	const running = session;
	if (!running) return;
	// `flushSettingsPersistence` snapshots the settings before its first await,
	// so the pending change is captured before the effect root goes away.
	const flushed = flushSettingsPersistence();
	running.dispose();
	session = null;
	await flushed;
}
