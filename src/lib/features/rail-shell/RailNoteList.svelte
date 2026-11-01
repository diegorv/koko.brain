<script lang="ts">
	import { VList } from 'virtua/svelte';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { resolveIconForPath } from '#lib/features/file-icons/icon-resolver.js';
	import { flattenFileTree } from '#lib/features/quick-switcher/quick-switcher.logic.js';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import NoteRowMenu from '#lib/features/note-list/NoteRowMenu.svelte';
	import NoteRow from '#lib/features/note-list/NoteRow.svelte';
	import { resolveLens } from './lens.logic';
	import { railRegistryStore } from './rail-registry.store.svelte';
	import type { Lens, LensNote } from './rail-shell.types';

	interface Props {
		/** The lens whose notes fill the list */
		lens: Lens;
	}

	let { lens }: Props = $props();

	let resolved = $derived.by(() => {
		void typeDefinitionsStore.entriesVersion;
		return resolveLens(
			lens,
			{
				entries: typeDefinitionsStore.entries,
				vaultPath: vaultStore.path,
				systemFolder: settingsStore.templates.systemFolder,
			},
			railRegistryStore.lensProviders,
		);
	});
	let notes = $derived(resolved?.notes ?? []);
	let activePath = $derived(editorStore.activeTabPath);
	let allPaths = $derived(flattenFileTree(fsStore.fileTree).map((f) => f.path));

	/** The note's own icon, else the icon of its type's definition note. */
	function resolveNoteIcon(note: LensNote) {
		const own = resolveIconForPath(note.path);
		if (own?.icon) return own;
		const defPath = note.isA ? typeDefinitionsStore.getTypeDefinitionPath(note.isA) : undefined;
		if (defPath) {
			const fromType = resolveIconForPath(defPath);
			if (fromType?.icon) return fromType;
		}
		return null;
	}

	function listPropertiesFor(note: LensNote): string[] {
		return note.isA ? (typeDefinitionsStore.getTypeMetadata(note.isA)?.listPropertiesDisplay ?? []) : [];
	}
</script>

<div class="flex h-full flex-col bg-file-explorer-bg text-file-explorer-fg" data-rail-note-list>
	<!-- pl-6 clears the macOS traffic lights, which overflow the 48 px rail. -->
	<div
		class="flex h-10 shrink-0 items-center gap-2 bg-tab-bar pl-6 pr-3"
		style="box-shadow: inset 0 -1px 0 var(--divider)"
		data-tauri-drag-region
	>
		<span class="truncate text-sm font-medium" data-note-list-label>{resolved?.label ?? ''}</span>
		<span class="ml-auto text-[11px] tabular-nums text-file-explorer-muted-fg">{notes.length}</span>
	</div>
	{#if resolved?.rule}
		<div class="shrink-0 border-b border-file-explorer-border px-3 py-1.5 text-[11px] text-file-explorer-muted-fg" data-note-list-rule>
			{resolved.rule}
		</div>
	{/if}

	<NoteRowMenu {notes} class="flex-1 overflow-hidden">
		{#if notes.length === 0}
			<div class="flex items-center justify-center py-8 text-sm text-file-explorer-muted-fg" data-note-list-empty>
				No notes here
			</div>
		{:else}
			<VList data={notes} getKey={(note: LensNote) => note.path} class="px-1 py-1">
				{#snippet children(note: LensNote, i: number)}
					{#if i > 0}
						<div class="h-px bg-file-explorer-border"></div>
					{/if}
					<NoteRow
						{note}
						icon={resolveNoteIcon(note)}
						isActive={note.path === activePath}
						listProperties={listPropertiesFor(note)}
						{allPaths}
						subtitle={note.subtitle}
						italic={note.italic}
					/>
				{/snippet}
			</VList>
		{/if}
	</NoteRowMenu>
</div>
