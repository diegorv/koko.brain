<script lang="ts">
	import * as Command from '$lib/components/ui/command';
	import { toast } from 'svelte-sonner';
	import { commandPaletteStore } from './command-palette.store.svelte';
	import { getBuiltInCommands } from './command-palette.service';
	import { filterAndRankCommands, formatShortcut } from './command-palette.logic';
	import type { AppCommand } from './command-palette.types';

	let searchQuery = $state('');

	const allCommands = getBuiltInCommands();

	let filteredCommands = $derived(
		filterAndRankCommands(searchQuery, allCommands, commandPaletteStore.recentCommandIds),
	);

	function handleOpenChange(open: boolean) {
		if (!open) {
			commandPaletteStore.close();
			searchQuery = '';
		}
	}

	async function executeCommand(command: AppCommand) {
		commandPaletteStore.addRecentCommand(command.id);
		commandPaletteStore.close();
		searchQuery = '';
		try {
			await command.action();
		} catch (err) {
			console.error(`Command "${command.label}" failed:`, err);
			toast.error(`Command "${command.label}" failed.`);
		}
	}
</script>

<Command.Dialog
	open={commandPaletteStore.isOpen}
	onOpenChange={handleOpenChange}
	shouldFilter={false}
	title="Command Palette"
	description="Search for a command to run"
>
	<Command.Input placeholder="Type a command..." bind:value={searchQuery} />
	<Command.List>
		{#if filteredCommands.length > 0}
			<Command.Group>
				{#each filteredCommands as command (command.id)}
					<Command.Item
						value={command.id}
						onSelect={() => executeCommand(command)}
					>
						<div class="flex flex-1 items-center justify-between">
							<div class="flex flex-col gap-0.5">
								<span>{command.label}</span>
								<span class="text-xs text-muted-foreground">{command.category}</span>
							</div>
							{#if command.shortcut}
								<Command.Shortcut>{formatShortcut(command.shortcut)}</Command.Shortcut>
							{/if}
						</div>
					</Command.Item>
				{/each}
			</Command.Group>
		{:else}
			<Command.Empty>No commands found.</Command.Empty>
		{/if}
	</Command.List>
</Command.Dialog>
