<script lang="ts">
	import * as Command from '#lib/components/ui/command/index.js';
	import { toast } from 'svelte-sonner';
	import { formatShortcut } from '#lib/utils/keybindings.js';
	import { commandPaletteStore } from './command-palette.store.svelte';
	import { filterAndRankCommands } from './command-palette.logic';
	import type { AppCommand } from './command-palette.types';

	let { commands }: {
		/** Every command the palette offers, in display order before ranking. */
		commands: AppCommand[];
	} = $props();

	/** The palette's footer hints, in reading order. */
	const KEY_HINTS = [
		{ keys: '↵', label: 'Run' },
		{ keys: '↑↓', label: 'Navigate' },
		{ keys: 'Esc', label: 'Close' },
	];

	let searchQuery = $state('');

	let filteredCommands = $derived(
		filterAndRankCommands(searchQuery, commands, commandPaletteStore.recentCommandIds),
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
	hints={KEY_HINTS}
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
						<span class="min-w-0 flex-1 truncate">{command.label}</span>
						<span class="shrink-0 text-xs text-muted-foreground">{command.category}</span>
						{#if command.shortcut}
							<Command.Shortcut>{formatShortcut(command.shortcut)}</Command.Shortcut>
						{/if}
					</Command.Item>
				{/each}
			</Command.Group>
		{:else}
			<Command.Empty>No commands found.</Command.Empty>
		{/if}
	</Command.List>
</Command.Dialog>
