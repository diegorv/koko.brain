<script lang="ts">
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import { Button } from '$lib/components/ui/button';
	import { settingsStore, DEFAULT_SETTINGS } from '../settings.store.svelte';
	import {
		eventToKeybindingConfig,
		formatKeybinding,
		findKeybindingConflict,
		keybindingsEqual,
		isAcceptableShortcut,
	} from '$lib/core/keybindings/keybindings.logic';
	import SettingItem from './SettingItem.svelte';

	/** Factory default for the cycle-sidebar shortcut (used to detect/reset). */
	const defaultBinding = DEFAULT_SETTINGS.keybindings.cycleSidebarView;

	/** Whether the recorder is actively capturing a key combo. */
	let recording = $state(false);
	/** Label of the conflicting built-in shortcut, or null when none. */
	let conflictLabel = $state<string | null>(null);
	/** Hint shown when the captured combo lacks a command modifier. */
	let hint = $state<string | null>(null);

	const current = $derived(settingsStore.keybindings.cycleSidebarView);
	const isDefault = $derived(keybindingsEqual(current, defaultBinding));

	// While recording, intercept keydown in the capture phase so the captured
	// combo never triggers an existing global shortcut (e.g. Cmd+S saving).
	$effect(() => {
		if (!recording) return;

		function onCapture(e: KeyboardEvent) {
			e.preventDefault();
			e.stopPropagation();

			if (e.key === 'Escape') {
				recording = false;
				return;
			}

			const captured = eventToKeybindingConfig(e);
			if (!captured) return; // modifier-only — wait for a real key

			if (!isAcceptableShortcut(captured)) {
				hint = 'Use at least one of Cmd, Ctrl or Alt.';
				return;
			}

			conflictLabel = findKeybindingConflict(captured);
			hint = null;
			settingsStore.updateKeybindings({ cycleSidebarView: captured });
			recording = false;
		}

		document.addEventListener('keydown', onCapture, true);
		return () => document.removeEventListener('keydown', onCapture, true);
	});

	/** Enters recording mode, clearing any previous warnings. */
	function startRecording() {
		conflictLabel = null;
		hint = null;
		recording = true;
	}

	/** Restores the cycle-sidebar shortcut to its factory default. */
	function resetToDefault() {
		settingsStore.updateKeybindings({ cycleSidebarView: { ...defaultBinding } });
		conflictLabel = null;
		hint = null;
		recording = false;
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Keybindings</h2>

	<SettingItem
		label="Cycle sidebar view"
		description="Switch the left sidebar between Files, Types and Calendar."
	>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				class="min-w-24 font-mono {recording ? 'ring-2 ring-ring' : ''}"
				onclick={startRecording}
			>
				{recording ? 'Press keys…' : formatKeybinding(current)}
			</Button>
			{#if !isDefault}
				<Button
					variant="ghost"
					size="icon"
					class="size-8"
					title="Reset to default"
					aria-label="Reset to default"
					onclick={resetToDefault}
				>
					<RotateCcwIcon class="size-4" />
				</Button>
			{/if}
		</div>
	</SettingItem>

	{#if hint}
		<p class="px-4 text-xs text-muted-foreground">{hint}</p>
	{:else if conflictLabel}
		<p class="px-4 text-xs text-destructive">
			This shortcut is also used by "{conflictLabel}". Both actions will trigger — consider choosing another combination.
		</p>
	{/if}
</div>
