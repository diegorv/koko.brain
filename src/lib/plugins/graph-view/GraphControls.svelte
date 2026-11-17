<script lang="ts">
	import ZoomIn from '@lucide/svelte/icons/zoom-in';
	import ZoomOut from '@lucide/svelte/icons/zoom-out';
	import Globe from '@lucide/svelte/icons/globe';
	import Target from '@lucide/svelte/icons/target';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { graphViewStore, MAX_LOCAL_DEPTH, MIN_LOCAL_DEPTH } from './graph-view.store.svelte';
	import type { GraphNode } from './graph-view.types';
	import { getUniqueFolders, getUniqueTags } from './graph-view.logic';

	let {
		nodes,
		onZoomIn,
		onZoomOut,
	}: {
		/** The graph before filters apply, so the options do not shrink to the current selection. */
		nodes: GraphNode[];
		onZoomIn: () => void;
		onZoomOut: () => void;
	} = $props();

	/**
	 * Value of the "All tags" / "All folders" items. bits-ui treats `''` as no
	 * value, so an empty-string item would show as unselected.
	 */
	const ALL = '__all__';

	let folders = $derived(getUniqueFolders(nodes));
	let tags = $derived(getUniqueTags(nodes));

	/** Folder option text: its last path segment, or `/` for the vault root. */
	function folderLabel(folder: string): string {
		return folder === '/' ? '/' : (folder.split('/').pop() ?? folder);
	}
</script>

<div class="absolute top-3 left-3 z-10 flex flex-col gap-2">
	<!-- Mode + Zoom -->
	<div class="flex items-center gap-1 rounded-md border border-border bg-background/90 p-1 backdrop-blur-sm">
		<button
			class="rounded-xs px-2 py-1 text-xs transition-colors {graphViewStore.mode === 'global'
				? 'bg-muted text-foreground'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => graphViewStore.setMode('global')}
			title="Global graph"
			aria-label="Global graph"
		>
			<Globe class="h-3.5 w-3.5" />
		</button>
		<button
			class="rounded-xs px-2 py-1 text-xs transition-colors {graphViewStore.mode === 'local'
				? 'bg-muted text-foreground'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => graphViewStore.setMode('local')}
			title="Local graph"
			aria-label="Local graph"
		>
			<Target class="h-3.5 w-3.5" />
		</button>

		{#if graphViewStore.mode === 'local'}
			<div class="mx-1 h-4 w-px bg-border"></div>

			<div role="group" aria-label="Link depth" class="flex items-center gap-0.5 text-xs text-muted-foreground">
				<span class="px-1">Depth</span>
				<Button
					variant="ghost"
					size="icon-sm"
					class="size-6"
					aria-label="Decrease depth"
					disabled={graphViewStore.localDepth <= MIN_LOCAL_DEPTH}
					onclick={() => graphViewStore.setLocalDepth(graphViewStore.localDepth - 1)}
				>
					<Minus class="h-3 w-3" />
				</Button>
				<span class="w-3 text-center text-foreground tabular-nums" aria-live="polite">{graphViewStore.localDepth}</span>
				<Button
					variant="ghost"
					size="icon-sm"
					class="size-6"
					aria-label="Increase depth"
					disabled={graphViewStore.localDepth >= MAX_LOCAL_DEPTH}
					onclick={() => graphViewStore.setLocalDepth(graphViewStore.localDepth + 1)}
				>
					<Plus class="h-3 w-3" />
				</Button>
			</div>
		{/if}

		<div class="mx-1 h-4 w-px bg-border"></div>

		<button
			class="rounded-xs px-1 py-1 text-muted-foreground transition-colors hover:text-foreground"
			onclick={onZoomIn}
			title="Zoom in"
			aria-label="Zoom in"
		>
			<ZoomIn class="h-3.5 w-3.5" />
		</button>
		<button
			class="rounded-xs px-1 py-1 text-muted-foreground transition-colors hover:text-foreground"
			onclick={onZoomOut}
			title="Zoom out"
			aria-label="Zoom out"
		>
			<ZoomOut class="h-3.5 w-3.5" />
		</button>
	</div>

	<!-- Filters -->
	<div class="flex flex-col gap-1.5 rounded-md border border-border bg-background/90 p-2 backdrop-blur-sm">
		<input
			type="text"
			placeholder="Search nodes..."
			class="h-7 rounded-xs border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
			value={graphViewStore.filters.searchQuery}
			oninput={(e) => graphViewStore.setFilters({ searchQuery: e.currentTarget.value })}
		/>

		<label class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
			<span>Orphans</span>
			<Switch
				checked={graphViewStore.filters.showOrphans}
				onCheckedChange={(v) => graphViewStore.setFilters({ showOrphans: v })}
			/>
		</label>

		<!-- A set filter keeps its control even when its value is not in the list, so it can be cleared. -->
		{#if tags.length > 0 || graphViewStore.filters.tag}
			<Select.Root
				type="single"
				value={graphViewStore.filters.tag ?? ALL}
				onValueChange={(v) => graphViewStore.setFilters({ tag: v === ALL ? null : v })}
			>
				<Select.Trigger size="sm" class="h-7 w-full text-xs" aria-label="Tag filter">
					<span data-slot="select-value">{graphViewStore.filters.tag ? `#${graphViewStore.filters.tag}` : 'All tags'}</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value={ALL} label="All tags" />
					{#each tags as tag (tag)}
						<Select.Item value={tag} label={`#${tag}`} />
					{/each}
				</Select.Content>
			</Select.Root>
		{/if}

		{#if folders.length > 1 || graphViewStore.filters.folder}
			<Select.Root
				type="single"
				value={graphViewStore.filters.folder ?? ALL}
				onValueChange={(v) => graphViewStore.setFilters({ folder: v === ALL ? null : v })}
			>
				<Select.Trigger size="sm" class="h-7 w-full text-xs" aria-label="Folder filter">
					<span data-slot="select-value">{graphViewStore.filters.folder ? folderLabel(graphViewStore.filters.folder) : 'All folders'}</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value={ALL} label="All folders" />
					{#each folders as folder (folder)}
						<Select.Item value={folder} label={folderLabel(folder)} />
					{/each}
				</Select.Content>
			</Select.Root>
		{/if}
	</div>

	<!-- Display -->
	<div class="flex flex-col gap-1.5 rounded-md border border-border bg-background/90 p-2 backdrop-blur-sm">
		<span class="section-label">Display</span>
		<label class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
			<span>Arrows</span>
			<Switch
				checked={graphViewStore.display.showArrows}
				onCheckedChange={(v) => graphViewStore.setDisplay({ showArrows: v })}
			/>
		</label>
	</div>
</div>
