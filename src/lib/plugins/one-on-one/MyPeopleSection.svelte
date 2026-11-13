<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Plus from '@lucide/svelte/icons/plus';
	import UserRound from '@lucide/svelte/icons/user-round';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { openFileInEditor } from '#lib/core/editor/editor.service.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import { error } from '#lib/utils/debug.js';
	import { ONE_ON_ONE_EVERY_PROPERTY, buildMyPeople, myPeopleDaysLabel } from './one-on-one.logic';
	import { createOneOnOneNote } from './one-on-one.service';

	// The Today lens holds the Calendar clock, so `todayKey` moves at midnight while this shows.
	let rows = $derived(
		buildMyPeople(typeDefinitionsStore.entries, {
			vaultPath: vaultStore.path,
			workPeopleFolder: settingsStore.oneOnOne.workPeopleFolder,
			todayKey: eventCalendarViewStore.todayKey,
			dueAfterDays: settingsStore.oneOnOne.dueAfterDays,
		}),
	);

	async function newOneOnOne(name: string) {
		try {
			await createOneOnOneNote(name);
		} catch (err) {
			error('ONE_ON_ONE', 'Failed to create 1:1 note:', err);
			toast.error('Failed to create 1:1 note.');
		}
	}
</script>

{#if rows.length === 0}
	<div class="px-2 py-1 text-xs text-file-explorer-muted-fg" data-my-people-empty>
		Add {ONE_ON_ONE_EVERY_PROPERTY} to a person in {settingsStore.oneOnOne.workPeopleFolder || 'the work people folder'} to track 1:1s
	</div>
{:else}
	{#each rows as row (row.path)}
		<div
			class="flex items-center gap-1 rounded-md pr-1 {row.path === editorStore.activeTabPath
				? 'bg-file-explorer-accent'
				: 'hover:bg-file-explorer-accent'}"
			data-my-people-row={row.name}
		>
			<button
				type="button"
				class="flex min-w-0 flex-1 cursor-default items-center gap-2 px-2 py-1 text-left text-sm"
				title="Open {row.name}"
				onclick={() => openFileInEditor(row.path)}
				data-my-people-open
			>
				<UserRound class="size-4 shrink-0 text-file-explorer-muted-fg" />
				<span class="truncate">{row.name}</span>
			</button>
			<span
				class="shrink-0 text-[11px] tabular-nums {row.overdue ? 'text-warning' : 'text-file-explorer-muted-fg'}"
				title={row.lastDate ? `Last 1:1 on ${row.lastDate}` : 'No 1:1 yet'}
				data-my-people-days
				data-overdue={row.overdue}
			>
				{myPeopleDaysLabel(row.days)}
			</span>
			<button
				type="button"
				class="flex shrink-0 cursor-default items-center gap-0.5 rounded-xs px-1 py-0.5 text-[11px] text-file-explorer-muted-fg transition-colors hover:text-file-explorer-fg"
				title="New 1:1 with {row.name}"
				onclick={() => newOneOnOne(row.name)}
				data-my-people-new
			>
				<Plus class="size-3" />
				New 1:1
			</button>
		</div>
	{/each}
{/if}
