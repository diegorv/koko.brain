<script lang="ts">
	import type { Component } from 'svelte';
	import Archive from '@lucide/svelte/icons/archive';
	import FileText from '@lucide/svelte/icons/file-text';
	import { openFileInEditor } from '#lib/core/editor/editor.service.js';
	import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import IconRenderer from '#lib/features/file-icons/IconRenderer.svelte';
	import type { ResolvedIcon } from '#lib/features/file-icons/icon-resolver.js';
	import { resolveWikilink } from '#lib/core/filesystem/wikilink-resolution.logic.js';
	import { splitPropertyIntoPills } from '#lib/features/type-definitions/type-sidebar.logic.js';
	import { RENAME_SHORTCUT, useNoteRowMenuContext } from './note-row-menu.context';
	import type { NoteRowNote } from './note-row.types';

	interface Props {
		/** The listed note */
		note: NoteRowNote;
		/** Icon to show; falls back to the file icon when null */
		icon: ResolvedIcon | null | undefined;
		/** Whether the note is the active tab's note */
		isActive: boolean;
		/** Frontmatter keys rendered as pills under the title */
		listProperties: string[];
		/** Every vault path, used to resolve wikilink pills */
		allPaths: string[];
		/** The note's type, shown as the first pill; an untyped note shows none */
		typeName?: string | null;
		/** Second line under the title; without it the row shows no second line */
		subtitle?: string;
		/** Renders the title in italics (inbox notes on the rail note list) */
		italic?: boolean;
		/** Dims the row and adds an archive mark, for an archived note listed among active ones */
		archived?: boolean;
		/** Icon shown when `icon` is empty, e.g. the file kind's on the folder lens */
		fallbackIcon?: Component;
		/** Lets the row be dragged with its path as `text/plain` (dropped on a Files navigator folder to move it) */
		draggable?: boolean;
	}

	let { note, icon, isActive, listProperties, allPaths, typeName = null, subtitle, italic = false, archived = false, fallbackIcon = FileText, draggable = false }: Props = $props();
	let FallbackIcon = $derived(fallbackIcon);

	const menu = useNoteRowMenuContext();
</script>

{#if note.path === fsStore.renamingPath}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="flex w-full items-center gap-2 rounded-md px-2 py-2"
		oncontextmenu={(e) => { e.stopPropagation(); e.preventDefault(); }}
	>
		{#if icon?.icon}
			<IconRenderer icon={icon.icon} class="size-4 shrink-0" color={icon.color} />
		{:else}
			<FallbackIcon class="size-4 shrink-0 text-muted-foreground" />
		{/if}
		<input
			bind:this={menu.rename.input}
			bind:value={menu.rename.value}
			onkeydown={menu.onRenameKeydown}
			onblur={menu.commitRename}
			class="h-6 flex-1 rounded-xs border border-ring bg-background px-1 text-row outline-none"
		/>
	</div>
{:else}
	<button
		data-note-row
		data-note-row-archived={archived ? '' : undefined}
		class="flex w-full flex-col rounded-md px-2 py-2 text-left hover:bg-primary/10 cursor-default select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset {isActive ? 'bg-primary/25' : ''} {archived ? 'opacity-60' : ''}"
		onclick={() => openFileInEditor(note.path)}
		oncontextmenu={() => menu.setContextTarget(note)}
		onkeydown={(e) => { if (e.key === RENAME_SHORTCUT.key) menu.startRename(note); }}
		draggable={draggable ? 'true' : undefined}
		ondragstart={draggable
			? (e) => {
					e.dataTransfer?.setData('text/plain', note.path);
					if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
				}
			: undefined}
	>
		<div class="flex w-full items-start gap-2">
			{#if icon?.icon}
				<IconRenderer icon={icon.icon} class="size-4 shrink-0 mt-0.5" color={icon.color} />
			{:else}
				<FallbackIcon class="size-4 shrink-0 mt-0.5 text-muted-foreground" data-note-row-fallback-icon />
			{/if}
			<div class="min-w-0 flex-1">
				<div data-note-row-title class="truncate text-row font-medium {isActive ? 'text-primary' : ''} {italic ? 'italic' : ''}" style:color={!isActive && icon?.titleColor ? icon.titleColor : undefined}>
					{note.title}
				</div>
				{#if subtitle}
					<div class="truncate text-[11px] text-muted-foreground" data-note-row-subtitle>{subtitle}</div>
				{/if}
			</div>
			{#if archived}
				<Archive class="size-3 shrink-0 mt-1 text-muted-foreground" aria-label="Archived" data-note-row-archived-icon />
			{/if}
		</div>
		{#if typeName || listProperties.length > 0}
			<div class="flex flex-wrap gap-1 mt-1">
				{#if typeName}
					<span class="inline-flex items-center rounded-xs bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary/80 truncate max-w-[140px]" data-note-row-type>
						{typeName}
					</span>
				{/if}
				{#each listProperties as prop (prop)}
					{@const pills = splitPropertyIntoPills(note.frontmatter[prop])}
					{#each pills as pill, i (prop + '-' + pill.text + '-' + i)}
						{#if pill.wikilink}
							{@const resolved = resolveWikilink(pill.wikilink, allPaths, vaultStore.path)}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<span
								class="inline-flex items-center rounded-xs bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary/80 truncate max-w-[140px] hover:bg-primary/20 hover:underline cursor-pointer"
								role="link"
								tabindex="-1"
								onclick={(e: MouseEvent) => { e.stopPropagation(); if (resolved) openFileInEditor(resolved); }}
								onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.stopPropagation(); if (resolved) openFileInEditor(resolved); } }}
								title={resolved ? pill.wikilink : pill.wikilink + ' (not found)'}
							>
								{pill.text}
							</span>
						{:else}
							<span class="inline-flex items-center rounded-xs bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary/80 truncate max-w-[140px]">
								{pill.text}
							</span>
						{/if}
					{/each}
				{/each}
			</div>
		{/if}
	</button>
{/if}
