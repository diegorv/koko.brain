<script lang="ts">
	import Archive from '@lucide/svelte/icons/archive';
	import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import PanelRight from '@lucide/svelte/icons/panel-right';
	import Star from '@lucide/svelte/icons/star';
	import Trash from '@lucide/svelte/icons/trash-2';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger,
	} from '#lib/components/ui/dropdown-menu/index.js';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { toggleRightSidebar } from '#lib/core/layout/layout.service.js';
	import {
		toggleActiveNoteArchived,
		toggleActiveNoteFavorite,
		toggleActiveNoteOrganized,
	} from '#lib/features/properties/lifecycle.service.js';
	import { error } from '#lib/utils/debug.js';
	import { getActionBarState } from './note-action-bar.logic';
	import { deleteNoteWithConfirm } from './note-action-bar.service';

	/** The active markdown note's path; EditorView mounts the bar only for one. */
	let { path }: { path: string } = $props();

	let bar = $derived(getActionBarState(path, editorStore.activeTab?.content ?? ''));
	let rightVisible = $derived(settingsStore.layout.rightSidebarVisible);

	let favoriteLabel = $derived(bar.favorite ? 'Remove from favorites' : 'Add to favorites');
	let organizedLabel = $derived(bar.organized ? 'Set note as not organized' : 'Set note as organized');
	let sidebarLabel = $derived(rightVisible ? 'Close the right sidebar' : 'Open the right sidebar');

	/** Runs a lifecycle toggle; frontmatter failures already toast, anything else is logged. */
	function run(action: () => Promise<void>, name: string) {
		action().catch((err) => error('NOTE-ACTION-BAR', `${name} failed:`, err));
	}

	const iconButton =
		'flex size-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted hover:text-editor-fg';
</script>

<div
	class="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-editor-bg px-3 text-tab-text-inactive"
	data-testid="note-action-bar"
>
	<div class="flex min-w-0 flex-1 items-center gap-1.5 text-xs">
		<span class="shrink-0" data-testid="note-action-bar-type">{bar.typeLabel}</span>
		<span class="shrink-0 opacity-60" aria-hidden="true">›</span>
		<span class="truncate text-editor-fg" data-testid="note-action-bar-file">{bar.fileName}</span>
	</div>

	<button
		class="{iconButton} {bar.favorite ? 'text-type-yellow' : ''}"
		title="{favoriteLabel} (Cmd+D)"
		aria-label={favoriteLabel}
		aria-pressed={bar.favorite}
		onclick={() => run(toggleActiveNoteFavorite, 'toggleActiveNoteFavorite')}
	>
		<Star class="size-4" fill={bar.favorite ? 'currentColor' : 'none'} />
	</button>
	<button
		class="{iconButton} {bar.organized ? 'text-type-green' : ''}"
		title="{organizedLabel} (Cmd+E)"
		aria-label={organizedLabel}
		aria-pressed={bar.organized}
		onclick={() => run(toggleActiveNoteOrganized, 'toggleActiveNoteOrganized')}
	>
		<!-- Filled: the circle takes the icon color and the check the bar background. -->
		<CircleCheck
			class="size-4 {bar.organized ? '[&_path]:stroke-editor-bg' : ''}"
			fill={bar.organized ? 'currentColor' : 'none'}
		/>
	</button>

	<DropdownMenu>
		<DropdownMenuTrigger class={iconButton} title="More note actions" aria-label="More note actions">
			<Ellipsis class="size-4" />
		</DropdownMenuTrigger>
		<DropdownMenuContent align="end" class="w-56">
			<DropdownMenuItem onclick={() => run(toggleActiveNoteArchived, 'toggleActiveNoteArchived')}>
				{#if bar.archived}
					<ArchiveRestore />
					Restore this archived note
				{:else}
					<Archive />
					Archive this note
				{/if}
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem variant="destructive" onclick={() => run(() => deleteNoteWithConfirm(path), 'deleteNoteWithConfirm')}>
				<Trash />
				Delete this note
			</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>

	<div class="mx-1 h-4 w-px bg-border" aria-hidden="true"></div>
	<button
		class="{iconButton} {rightVisible ? 'text-editor-fg' : ''}"
		title="{sidebarLabel} (Cmd+B)"
		aria-label={sidebarLabel}
		aria-pressed={rightVisible}
		onclick={toggleRightSidebar}
	>
		<PanelRight class="size-4" />
	</button>
</div>
