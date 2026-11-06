<script lang="ts">
	import * as Command from '#lib/components/ui/command/index.js';
	import { modPickerStore, type ModPickerAction } from './mod-picker.store.svelte';

	function handleOpenChange(open: boolean) {
		if (!open) modPickerStore.close();
	}

	/** Closes the picker, then runs the action; the host's run reports a failure itself */
	async function pick(action: ModPickerAction) {
		modPickerStore.close();
		await action.run();
	}
</script>

<Command.Dialog
	open={modPickerStore.isOpen}
	onOpenChange={handleOpenChange}
	title={modPickerStore.title}
	description="Pick an action to run"
>
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
</Command.Dialog>
