<script lang="ts">
	import NoteRowMenu from '#lib/features/note-list/NoteRowMenu.svelte';
	import NoteRow from '#lib/features/note-list/NoteRow.svelte';
	import type { RailMenuItem } from '#lib/features/rail-shell/rail-shell.types.js';
	import type { NoteRowNote } from '#lib/features/note-list/note-row.types.js';
	import type { ResolvedIcon } from '#lib/features/file-icons/icon-resolver.js';

	interface Props {
		notes: NoteRowNote[];
		/** Extra menu entries supplied by the list */
		extraItems?: readonly RailMenuItem[];
		/** Path rendered as the active row */
		activePath?: string | null;
		listProperties?: string[];
		allPaths?: string[];
		/** Second line passed to every row */
		subtitle?: string;
		/** Resolved icon per note path; a row without one gets `null` */
		icons?: Record<string, ResolvedIcon>;
	}

	let { notes, extraItems = [], activePath = null, listProperties = [], allPaths = [], subtitle, icons = {} }: Props = $props();

	/** Replaces the `notes` prop, as a list refresh does */
	let replaced = $state<NoteRowNote[] | null>(null);
	const list = $derived(replaced ?? notes);

	/** Hands the menu and the rows a fresh notes array */
	export function setNotes(next: NoteRowNote[]) {
		replaced = next;
	}
</script>

<!-- A plain list (no VList) so rows mount without layout shims; the blank div is a non-row area. -->
<NoteRowMenu notes={list} {extraItems} class="flex-1 overflow-hidden">
	<div data-testid="blank" style="height: 20px"></div>
	{#each list as note (note.path)}
		<NoteRow {note} icon={icons[note.path] ?? null} isActive={note.path === activePath} {listProperties} {allPaths} {subtitle} />
	{/each}
</NoteRowMenu>
