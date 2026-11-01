<script lang="ts">
	import { untrack } from 'svelte';
	import FileText from '@lucide/svelte/icons/file-text';
	import Table from '@lucide/svelte/icons/table';
	import Pencil from '@lucide/svelte/icons/pencil';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Copy from '@lucide/svelte/icons/copy';
	import Palette from '@lucide/svelte/icons/palette';
	import Plus from '@lucide/svelte/icons/plus';
	import FolderSearch from '@lucide/svelte/icons/folder-search';
	import { openFileInEditor } from '#lib/core/editor/editor.service.js';
	import { revealInSystemExplorer } from '#lib/core/filesystem/fs.service.js';
	import { getRelativePath, isViewFile } from '#lib/core/filesystem/fs.logic.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { debounce } from '#lib/utils/debounce.js';
	import * as ContextMenu from '#lib/components/ui/context-menu/index.js';
	import { resolveIconForPath } from '#lib/features/file-icons/icon-resolver.js';
	import IconRenderer from '#lib/features/file-icons/IconRenderer.svelte';
	import IconPicker from '#lib/features/file-icons/IconPicker.svelte';
	import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
	import { setIconForPath, removeIconForPath, trackRecentIcon } from '#lib/features/file-icons/file-icons.service.js';
	import type { IconPackId } from '#lib/features/file-icons/file-icons.types.js';
	import {
		createNoteOfType,
		createTypeDefinition,
		createView,
		removeViewIcon,
		renameType,
		updateViewIcon,
	} from '#lib/features/type-definitions/type-definitions.service.js';
	import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
	import type { NoteRecord } from '#lib/features/collection/collection.types.js';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import { validateTypeName } from '#lib/features/type-definitions/type-definitions.logic.js';
	import TypeNameDialog from '#lib/features/type-definitions/TypeNameDialog.svelte';
	import { sameLens, VIEW_LENS_KIND } from './lens.logic';
	import { countViewNotes } from './view-lens.service';
	import type { Lens, LensContext, TypeNavigatorRow } from './rail-shell.types';

	interface Props {
		/** The rows to list: `viewNavigatorRows` (shown under Views), then `typeNavigatorRows` */
		rows: TypeNavigatorRow[];
		/** The lens the note list shows; its row is highlighted */
		picked: Lens;
		/** Called with the lens of a clicked row, or of a type just created with New type */
		onPick: (lens: Lens) => void;
	}

	let { rows, picked, onPick }: Props = $props();

	let viewRows = $derived(rows.filter((r) => r.lens.kind === VIEW_LENS_KIND));
	let typeRows = $derived(rows.filter((r) => r.lens.kind !== VIEW_LENS_KIND));

	/** The type row the context menu acts on; null (Untyped, empty space) opens no menu. */
	let menuRow = $state<TypeNavigatorRow | null>(null);
	/** The view row the context menu acts on; set instead of `menuRow` */
	let menuViewPath = $state<string | null>(null);

	/** View path -> number of notes its list holds; a view missing here shows no count. */
	let viewCounts = $state<Map<string, number>>(new Map());
	let countGeneration = 0;
	// Every note save replaces the property index, and a count re-reads each .view from disk.
	const recountViews = debounce(
		async (paths: string[], ctx: LensContext, propertyIndex: Map<string, NoteRecord>, generation: number) => {
			const counts = await countViewNotes(paths, ctx, propertyIndex);
			if (generation === countGeneration) viewCounts = counts;
		},
		1000,
	);

	$effect(() => {
		const paths = viewRows.flatMap((r) => (r.lens.target ? [r.lens.target] : []));
		void typeDefinitionsStore.entriesVersion;
		const ctx: LensContext = {
			entries: typeDefinitionsStore.entries,
			vaultPath: vaultStore.path,
			systemFolder: settingsStore.templates.systemFolder,
			typeMetadataMap: typeDefinitionsStore.typeMetadataMap,
		};
		const propertyIndex = collectionStore.propertyIndex;
		const ready = collectionStore.isIndexReady;
		const generation = ++countGeneration;
		untrack(() => {
			// Without the property index every query matches nothing.
			if (ready) recountViews(paths, ctx, propertyIndex, generation);
		});
		return () => recountViews.cancel();
	});

	async function handleNewView() {
		const path = await createView();
		if (path) onPick({ kind: VIEW_LENS_KIND, target: path });
	}
	let newTypeDialogOpen = $state(false);
	let renameTarget = $state<{ name: string; path: string; count: number } | null>(null);
	let renameDialogOpen = $state(false);
	let iconPickerPath = $state<string | null>(null);
	let iconPickerOpen = $state(false);
	let iconPickerRef = $derived(iconPickerPath ? fileIconsStore.getFrontmatterIcon(iconPickerPath) : undefined);

	/** Every known type name (definitions plus types only their notes name), for the name checks. */
	let existingTypeNames = $derived([
		...new Set([
			...typeDefinitionsStore.typeMetadataMap.keys(),
			...rows.flatMap((r) => (r.typeName ? [r.typeName] : [])),
		]),
	]);

	async function handleNewType(name: string) {
		// `select` keeps the definition note closed, as the classic New type does.
		const created = await createTypeDefinition(name, { select: true });
		if (created) onPick({ kind: 'type', target: name });
	}

	function handleRename(row: TypeNavigatorRow, path: string) {
		if (!row.typeName) return;
		renameTarget = { name: row.typeName, path, count: row.count ?? 0 };
		renameDialogOpen = true;
	}

	function handleChangeIcon(path: string) {
		iconPickerPath = path;
		iconPickerOpen = true;
	}

	// A view keeps its icon in its own YAML; a type definition note goes through the icon service.
	async function handleIconSelect(pack: IconPackId, name: string, color?: string, textColor?: string) {
		if (!vaultStore.path || !iconPickerPath) return;
		if (isViewFile(iconPickerPath)) {
			await updateViewIcon(iconPickerPath, `${pack}:${name}`, color, textColor);
		} else {
			await setIconForPath(vaultStore.path, iconPickerPath, pack, name, color, textColor);
		}
		await trackRecentIcon(vaultStore.path, pack, name);
	}

	async function handleIconRemove() {
		if (!vaultStore.path || !iconPickerPath) return;
		if (isViewFile(iconPickerPath)) {
			await removeViewIcon(iconPickerPath);
		} else {
			await removeIconForPath(vaultStore.path, iconPickerPath);
		}
	}

	function handleIconPickerClose() {
		iconPickerOpen = false;
		iconPickerPath = null;
	}
