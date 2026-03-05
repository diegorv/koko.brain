<script lang="ts">
	import * as Command from '$lib/components/ui/command';
	import { toast } from 'svelte-sonner';
	import { templatesStore } from './templates.store.svelte';
	import { createFileFromTemplate } from './templates.service';
	import { filterTemplates } from './templates.logic';
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
		const path = selectedTemplatePath;
		reset();
		try {
			await createFileFromTemplate(path, fileName.trim());
		} catch (err) {
			console.error('Failed to create file from template:', err);
			toast.error('Failed to create file from template.');
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && isNamingStep && fileName.trim() && !isCreating) {
			e.preventDefault();
			isCreating = true;
			confirmCreate()
				.finally(() => { isCreating = false; });
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
		<div class="flex items-center border-b px-3">
			<input
				class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
				placeholder="File name..."
				bind:value={fileName}
				onkeydown={handleKeydown}
				autofocus
			/>
		</div>
		<div class="p-4 text-center text-sm text-muted-foreground">
			{#if fileName.trim()}
				Press <kbd class="rounded border px-1.5 py-0.5 text-xs">Enter</kbd> to create
				<span class="font-medium text-foreground">{fileName.trim()}{fileName.trim().endsWith('.md') ? '' : '.md'}</span>
			{:else}
				Type a name for the new file
			{/if}
		</div>
	{:else}
		<Command.Input placeholder="Search templates..." bind:value={searchQuery} />
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
