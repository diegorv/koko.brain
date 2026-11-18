<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Button } from '#lib/components/ui/button/index.js';

	interface Props {
		/** Whether the dialog is open (bindable). */
		open: boolean;
		/** Dialog heading, e.g. "New type". */
		title: string;
		/** Confirm button label, e.g. "Create". */
		confirmLabel: string;
		/** Confirm button label while `onConfirm` runs, e.g. "Updating notes..."; `confirmLabel` stays when unset. */
		busyLabel?: string;
		/** Initial input value (prefill for rename flows). */
		initialValue?: string;
		/** Optional helper line shown under the title, e.g. "This will update N notes". */
		description?: string;
		/** Returns an error message for the current value, or null when valid. */
		validate: (name: string) => string | null;
		/** Maps the trimmed name to the name it is saved as; the dialog shows it when it differs. */
		normalize?: (name: string) => string;
		/** Called with the trimmed, validated (and normalized, when `normalize` is set) name when the user confirms. The dialog stays open, ignoring close requests, until it settles. */
		onConfirm: (name: string) => void | Promise<void>;
	}

	let { open = $bindable(), title, confirmLabel, busyLabel, initialValue = '', description = '', validate, normalize, onConfirm }: Props = $props();

	let value = $state('');
	let error = $derived(validate(value));
	/** Hide the error while the field is still empty so a fresh dialog doesn't open with a warning. */
	let showError = $derived(error !== null && value.trim().length > 0);
	/** The name `onConfirm` receives: the trimmed value, normalized when `normalize` is set. */
	let savedName = $derived(normalize ? normalize(value.trim()) : value.trim());
	/** True while `onConfirm` runs. */
	let busy = $state(false);
	/**
	 * The helper line as it stood at confirm. `onConfirm` puts the new name into
	 * the store that `validate` reads, so the live line would flash "already
	 * exists"; kept until the next open so the closing dialog does not flash it either.
	 */
	let frozenLine = $state<{ error: string | null; showError: boolean; savedName: string; trimmed: string } | null>(null);
	let line = $derived(frozenLine ?? { error, showError, savedName, trimmed: value.trim() });

	$effect(() => {
		if (open) {
			value = initialValue;
			frozenLine = null;
		}
	});

	/** Every close (Cancel, Escape, outside click, close button) goes through here. */
	function setOpen(next: boolean) {
		if (!next && busy) return;
		open = next;
	}

	async function confirm() {
		if (busy || error !== null) return;
		const name = savedName;
		frozenLine = { error, showError, savedName, trimmed: value.trim() };
		busy = true;
		try {
			await onConfirm(name);
		} finally {
			busy = false;
			open = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			confirm();
		}
	}
</script>

<Dialog.Root bind:open={() => open, setOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			{#if description}
				<Dialog.Description>{description}</Dialog.Description>
			{/if}
		</Dialog.Header>
		<div class="flex flex-col gap-1.5">
			<Input bind:value onkeydown={handleKeydown} placeholder="Type name" />
			{#if line.showError}
				<span class="text-xs text-destructive">{line.error}</span>
			{:else if line.error === null && line.savedName !== line.trimmed}
				<span class="text-xs text-muted-foreground">Saved as "{line.savedName}"</span>
			{/if}
		</div>
		<Dialog.Footer>
			<Button variant="outline" disabled={busy} onclick={() => setOpen(false)}>Cancel</Button>
			<Button disabled={busy || error !== null} onclick={confirm}>{busy && busyLabel ? busyLabel : confirmLabel}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
