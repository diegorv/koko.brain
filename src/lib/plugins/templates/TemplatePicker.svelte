<script lang="ts">
	import * as Command from '#lib/components/ui/command/index.js';
	import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { toast } from 'svelte-sonner';
	import { templatesStore } from './templates.store.svelte';
	import { createFileFromTemplate } from './templates.service';
	import { filterTemplates, nameLeavesVault, noteExistsInTree, withMdExtension } from './templates.logic';
	import FileText from '@lucide/svelte/icons/file-text';

	let searchQuery = $state('');
	let selectedTemplatePath = $state<string | null>(null);
	let fileName = $state('');
	let isCreating = $state(false);

	let filteredTemplates = $derived(
		filterTemplates(searchQuery, templatesStore.templates),
	);

	/** Whether we're in the "enter filename" step */
	let isNamingStep = $derived(selectedTemplatePath !== null);

	/** Display name of the chosen template, shown as a chip in the naming step */
	let selectedTemplateName = $derived(
		templatesStore.templates.find((t) => t.path === selectedTemplatePath)?.name ?? '',
	);

	/** The vault-relative file `createFileFromTemplate` will create or open */
	let targetFileName = $derived(withMdExtension(fileName.trim()));

	/** Whether the typed name climbs out of the vault, which the service refuses */
	let leavesVault = $derived(nameLeavesVault(fileName.trim()));

	/** Whether Enter opens a note that already exists instead of creating one */
	let targetExists = $derived(
		vaultStore.path !== null && fileName.trim() !== ''
			&& noteExistsInTree(fsStore.fileTree, vaultStore.path, fileName.trim()),
	);

	function handleOpenChange(open: boolean) {
		if (!open) {
			reset();
		}
	}

	function selectTemplate(path: string) {
		selectedTemplatePath = path;
		searchQuery = '';
		fileName = '';
	}

	async function confirmCreate() {
		if (!fileName.trim() || !selectedTemplatePath) return;
		// Capture both values BEFORE reset() — it clears fileName and
		// selectedTemplatePath, so reading them afterwards would pass ''.
		const path = selectedTemplatePath;
		const name = fileName.trim();
		reset();
		try {
			await createFileFromTemplate(path, name);
		} catch (err) {
			console.error('Failed to create file from template:', err);
			toast.error('Failed to create file from template.');
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && isNamingStep && fileName.trim() && !leavesVault && !isCreating) {
			e.preventDefault();
			isCreating = true;
			confirmCreate()
				.finally(() => { isCreating = false; });
		} else if (e.key === 'Backspace' && !e.repeat && isNamingStep && fileName === '') {
			// Back to the template list; the dialog stays open. A held Backspace
			// that just cleared the name auto-repeats and must not go back too.
			e.preventDefault();
			selectedTemplatePath = null;
		}
	}

	function reset() {
		templatesStore.close();
		searchQuery = '';
		selectedTemplatePath = null;
		fileName = '';
	}
</script>

<Command.Dialog
	open={templatesStore.isOpen}
	onOpenChange={handleOpenChange}
	shouldFilter={false}
	title={isNamingStep ? 'New File Name' : 'New File from Template'}
	description={isNamingStep ? 'Enter the name for the new file' : 'Select a template'}
>
	{#if isNamingStep}
		<!-- svelte-ignore a11y_autofocus -->
		<div class="flex items-center gap-2 border-b px-3">
			<span class="flex shrink-0 items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs text-muted-foreground">
				<FileText class="size-3" />
				{selectedTemplateName}
			</span>
			<input
				class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
				placeholder="File name..."
				bind:value={fileName}
				onkeydown={handleKeydown}
				autofocus
			/>
		</div>
		<div class="p-4 text-center text-sm text-muted-foreground">
			{#if !fileName.trim()}
				Type a name for the new file
			{:else if leavesVault}
				Must stay inside the vault
			{:else if targetExists}
				<kbd class="rounded-xs border px-1.5 py-0.5 text-xs">Enter</kbd> opens the existing note
			{:else}
				Creates <span class="font-medium text-foreground">{targetFileName}</span>
				{targetFileName.includes('/') ? 'in the vault' : 'in the vault root'}
			{/if}
		</div>
	{:else}
		<!-- Focus returns here after Backspace unmounts the naming input. -->
		<!-- svelte-ignore a11y_autofocus -->
		<Command.Input placeholder="Search templates..." bind:value={searchQuery} autofocus />
		<Command.List>
			{#if filteredTemplates.length > 0}
				<Command.Group>
					{#each filteredTemplates as template (template.path)}
						<Command.Item
							value={template.path}
							onSelect={() => selectTemplate(template.path)}
						>
							<FileText class="size-4 text-muted-foreground" />
							<span>{template.name}</span>
						</Command.Item>
					{/each}
				</Command.Group>
			{:else if searchQuery.trim().length > 0}
				<Command.Empty>No templates found.</Command.Empty>
			{:else}
				<Command.Empty>No templates available. Add .md files to _templates/ folder.</Command.Empty>
			{/if}
		</Command.List>
	{/if}
</Command.Dialog>
