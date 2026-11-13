<script lang="ts">
	import type { UnlistenFn } from '@tauri-apps/api/event';
	import { onMount, onDestroy } from 'svelte';
	import { EVENT_NAMES } from '#lib/contracts/events.js';
	import { call, on } from '#lib/contracts/ipc.js';
	import { applyStoredTheme, THEME_VARS_STORAGE_KEY } from '#lib/core/settings/theme.service.js';

	const SAVE_FLASH_MS = 180;
	/** How long a save waits for the main window to report the written note. */
	const RESULT_TIMEOUT_MS = 3000;
	/** localStorage key of the unsaved composer text, kept until a save is reported written. */
	const DRAFT_STORAGE_KEY = 'kokobrain:composer-draft';

	let text = $state(readDraft());
	let saved = $state(false);
	/**
	 * Why the last save left the text in place: `failed` when the note was not
	 * written (or the text never reached the main window), `unknown` when no
	 * result arrived in time.
	 */
	let saveProblem = $state<'failed' | 'unknown' | null>(null);
	let saving = false;
	let dismissing = false;
	/**
	 * Counts summons, so a save still waiting when the composer is dismissed
	 * and summoned again leaves the new show alone.
	 */
	let show = 0;
	let textareaEl: HTMLTextAreaElement | undefined = $state();
	const unlisteners: UnlistenFn[] = [];
	/** The save waiting for its `qc:composer-capture-result`. */
	let pending: { requestId: string; settle: (ok: boolean | null) => void } | undefined;

	$effect(() => writeDraft(text));

	// The composer must keep working without storage (private mode, blocked
	// site data): every access is guarded and only the restore is lost.
	function readDraft(): string {
		try {
			return localStorage.getItem(DRAFT_STORAGE_KEY) ?? '';
		} catch {
			return '';
		}
	}

	function writeDraft(value: string) {
		try {
			if (value.trim()) localStorage.setItem(DRAFT_STORAGE_KEY, value);
			else localStorage.removeItem(DRAFT_STORAGE_KEY);
		} catch {
			// See readDraft().
		}
	}

	/**
	 * Resolves with whether the main window wrote the capture of `requestId`,
	 * or `null` when no result arrives within RESULT_TIMEOUT_MS.
	 */
	function waitForResult(requestId: string): Promise<boolean | null> {
		return new Promise((resolve) => {
			const timer = setTimeout(() => settle(null), RESULT_TIMEOUT_MS);
			function settle(ok: boolean | null) {
				clearTimeout(timer);
				if (pending?.requestId === requestId) pending = undefined;
				resolve(ok);
			}
			pending = { requestId, settle };
		});
	}

	async function dismiss() {
		// Idempotent: Esc during the save flash (or Esc spam) must not fire
		// dismiss_composer twice. Reset per show in resetForShow().
		if (dismissing) return;
		dismissing = true;
		try {
			await call('dismiss_composer');
		} catch (err) {
			console.error('dismiss_composer failed', err);
		}
	}

	async function handleSave() {
		if (saving) return;
		saveProblem = null;
		const body = text;
		if (!body.trim()) {
			// Empty composer dismisses without writing anything.
			await dismiss();
			return;
		}
		saving = true;
		const savedShow = show;
		const requestId = crypto.randomUUID();
		// Start waiting before the submit so an early result is not missed.
		const result = waitForResult(requestId);
		let ok: boolean | null;
		try {
			// Post the text to Rust, which emits `qc:capture-detected` on the
			// main window where the registered listener fills the active vault,
			// writes the note and reports back with `requestId`.
			await call('submit_composer_capture', { text: body, requestId });
			ok = await result;
		} catch (err) {
			console.error('submit_composer_capture failed', err);
			// Settle only this save: a newer show may already be waiting on its own.
			if (pending?.requestId === requestId) pending.settle(null);
			ok = false;
		}
		if (show !== savedShow) {
			// Dismissed and summoned again while waiting: do not flash, hide or
			// report on the new show, only drop the text that was written.
			if (ok === true) text = withoutWritten(text, body);
			return;
		}
		if (ok !== true) {
			saving = false;
			// Hiding would leave the user unsure the capture exists. Stay open
			// with the text so Cmd+Enter retries and Esc cancels.
			saveProblem = ok === false ? 'failed' : 'unknown';
			return;
		}
		saved = true;
		// `saving` stays set through the flash: the written text is still in the
		// textarea, so a second Cmd+Enter here would capture it twice.
		await new Promise<void>((resolve) => setTimeout(resolve, SAVE_FLASH_MS));
		saved = false;
		// Written: dropping it from the text (and so the draft) leaves only what
		// was typed after the submit for the next summon.
		text = withoutWritten(text, body);
		if (show === savedShow) {
			saving = false;
			await dismiss();
		}
	}

	/** `current` without the `written` text it starts with; unchanged when it was edited. */
	function withoutWritten(current: string, written: string): string {
		return current.startsWith(written) ? current.slice(written.length) : current;
	}

	function onStorage(event: StorageEvent) {
		if (event.key === THEME_VARS_STORAGE_KEY) applyStoredTheme();
	}

	function resetForShow() {
		// Re-read on every summon too: a `storage` event can be missed while
		// the window is hidden.
		applyStoredTheme();
		show++;
		// Text left unsaved by an earlier show (dismissed, failed or unconfirmed).
		text = readDraft();
		saved = false;
		saveProblem = null;
		saving = false;
		dismissing = false;
		// Defer focus to the next tick so the show + reset commits to DOM first.
		queueMicrotask(() => textareaEl?.focus());
	}

	function onKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			void dismiss();
			return;
		}
		if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
			event.preventDefault();
			void handleSave();
		}
	}

	onMount(async () => {
		applyStoredTheme();
		textareaEl?.focus();
		try {
			unlisteners.push(
				await on(EVENT_NAMES.QC_OPEN_COMPOSER, () => {
					resetForShow();
				}),
			);
		} catch (err) {
			console.error('listen qc:open-composer failed', err);
		}
		try {
			// Without this listener every save ends unconfirmed and keeps its text.
			unlisteners.push(
				await on(EVENT_NAMES.QC_COMPOSER_CAPTURE_RESULT, (result) => {
					if (pending?.requestId === result.requestId) pending.settle(result.ok);
				}),
			);
		} catch (err) {
			console.error('listen qc:composer-capture-result failed', err);
		}
	});

	onDestroy(() => {
		for (const unlisten of unlisteners) unlisten();
	});
