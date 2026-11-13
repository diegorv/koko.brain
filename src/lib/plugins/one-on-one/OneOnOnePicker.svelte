<script lang="ts">
	import * as Command from '#lib/components/ui/command/index.js';
	import { toast } from 'svelte-sonner';
	import { oneOnOneStore } from './one-on-one.store.svelte';
	import { createOneOnOneNote } from './one-on-one.service';
	import { filterPeople, type PersonEntry } from './one-on-one.logic';
	import { debug } from '#lib/utils/debug.js';
	import UserIcon from '@lucide/svelte/icons/user';

	let searchQuery = $state('');

	let filteredWork = $derived(
		filterPeople(searchQuery, oneOnOneStore.people.filter((p) => p.context === 'work')),
	);
	let filteredPersonal = $derived(
		filterPeople(searchQuery, oneOnOneStore.people.filter((p) => p.context === 'personal')),
	);
	let hasResults = $derived(filteredWork.length > 0 || filteredPersonal.length > 0);

	function handleOpenChange(open: boolean) {
		if (!open) {
			oneOnOneStore.close();
			searchQuery = '';
		}
	}

	async function selectPerson(person: PersonEntry) {
		// The rows stay clickable during the closing animation.
		if (!oneOnOneStore.isOpen) return;
		// Read first: closing drops the handler.
		const handler = oneOnOneStore.selectHandler;
		oneOnOneStore.close();
		searchQuery = '';
		if (handler) {
			try {
				await handler(person);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				debug('ONE_ON_ONE', 'select handler failed:', message);
				toast.error(message);
			}
			return;
		}
		try {
			await createOneOnOneNote(person.name);
		} catch (err) {
			console.error('Failed to create 1:1 note:', err);
			toast.error('Failed to create 1:1 note.');
		}
	}
</script>

<Command.Dialog
	open={oneOnOneStore.isOpen}
	onOpenChange={handleOpenChange}
	shouldFilter={false}
	title="1:1 Note"
	description="Select a person"
>
	<Command.Input placeholder="Select a person..." bind:value={searchQuery} />
	<Command.List>
		{#if hasResults}
			{#if filteredWork.length > 0}
				<Command.Group heading="Work">
					{#each filteredWork as person (person.path)}
						<Command.Item
							value={person.path}
							onSelect={() => selectPerson(person)}
						>
							<UserIcon class="size-4 text-muted-foreground" />
							<span>{person.name}</span>
						</Command.Item>
					{/each}
				</Command.Group>
			{/if}
			{#if filteredPersonal.length > 0}
				<Command.Group heading="Personal">
					{#each filteredPersonal as person (person.path)}
						<Command.Item
							value={person.path}
							onSelect={() => selectPerson(person)}
						>
							<UserIcon class="size-4 text-muted-foreground" />
							<span>{person.name}</span>
						</Command.Item>
					{/each}
				</Command.Group>
			{/if}
		{:else if searchQuery.trim().length > 0}
			<Command.Empty>No people found.</Command.Empty>
		{:else}
			<Command.Empty>No people available. Add .md files to the people folders.</Command.Empty>
		{/if}
	</Command.List>
</Command.Dialog>
