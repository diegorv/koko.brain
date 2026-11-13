<script lang="ts">
	import Archive from '@lucide/svelte/icons/archive';
	import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Code from '@lucide/svelte/icons/code';
	import Copy from '@lucide/svelte/icons/copy';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import FoldHorizontal from '@lucide/svelte/icons/fold-horizontal';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import Link from '@lucide/svelte/icons/link';
	import Plus from '@lucide/svelte/icons/plus';
	import Star from '@lucide/svelte/icons/star';
	import TableOfContents from '@lucide/svelte/icons/table-of-contents';
	import Trash from '@lucide/svelte/icons/trash-2';
	import UnfoldHorizontal from '@lucide/svelte/icons/unfold-horizontal';
	import Waypoints from '@lucide/svelte/icons/waypoints';
	import type { Component } from 'svelte';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger,
	} from '#lib/components/ui/dropdown-menu/index.js';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { toggleSourceMode } from '#lib/core/editor/editor.service.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { deleteNoteWithConfirm } from '#lib/core/filesystem/delete-note.service.js';
	import {
		toggleActiveNoteArchived,
		toggleActiveNoteFavorite,
		toggleActiveNoteOrganized,
	} from '#lib/features/properties/lifecycle.service.js';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import { openNeighbourhood } from '#lib/features/rail-shell/neighbourhood.service.js';
	import { error } from '#lib/utils/debug.js';
	import { HUB_ACTION_WIDTH, foldActions, getActionBarState, resolveHubAction, type FoldableAction } from './note-action-bar.logic';
	import { noteActionBarActionsStore } from './note-action-bar-actions.store.svelte';
	import {
		copyNoteDeepLink,
		copyNotePath,
		createLinkedNote,
		revealNote,
		toggleWideNotes,
	} from './note-action-bar.service';

	interface Props {
		/** The active markdown note's path; EditorView mounts the bar only for one. */
		path: string;
		/** Shows the table of contents for `path` (the table-of-contents plugin, passed in by the app). */
		onShowTableOfContents: (path: string) => void;
	}

	let { path, onShowTableOfContents }: Props = $props();

	let bar = $derived(getActionBarState(path, editorStore.activeTab?.content ?? ''));

	let favoriteLabel = $derived(bar.favorite ? 'Remove from favorites' : 'Add to favorites');
	let organizedLabel = $derived(bar.organized ? 'Set note as not organized' : 'Set note as organized');
	let raw = $derived(!editorStore.isLivePreview);
	let rawLabel = $derived(raw ? 'Back to live preview' : 'Show raw Markdown');
	let wide = $derived(settingsStore.editor.wideNotes);

	/** New 1:1 (registered by the one-on-one plugin) or New linked note, or nothing for this note. */
	let hubButton = $derived.by(() => {
		const isHub = bar.typeName !== null && (typeDefinitionsStore.typeMetadataMap.get(bar.typeName)?.hub ?? false);
		const hub = resolveHubAction(bar.typeName, isHub, noteActionBarActionsStore.actions);
		if (hub === null) return null;
		if (hub.kind === 'registered') {
			const { action } = hub;
			return { id: action.id, label: action.label, run: () => run(() => action.run(path), action.id) };
		}
		return { id: 'new-linked-note', label: 'New linked note', run: () => run(() => createLinkedNote(path), 'createLinkedNote') };
	});

	/** The bar's measured width; 0 until measured, which folds every foldable action into More. */
	let barWidth = $state(0);
	let fold = $derived(
		foldActions(barWidth > 0 && hubButton ? Math.max(1, barWidth - HUB_ACTION_WIDTH) : barWidth),
	);
	/** Neighbourhood sits before Raw, the other inline foldables after it. */
	let inlineNeighbourhood = $derived(fold.inline.includes('neighbourhood'));
	let inlineAfterRaw = $derived(fold.inline.filter((a) => a !== 'neighbourhood'));

	/** How each foldable action looks and runs, inline or in More. */
	let foldable = $derived<Record<FoldableAction, { label: string; icon: Component; pressed?: boolean; run: () => void }>>({
		neighbourhood: {
			label: "Show this note's neighbourhood in the note list",
			icon: Waypoints,
			run: () => openNeighbourhood(path),
		},
		width: {
			label: wide ? 'Use the normal note width' : 'Use the full note width',
			icon: wide ? FoldHorizontal : UnfoldHorizontal,
			pressed: wide,
			run: toggleWideNotes,
		},
		toc: { label: 'Show the table of contents', icon: TableOfContents, run: () => onShowTableOfContents(path) },
		reveal: {
			label: 'Reveal in Finder',
			icon: FolderOpen,
			run: () => run(() => revealNote(path), 'revealNote'),
		},
		'copy-path': { label: 'Copy path', icon: Copy, run: () => run(() => copyNotePath(path), 'copyNotePath') },
	});

	/**
	 * Runs a bar action (lifecycle toggle, Reveal, copy, delete). The actions
	 * toast their own expected failures; anything that still escapes is logged.
	 */
	function run(action: () => Promise<void>, name: string) {
		action().catch((err) => error('NOTE-ACTION-BAR', `${name} failed:`, err));
	}

	const iconButton =
		'flex size-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted hover:text-editor-fg';
