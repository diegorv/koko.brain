<script lang="ts">
	import * as Command from '$lib/components/ui/command';
	import { toast } from 'svelte-sonner';
	import { oneOnOneStore } from './one-on-one.store.svelte';
	import { createOneOnOneNote } from './one-on-one.service';
	import { filterPeople } from './one-on-one.logic';
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

	async function selectPerson(name: string) {
		oneOnOneStore.close();
		searchQuery = '';
		try {
			await createOneOnOneNote(name);
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
	description="Select a person to create a 1:1 note"
>
	<Command.Input placeholder="Select a person..." bind:value={searchQuery} />
	<Command.List>
		{#if hasResults}
			{#if filteredWork.length > 0}
				<Command.Group heading="Work">
					{#each filteredWork as person (person.path)}
						<Command.Item
							value={person.path}
							onSelect={() => selectPerson(person.name)}
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
							onSelect={() => selectPerson(person.name)}
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
