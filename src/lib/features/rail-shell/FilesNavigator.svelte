<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Folder from '@lucide/svelte/icons/folder';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import Vault from '@lucide/svelte/icons/vault';
	import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
	import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { getFileName } from '#lib/core/filesystem/fs.logic.js';
	import { resolveIconForPath } from '#lib/features/file-icons/icon-resolver.js';
	import IconRenderer from '#lib/features/file-icons/IconRenderer.svelte';
	import { FILES_LENS, FOLDER_LENS_KIND, navigatorFolders } from './lens.logic';
	import type { Lens } from './rail-shell.types';

	interface Props {
		/** The folder lens the note list shows; no target is the vault root */
		picked: Lens;
		/** Absolute paths of the expanded folders */
		expanded: readonly string[];
		/** Called with the lens of the clicked folder (`FILES_LENS` for the vault root) */
		onPick: (lens: Lens) => void;
		/** Called with a folder's path when its chevron is clicked */
		onToggle: (path: string) => void;
	}

	let { picked, expanded, onPick, onToggle }: Props = $props();

	let expandedSet = $derived(new Set(expanded));
	let vaultRoot = $derived(vaultStore.path?.replace(/\/+$/, '') ?? '');
	let rootPicked = $derived(!picked.target || picked.target === vaultRoot);
	let topFolders = $derived(navigatorFolders(fsStore.fileTree));

	/** Same look as the Types navigator rows: region tokens only. */
	function rowClass(active: boolean): string {
		return `flex w-full items-center gap-1.5 rounded py-[5px] pr-2 text-[15px] cursor-default select-none ${active
			? 'bg-file-explorer-primary/25 text-file-explorer-primary'
			: 'hover:bg-file-explorer-primary/10'}`;
	}
</script>

<div class="flex h-full flex-col bg-file-explorer-bg text-file-explorer-fg" data-files-navigator>
	<!-- pl-6 clears the macOS traffic lights, which overflow the 48 px rail. -->
	<div
		class="flex h-10 shrink-0 items-center gap-2 bg-tab-bar pl-6 pr-3"
		style="box-shadow: inset 0 -1px 0 var(--divider)"
		data-tauri-drag-region
	>
		<span class="truncate text-sm font-medium text-tab-text-active">Files</span>
	</div>

	<div class="flex-1 overflow-y-auto px-1 py-1" data-files-navigator-tree>
		<button
			class="{rowClass(rootPicked)} pl-2"
			aria-current={rootPicked ? 'true' : undefined}
			onclick={() => onPick({ ...FILES_LENS })}
			data-files-navigator-folder={vaultRoot}
			data-files-navigator-root
		>
			<Vault class="size-4 shrink-0 {rootPicked ? 'text-file-explorer-primary' : 'text-file-explorer-muted-fg'}" />
			<span class="truncate font-medium">{getFileName(vaultRoot)}</span>
		</button>
		{#each topFolders as node (node.path)}
			{@render folderRow(node, 1)}
		{/each}
	</div>
</div>

{#snippet folderRow(node: FileTreeNode, depth: number)}
	{@const subfolders = navigatorFolders(node.children)}
	{@const open = expandedSet.has(node.path)}
	{@const active = !rootPicked && picked.target === node.path}
	{@const resolved = resolveIconForPath(node.path)}
	<div
		class={rowClass(active)}
		style:padding-left="{depth * 12}px"
		data-files-navigator-row={node.path}
	>
		{#if subfolders.length > 0}
			<button
				type="button"
				class="shrink-0 cursor-default rounded p-0.5 text-file-explorer-muted-fg hover:bg-file-explorer-primary/10"
				aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
				aria-expanded={open}
				onclick={() => onToggle(node.path)}
				data-files-navigator-toggle={node.path}
			>
				<ChevronRight class="size-3.5 transition-transform {open ? 'rotate-90' : ''}" />
			</button>
		{:else}
			<span class="w-[18px] shrink-0"></span>
		{/if}
		<button
			type="button"
			class="flex min-w-0 flex-1 cursor-default items-center gap-2 text-left"
			aria-current={active ? 'true' : undefined}
			onclick={() => onPick({ kind: FOLDER_LENS_KIND, target: node.path })}
			data-files-navigator-folder={node.path}
		>
			{#if resolved?.icon}
				<IconRenderer icon={resolved.icon} class="size-4 shrink-0" color={resolved.color} />
			{:else if open}
				<FolderOpen class="size-4 shrink-0 {active ? 'text-file-explorer-primary' : 'text-file-explorer-muted-fg'}" />
			{:else}
				<Folder class="size-4 shrink-0 {active ? 'text-file-explorer-primary' : 'text-file-explorer-muted-fg'}" />
			{/if}
			<span class="truncate" style:color={!active && resolved?.titleColor ? resolved.titleColor : undefined}>{node.name}</span>
		</button>
	</div>
	{#if open}
		{#each subfolders as child (child.path)}
			{@render folderRow(child, depth + 1)}
		{/each}
	{/if}
{/snippet}
