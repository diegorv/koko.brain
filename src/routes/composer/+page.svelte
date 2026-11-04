<script lang="ts">
	import type { UnlistenFn } from '@tauri-apps/api/event';
	import { onMount, onDestroy } from 'svelte';
	import { EVENT_NAMES } from '#lib/contracts/events.js';
	import { call, on } from '#lib/contracts/ipc.js';
	import { applyStoredTheme, THEME_VARS_STORAGE_KEY } from '#lib/core/settings/theme.service.js';

	let text = $state('');
	let saved = $state(false);
	let saving = false;
	let dismissing = false;
	let textareaEl: HTMLTextAreaElement | undefined = $state();
	let unlisten: UnlistenFn | undefined;
	const SAVE_FLASH_MS = 180;

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
		const body = text;
		if (!body.trim()) {
			// Empty composer dismisses without writing anything.
			await dismiss();
			return;
		}
		saving = true;
		try {
			// Post the text to Rust, which emits `qc:capture-detected` on the
			// main window where the registered listener fills the active vault
			// and dispatches through deep-link's executeAction.
			await call('submit_composer_capture', { text: body });
			saved = true;
			await new Promise<void>((resolve) => setTimeout(resolve, SAVE_FLASH_MS));
			saved = false;
		} catch (err) {
			console.error('submit_composer_capture failed', err);
		} finally {
			saving = false;
		}
		await dismiss();
	}

	function onStorage(event: StorageEvent) {
		if (event.key === THEME_VARS_STORAGE_KEY) applyStoredTheme();
	}

	function resetForShow() {
		// Re-read on every summon too: a `storage` event can be missed while
		// the window is hidden.
		applyStoredTheme();
		text = '';
		saved = false;
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
			unlisten = await on(EVENT_NAMES.QC_OPEN_COMPOSER, () => {
				resetForShow();
			});
		} catch (err) {
			console.error('listen qc:open-composer failed', err);
		}
	});

	onDestroy(() => {
		unlisten?.();
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
	<div class="hint">ESC cancels · ⌘↩ saves</div>
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
</style>
