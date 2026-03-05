<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { FilePlus, FolderPlus, ChevronsDownUp, ArrowDownAZ, ArrowDownWideNarrow } from 'lucide-svelte';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
	import { changeSortOption } from '$lib/core/filesystem/fs.service';
	import type { SortOption } from '$lib/core/filesystem/fs.types';
	import DailyNoteButton from '$lib/plugins/periodic-notes/DailyNoteButton.svelte';

	/** Props passed from the parent FileExplorer component */
	interface Props {
		onNewFile: () => void;
		onNewFolder: () => void;
	}

	let { onNewFile, onNewFolder }: Props = $props();

	/** Collapses every expanded directory in the file tree */
	function handleCollapseAll() {
		fsStore.collapseAll();
	}

	/** Updates the file tree sort order (e.g. by name or date modified) */
	function handleSortChange(option: SortOption) {
		changeSortOption(option);
	}
</script>

<div class="flex items-center justify-end h-10 px-3 gap-0.5 bg-tab-bar" data-tauri-drag-region>
	<div class="flex items-center gap-0.5">
		<DailyNoteButton />

		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						size="icon-sm"
						class="size-6"
						onclick={onNewFile}
					>
						<FilePlus class="size-3.5" />
					</Button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content>New File</Tooltip.Content>
		</Tooltip.Root>

		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						size="icon-sm"
						class="size-6"
						onclick={onNewFolder}
					>
						<FolderPlus class="size-3.5" />
					</Button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content>New Folder</Tooltip.Content>
		</Tooltip.Root>

		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						size="icon-sm"
						class="size-6"
						onclick={handleCollapseAll}
					>
						<ChevronsDownUp class="size-3.5" />
					</Button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content>Collapse All</Tooltip.Content>
		</Tooltip.Root>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props: tooltipProps })}
								<Button
									{...tooltipProps}
									{...props}
									variant="ghost"
									size="icon-sm"
									class="size-6"
								>
									{#if fsStore.sortBy === 'name'}
										<ArrowDownAZ class="size-3.5" />
									{:else}
										<ArrowDownWideNarrow class="size-3.5" />
									{/if}
								</Button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content>Sort</Tooltip.Content>
					</Tooltip.Root>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-40">
				<DropdownMenu.Item onclick={() => handleSortChange('name')}>
					<ArrowDownAZ class="size-4" />
					<span>Name</span>
					{#if fsStore.sortBy === 'name'}
						<span class="ml-auto text-xs text-muted-foreground">&#10003;</span>
					{/if}
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => handleSortChange('modified')}>
					<ArrowDownWideNarrow class="size-4" />
					<span>Date Modified</span>
					{#if fsStore.sortBy === 'modified'}
						<span class="ml-auto text-xs text-muted-foreground">&#10003;</span>
					{/if}
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</div>
