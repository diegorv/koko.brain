<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { remoteDialogStore } from './remote-dialog.store.svelte';

	const request = $derived(remoteDialogStore.current);

	/** Dismissing (Escape, outside click, close button) picks the last button: No / Cancel. */
	function onOpenChange(open: boolean) {
		if (!open && request) remoteDialogStore.answer(request.buttons[request.buttons.length - 1]);
	}
</script>

{#if request}
	<Dialog.Root open={true} {onOpenChange}>
		<Dialog.Content showCloseButton={false}>
			<Dialog.Header>
				{#if request.title}
					<Dialog.Title>{request.title}</Dialog.Title>
				{/if}
				<Dialog.Description class="whitespace-pre-wrap">{request.message}</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer>
				{#each request.buttons as label, i (i)}
					<Button
						data-remote-dialog-button
						variant={i === 0 ? (request.kind === 'warning' || request.kind === 'error' ? 'destructive' : 'default') : 'outline'}
						onclick={() => remoteDialogStore.answer(label)}
					>
						{label}
					</Button>
				{/each}
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