</script>

<div class="flex h-full flex-col bg-file-explorer-bg text-file-explorer-fg" data-types-navigator>
	<!-- pl-6 clears the macOS traffic lights, which overflow the 48 px rail. -->
	<div
		class="flex h-10 shrink-0 items-center gap-2 bg-tab-bar pl-6 pr-3"
		style="box-shadow: inset 0 -1px 0 var(--divider)"
		data-tauri-drag-region
	>
		<span class="truncate text-sm font-medium text-tab-text-active">Types</span>
		<button
			type="button"
			class="ml-auto flex shrink-0 cursor-default items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-tab-text-inactive transition-colors hover:bg-file-explorer-accent hover:text-tab-text-active"
			title="Create a type"
			onclick={() => { newTypeDialogOpen = true; }}
			data-types-navigator-new-type
		>
			<Plus class="size-3.5" />
			New type
		</button>
	</div>

	<ContextMenu.Root>
		<ContextMenu.Trigger>
			{#snippet child({ props })}
				<div
					{...props}
					class="flex-1 overflow-y-auto px-1 py-1"
					oncontextmenu={(e) => {
						if (e.target === e.currentTarget || (!menuRow && !menuViewPath)) {
							menuRow = null;
							menuViewPath = null;
							e.preventDefault();
							return;
						}
						if (typeof props.oncontextmenu === 'function') props.oncontextmenu(e);
					}}
				>
					<div class="mx-2 mb-1.5 mt-1 flex items-center" data-types-navigator-views>
						<span class="text-[11px] font-medium uppercase tracking-wider text-file-explorer-muted-fg">Views</span>
						<button
							type="button"
							class="ml-auto shrink-0 cursor-default rounded p-0.5 text-file-explorer-muted-fg hover:bg-file-explorer-primary/10"
							title="New view"
							onclick={handleNewView}
							data-types-navigator-new-view
						>
							<Plus class="size-3.5" />
						</button>
					</div>
					{#each viewRows as row (row.lens.target)}
						{@const path = row.lens.target ?? ''}
						{@const active = sameLens(row.lens, picked)}
						{@const resolved = resolveIconForPath(path)}
						{@const count = viewCounts.get(path)}
						<button
							class="flex w-full items-center gap-2 rounded px-2 py-[5px] text-[15px] cursor-default select-none {active
								? 'bg-file-explorer-primary/25 text-file-explorer-primary'
								: 'hover:bg-file-explorer-primary/10'}"
							aria-current={active ? 'true' : undefined}
							onclick={() => onPick(row.lens)}
							oncontextmenu={() => { menuRow = null; menuViewPath = path; }}
							data-types-navigator-row="view"
							data-types-navigator-view={path}
						>
							{#if resolved?.icon}
								<IconRenderer icon={resolved.icon} class="size-4 shrink-0" color={resolved.color} />
							{:else}
								<Table class="size-4 shrink-0 {active ? 'text-file-explorer-primary' : 'text-file-explorer-muted-fg'}" />
							{/if}
							<span class="truncate" style:color={!active && resolved?.titleColor ? resolved.titleColor : undefined}>{row.label}</span>
							{#if count !== undefined}
								<span class="ml-auto shrink-0 pr-1 text-xs tabular-nums text-file-explorer-badge-fg" data-types-navigator-count>{count}</span>
							{/if}
						</button>
					{/each}
					<div class="mx-2 my-2 h-px bg-file-explorer-border"></div>

					{#if typeRows.length === 0}
						<div class="px-2 py-8 text-center text-sm text-file-explorer-muted-fg" data-types-navigator-empty>No types yet</div>
					{/if}
					{#each typeRows as row (`${row.lens.kind}:${row.lens.target ?? ""}`)}
						{@const active = sameLens(row.lens, picked)}
						{@const resolved = row.definitionPath ? resolveIconForPath(row.definitionPath) : undefined}
						<button
							class="flex w-full items-center gap-2 rounded px-2 py-[5px] text-[15px] cursor-default select-none {active
								? 'bg-file-explorer-primary/25 text-file-explorer-primary'
								: 'hover:bg-file-explorer-primary/10'}"
							aria-current={active ? 'true' : undefined}
							onclick={() => onPick(row.lens)}
							oncontextmenu={() => { menuRow = row.typeName ? row : null; menuViewPath = null; }}
							data-types-navigator-row={row.typeName ?? row.lens.kind}
						>
							{#if resolved?.icon}
								<IconRenderer icon={resolved.icon} class="size-4 shrink-0" color={resolved.color} />
							{:else}
								<FileText class="size-4 shrink-0 {active ? 'text-file-explorer-primary' : 'text-file-explorer-muted-fg'}" />
							{/if}
							<span class="truncate" style:color={!active && resolved?.titleColor ? resolved.titleColor : undefined}>{row.label}</span>
							<span class="ml-auto shrink-0 pr-1 text-xs tabular-nums text-file-explorer-badge-fg" data-types-navigator-count>{row.count}</span>
						</button>
					{/each}
				</div>
			{/snippet}
		</ContextMenu.Trigger>
		<ContextMenu.Content class="w-56">
			{#if menuViewPath}
				{@const path = menuViewPath}
				<ContextMenu.Item onclick={() => openFileInEditor(path)}>
					<ExternalLink class="size-4" />
					<span>Open view</span>
				</ContextMenu.Item>
				<ContextMenu.Separator />

				<ContextMenu.Sub>
					<ContextMenu.SubTrigger>
						<Copy class="size-4" />
						<span>Copy path</span>
					</ContextMenu.SubTrigger>
					<ContextMenu.SubContent>
						<ContextMenu.Item onclick={() => navigator.clipboard.writeText(path)}>
							<span>Copy absolute path</span>
						</ContextMenu.Item>
						<ContextMenu.Item onclick={() => { if (vaultStore.path) navigator.clipboard.writeText(getRelativePath(vaultStore.path, path)); }}>
							<span>Copy relative path</span>
						</ContextMenu.Item>
					</ContextMenu.SubContent>
				</ContextMenu.Sub>
				<ContextMenu.Separator />

				<ContextMenu.Item onclick={() => handleChangeIcon(path)}>
					<Palette class="size-4" />
					<span>Change icon</span>
				</ContextMenu.Item>
				<ContextMenu.Separator />
				<ContextMenu.Item onclick={() => revealInSystemExplorer(path)}>
					<FolderSearch class="size-4" />
					<span>Reveal in Finder</span>
				</ContextMenu.Item>
			{:else if menuRow?.typeName}
				{@const row = menuRow}
				{@const typeName = menuRow.typeName}
				<ContextMenu.Item onclick={() => createNoteOfType(typeName)}>
					<Plus class="size-4" />
					<span>New {typeName}</span>
				</ContextMenu.Item>
				<ContextMenu.Separator />
				{#if row.definitionPath}
					{@const path = row.definitionPath}
					<ContextMenu.Item onclick={() => handleRename(row, path)}>
						<Pencil class="size-4" />
						<span>Rename</span>
					</ContextMenu.Item>
					<ContextMenu.Separator />

					<ContextMenu.Item onclick={() => openFileInEditor(path)}>
						<ExternalLink class="size-4" />
						<span>Open type definition</span>
					</ContextMenu.Item>
					<ContextMenu.Separator />

					<ContextMenu.Sub>
						<ContextMenu.SubTrigger>
							<Copy class="size-4" />
							<span>Copy path</span>
						</ContextMenu.SubTrigger>
						<ContextMenu.SubContent>
							<ContextMenu.Item onclick={() => navigator.clipboard.writeText(path)}>
								<span>Copy absolute path</span>
							</ContextMenu.Item>
							<ContextMenu.Item onclick={() => { if (vaultStore.path) navigator.clipboard.writeText(getRelativePath(vaultStore.path, path)); }}>
								<span>Copy relative path</span>
							</ContextMenu.Item>
						</ContextMenu.SubContent>
					</ContextMenu.Sub>
					<ContextMenu.Separator />

					<ContextMenu.Item onclick={() => handleChangeIcon(path)}>
						<Palette class="size-4" />
						<span>Change icon</span>
					</ContextMenu.Item>
					<ContextMenu.Separator />
					<ContextMenu.Item onclick={() => revealInSystemExplorer(path)}>
						<FolderSearch class="size-4" />
						<span>Reveal in Finder</span>
					</ContextMenu.Item>
				{:else}
					<ContextMenu.Item onclick={() => createTypeDefinition(typeName)}>
						<FileText class="size-4" />
						<span>Create type definition</span>
					</ContextMenu.Item>
				{/if}
			{/if}
		</ContextMenu.Content>
	</ContextMenu.Root>
</div>

<TypeNameDialog
	bind:open={newTypeDialogOpen}
	title="New type"
	confirmLabel="Create"
	validate={(name) => validateTypeName(name, existingTypeNames)}
	onConfirm={handleNewType}
/>

{#if renameTarget}
	{@const target = renameTarget}
	<TypeNameDialog
		bind:open={renameDialogOpen}
		title="Rename type"
		confirmLabel="Rename"
		initialValue={target.name}
		description={`This will update ${target.count} ${target.count === 1 ? 'note' : 'notes'}`}
		validate={(name) => validateTypeName(name, existingTypeNames.filter((n) => n !== target.name))}
		onConfirm={(name) => renameType(target.name, name, target.path)}
	/>
{/if}

{#if iconPickerPath}
	<IconPicker
		bind:open={iconPickerOpen}
		currentPack={iconPickerRef?.iconPack}
		currentName={iconPickerRef?.iconName}
		currentColor={iconPickerRef?.color}
		currentTextColor={iconPickerRef?.titleColor}
		onSelect={handleIconSelect}
		onRemove={handleIconRemove}
		onClose={handleIconPickerClose}
	/>
{/if}
