<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		/** Whether the dialog is open (bindable). */
		open: boolean;
		/** Dialog heading, e.g. "New type". */
		title: string;
		/** Confirm button label, e.g. "Create". */
		confirmLabel: string;
		/** Initial input value (prefill for rename flows). */
		initialValue?: string;
		/** Optional helper line shown under the title, e.g. "This will update N notes". */
		description?: string;
		/** Returns an error message for the current value, or null when valid. */
		validate: (name: string) => string | null;
		/** Called with the trimmed, validated name when the user confirms. */
		onConfirm: (name: string) => void | Promise<void>;
	}

	let { open = $bindable(), title, confirmLabel, initialValue = '', description = '', validate, onConfirm }: Props = $props();

	let value = $state('');
	let error = $derived(validate(value));
	/** Hide the error while the field is still empty so a fresh dialog doesn't open with a warning. */
	let showError = $derived(error !== null && value.trim().length > 0);

	$effect(() => {
		if (open) {
			value = initialValue;
		}
	});

	async function confirm() {
		if (error !== null) return;
		const name = value.trim();
		open = false;
		await onConfirm(name);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			confirm();
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			{#if description}
				<Dialog.Description>{description}</Dialog.Description>
			{/if}
		</Dialog.Header>
		<div class="flex flex-col gap-1.5">
			<Input bind:value onkeydown={handleKeydown} placeholder="Type name" />
			{#if showError}
				<span class="text-xs text-destructive">{error}</span>
			{/if}
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button disabled={error !== null} onclick={confirm}>{confirmLabel}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
