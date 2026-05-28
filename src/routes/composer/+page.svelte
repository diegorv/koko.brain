<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { listen, type UnlistenFn } from '@tauri-apps/api/event';
	import { onMount, onDestroy } from 'svelte';

	const QC_OPEN_COMPOSER_EVENT = 'qc:open-composer';

	let text = $state('');
	let saved = $state(false);
	let saving = false;
	let textareaEl: HTMLTextAreaElement | undefined = $state();
	let unlisten: UnlistenFn | undefined;
	const SAVE_FLASH_MS = 180;

	async function dismiss() {
		try {
			await invoke('dismiss_composer');
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
			// P2.5 wires the actual executeAction call; for now we just
			// log the body so the flow is observable in dev.
			console.log('[QUICK_CAPTURE] composer save (P2.5 will wire executeAction):', body);
			saved = true;
			await new Promise<void>((resolve) => setTimeout(resolve, SAVE_FLASH_MS));
			saved = false;
		} finally {
			saving = false;
		}
		await dismiss();
	}

	function resetForShow() {
		text = '';
		saved = false;
		saving = false;
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
		textareaEl?.focus();
		try {
			unlisten = await listen<string>(QC_OPEN_COMPOSER_EVENT, () => {
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

<svelte:window on:keydown={onKeyDown} />

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
		background: rgba(30, 30, 32, 0.92);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-radius: 12px;
		transition: box-shadow 100ms ease-out;
	}

	.composer-root.saved {
		box-shadow: inset 0 0 0 3px rgba(79, 70, 229, 0.6);
	}

	textarea {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		resize: none;
		color: rgba(255, 255, 255, 0.92);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		font-size: 14px;
		line-height: 1.5;
	}

	textarea::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	.hint {
		padding-top: 6px;
		color: rgba(255, 255, 255, 0.4);
		font-size: 11px;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		text-align: right;
	}
</style>
