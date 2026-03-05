<script lang="ts">
	import { X, ZoomIn, ZoomOut, Globe, Target } from 'lucide-svelte';
	import { graphViewStore } from './graph-view.store.svelte';
	import { closeGraphTab } from './graph-view.service';
	import type { GraphNode } from './graph-view.types';
	import { getUniqueFolders, getUniqueTags } from './graph-view.logic';

	let {
		nodes,
		onZoomIn,
		onZoomOut,
	}: {
		nodes: GraphNode[];
		onZoomIn: () => void;
		onZoomOut: () => void;
	} = $props();

	let folders = $derived(getUniqueFolders(nodes));
	let tags = $derived(getUniqueTags(nodes));
</script>

<div class="absolute top-3 left-3 z-10 flex flex-col gap-2">
	<!-- Mode + Close -->
	<div class="flex items-center gap-1 rounded-md border border-border bg-background/90 p-1 backdrop-blur-sm">
		<button
			class="rounded px-2 py-1 text-xs transition-colors {graphViewStore.mode === 'global'
				? 'bg-muted text-foreground'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => graphViewStore.setMode('global')}
			title="Global graph"
		>
			<Globe class="h-3.5 w-3.5" />
		</button>
		<button
			class="rounded px-2 py-1 text-xs transition-colors {graphViewStore.mode === 'local'
				? 'bg-muted text-foreground'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => graphViewStore.setMode('local')}
			title="Local graph"
		>
			<Target class="h-3.5 w-3.5" />
		</button>

		<div class="mx-1 h-4 w-px bg-border"></div>

		<button
			class="rounded px-1 py-1 text-muted-foreground transition-colors hover:text-foreground"
			onclick={onZoomIn}
			title="Zoom in"
		>
			<ZoomIn class="h-3.5 w-3.5" />
		</button>
		<button
			class="rounded px-1 py-1 text-muted-foreground transition-colors hover:text-foreground"
			onclick={onZoomOut}
			title="Zoom out"
		>
			<ZoomOut class="h-3.5 w-3.5" />
		</button>

		<div class="mx-1 h-4 w-px bg-border"></div>

		<button
			class="rounded px-1 py-1 text-muted-foreground transition-colors hover:text-foreground"
			onclick={() => closeGraphTab()}
			title="Close graph"
		>
			<X class="h-3.5 w-3.5" />
		</button>
	</div>

	<!-- Filters -->
	<div class="flex flex-col gap-1.5 rounded-md border border-border bg-background/90 p-2 backdrop-blur-sm">
		<input
			type="text"
			placeholder="Search nodes..."
			class="h-7 rounded border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
			value={graphViewStore.filters.searchQuery}
			oninput={(e) => graphViewStore.setFilters({ searchQuery: e.currentTarget.value })}
		/>

		<label class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
			<span>Orphans</span>
			<button
				class="h-4 w-7 rounded-full transition-colors {graphViewStore.filters.showOrphans ? 'bg-primary' : 'bg-muted'}"
				onclick={() => graphViewStore.setFilters({ showOrphans: !graphViewStore.filters.showOrphans })}
				title="Toggle orphan nodes"
			>
				<span
					class="block h-3 w-3 rounded-full bg-foreground transition-transform {graphViewStore.filters.showOrphans ? 'translate-x-3.5' : 'translate-x-0.5'}"
				></span>
			</button>
		</label>

		{#if tags.length > 0}
			<select
				class="h-7 rounded border border-border bg-background px-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
				value={graphViewStore.filters.tag ?? ''}
				onchange={(e) => graphViewStore.setFilters({ tag: e.currentTarget.value || null })}
			>
				<option value="">All tags</option>
				{#each tags as tag}
					<option value={tag}>#{tag}</option>
				{/each}
			</select>
		{/if}

		{#if folders.length > 1}
			<select
				class="h-7 rounded border border-border bg-background px-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
				value={graphViewStore.filters.folder ?? ''}
				onchange={(e) => graphViewStore.setFilters({ folder: e.currentTarget.value || null })}
			>
				<option value="">All folders</option>
				{#each folders as folder}
					<option value={folder}>{folder === '/' ? '/' : folder.split('/').pop()}</option>
				{/each}
			</select>
		{/if}
	</div>

	<!-- Display -->
	<div class="flex flex-col gap-1.5 rounded-md border border-border bg-background/90 p-2 backdrop-blur-sm">
		<span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Display</span>
		<label class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
			<span>Arrows</span>
			<button
				class="h-4 w-7 rounded-full transition-colors {graphViewStore.display.showArrows ? 'bg-primary' : 'bg-muted'}"
				onclick={() => graphViewStore.setDisplay({ showArrows: !graphViewStore.display.showArrows })}
				title="Toggle directional arrows"
			>
				<span
					class="block h-3 w-3 rounded-full bg-foreground transition-transform {graphViewStore.display.showArrows ? 'translate-x-3.5' : 'translate-x-0.5'}"
				></span>
			</button>
		</label>
	</div>
</div>