</script>

{#snippet divider()}
	<div class="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden="true" data-bar-divider></div>
{/snippet}

<div
	class="pane-toolbar bg-editor-bg text-tab-text-inactive"
	data-testid="note-action-bar"
	bind:clientWidth={barWidth}
>
	<div class="flex min-w-0 flex-1 items-center gap-1.5 text-xs">
		<span class="shrink-0" data-testid="note-action-bar-type">{bar.typeLabel}</span>
		<span class="shrink-0 opacity-60" aria-hidden="true">›</span>
		<span class="truncate text-editor-fg" data-testid="note-action-bar-file">{bar.fileName}</span>
	</div>

	{#if hubButton}
		<button
			class="flex h-7 shrink-0 items-center gap-1 rounded-md border border-border px-2 text-xs text-editor-fg transition-colors hover:bg-muted"
			data-hub-action={hubButton.id}
			onclick={hubButton.run}
		>
			<Plus class="size-3.5" />
			{hubButton.label}
		</button>
		{@render divider()}
	{/if}

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

	{@render divider()}
	{#if inlineNeighbourhood}
		{@render inlineAction('neighbourhood')}
	{/if}
	<button
		class="{iconButton} {raw ? 'text-editor-fg' : ''}"
		title="{rawLabel} (Cmd+\)"
		aria-label={rawLabel}
		aria-pressed={raw}
		onclick={toggleSourceMode}
	>
		<Code class="size-4" />
	</button>
	{#each inlineAfterRaw as action (action)}
		{@render inlineAction(action)}
	{/each}

	{@render divider()}
	<DropdownMenu>
		<DropdownMenuTrigger class={iconButton} title="More note actions" aria-label="More note actions">
			<Ellipsis class="size-4" />
		</DropdownMenuTrigger>
		<DropdownMenuContent align="end" class="w-56">
			{#each fold.folded as action (action)}
				{@const a = foldable[action]}
				<DropdownMenuItem onclick={a.run} data-action={action}>
					<a.icon />
					{a.label}
				</DropdownMenuItem>
			{/each}
			<DropdownMenuItem onclick={() => run(() => copyNoteDeepLink(path), 'copyNoteDeepLink')}>
				<Link />
				Copy deeplink
			</DropdownMenuItem>
			<!-- With nothing folded, Copy deeplink would be a group of one: no separator then. -->
			{#if fold.folded.length > 0}
				<DropdownMenuSeparator />
			{/if}
			<DropdownMenuItem onclick={() => run(toggleActiveNoteArchived, 'toggleActiveNoteArchived')}>
				{#if bar.archived}
					<ArchiveRestore />
					Restore this archived note
				{:else}
					<Archive />
					Archive this note
				{/if}
			</DropdownMenuItem>
			<DropdownMenuItem variant="destructive" onclick={() => run(() => deleteNoteWithConfirm(path), 'deleteNoteWithConfirm')}>
				<Trash />
				Delete this note
			</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
</div>

{#snippet inlineAction(action: FoldableAction)}
	{@const a = foldable[action]}
	<button
		class="{iconButton} {a.pressed ? 'text-editor-fg' : ''}"
		title={a.label}
		aria-label={a.label}
		aria-pressed={a.pressed}
		data-action={action}
		onclick={a.run}
	>
		<a.icon class="size-4" />
	</button>
{/snippet}
