<script lang="ts">
	import * as Command from '#lib/components/ui/command/index.js';
	import { modPickerStore, type ModPickerAction } from './mod-picker.store.svelte';

	/** Text of the input step's field */
	let text = $state('');

	function handleOpenChange(open: boolean) {
		if (!open) modPickerStore.close();
	}

	/** Shows the input step for an action with `input`; otherwise closes the picker and runs it with `''` */
	async function pick(action: ModPickerAction) {
		if (action.input) {
			text = '';
			modPickerStore.askInput(action);
			return;
		}
		modPickerStore.close();
		await action.run('');
	}

	/** Enter closes the picker and runs the action with the text; Escape is the dialog's own close */
	function handleKeydown(e: KeyboardEvent) {
		const action = modPickerStore.inputAction;
		// Enter during IME composition confirms the composed characters, not the field.
		if (e.key !== 'Enter' || e.isComposing || !action) return;
		e.preventDefault();
		const input = text;
		modPickerStore.close();
		void action.run(input);
	}
</script>

<Command.Dialog
	open={modPickerStore.isOpen}
	onOpenChange={handleOpenChange}
	title={modPickerStore.inputAction?.title ?? modPickerStore.title}
	description={modPickerStore.inputAction ? 'Type the text and press Enter' : 'Pick an action to run'}
>
	{#if modPickerStore.inputAction}
		<!-- svelte-ignore a11y_autofocus -->
		<div class="flex items-center border-b px-3">
			<input
				class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
				placeholder={modPickerStore.inputAction.input?.placeholder ?? ''}
				bind:value={text}
				onkeydown={handleKeydown}
				data-mod-input
				autofocus
			/>
		</div>
		<div class="p-4 text-center text-sm text-muted-foreground">
			Press <kbd class="rounded-xs border px-1.5 py-0.5 text-xs">Enter</kbd> to run, <kbd class="rounded-xs border px-1.5 py-0.5 text-xs">Esc</kbd> to cancel
		</div>
	{:else}
		<Command.Input placeholder="Pick an action..." />
		<Command.List>
			<Command.Empty>No actions.</Command.Empty>
			{#each modPickerStore.actions as action (action.id)}
				<Command.Item
					value={action.id}
					keywords={action.description ? [action.title, action.description] : [action.title]}
					onSelect={() => pick(action)}
					data-mod-action={action.id}
				>
					<div class="flex min-w-0 flex-col">
						<span>{action.title}</span>
						{#if action.description}
							<span class="text-xs text-muted-foreground">{action.description}</span>
						{/if}
					</div>
				</Command.Item>
			{/each}
		</Command.List>
	{/if}
</Command.Dialog>
