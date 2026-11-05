<script lang="ts">
	import { untrack } from 'svelte';
	import Info from '@lucide/svelte/icons/info';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { getVaultEntries } from '#lib/core/vault/vault-entries.service.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
	import { error } from '#lib/utils/debug.js';
	import { buildNoteInfoRows } from './note-info.logic';

	let entry = $state<NoteEntryV2 | null>(null);
	let rows = $derived(buildNoteInfoRows(entry));
	let isNote = $derived.by(() => {
		const tab = editorStore.activeTab;
		return !!tab && (!tab.fileType || tab.fileType === 'markdown');
	});

	$effect(() => {
		if (!isNote) return;
		const path = editorStore.activeTabPath;
		void vaultStore.vaultIndexVersion;

		let stale = false;
		untrack(() => {
			getVaultEntries()
				.then((entries) => {
					if (!stale) entry = entries.find((e) => e.path === path) ?? null;
				})
				.catch((err) => {
					if (stale) return;
					entry = null;
					error('NOTE-INFO', 'failed to read the vault entries:', err);
				});
		});
		return () => {
			stale = true;
		};
	});
</script>

{#if isNote}
	<Separator />
	<div class="p-2">
		<h2 class="text-title text-right-sidebar-primary flex items-center gap-1.5 px-2 mb-1">
			<Info class="size-3.5 shrink-0" />
			Info
		</h2>
		{#each rows as row (row.label)}
			<div class="flex items-center gap-2 px-2 py-0.5 text-row" data-testid="note-info-row">
				<span class="shrink-0 text-right-sidebar-muted-fg">{row.label}</span>
				<span class="min-w-0 flex-1 truncate text-right text-tab-text-inactive" title={row.value}>{row.value}</span>
			</div>
		{/each}
	</div>
{/if}