</script>

<svelte:window on:keydown={onKeyDown} on:storage={onStorage} />

<div class="composer-root" class:saved data-tauri-drag-region>
	<textarea
		bind:this={textareaEl}
		bind:value={text}
		placeholder="Quick capture..."
		spellcheck="false"
		aria-label="Quick capture composer"
		data-tauri-drag-region="false"
	></textarea>
	{#if saveProblem === 'failed'}
		<div class="hint error" role="alert">Could not save. ⌘↩ retries, ESC cancels.</div>
	{:else if saveProblem === 'unknown'}
		<div class="hint error" role="alert">Save not confirmed. ⌘↩ saves again, ESC cancels.</div>
	{:else}
		<div class="hint">ESC cancels · ⌘↩ saves</div>
	{/if}
</div>

<style>
	:global(html, body) {
		background: transparent;
		margin: 0;
		padding: 0;
		height: 100%;
		overflow: hidden;
	}

	.composer-root {
		display: flex;
		flex-direction: column;
		width: 100vw;
		height: 100vh;
		padding: 14px 16px 10px;
		box-sizing: border-box;
		background: color-mix(in srgb, var(--popover) 92%, transparent);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-radius: 12px;
		transition: box-shadow 100ms ease-out;
	}

	.composer-root.saved {
		box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--primary) 60%, transparent);
	}

	textarea {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		resize: none;
		color: var(--popover-foreground);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		font-size: 14px;
		line-height: 1.5;
	}

	textarea::placeholder {
		color: var(--muted-foreground);
	}

	.hint {
		padding-top: 6px;
		color: var(--muted-foreground);
		font-size: 11px;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		text-align: right;
	}

	.hint.error {
		color: var(--destructive);
	}
</style>
