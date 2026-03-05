<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Loader2, Send } from 'lucide-svelte';
	import { todoistStore } from './todoist.store.svelte';
	import { loadProjects, loadSections, sendTaskToTodoist } from './todoist.service';
	import { mapPriorityToTodoist } from './todoist-bridge.logic';
	import type { TaskMetadata } from './task-metadata.types';

	let {
		taskText,
		filePath,
		metadata,
	}: {
		/** Task content to send */
		taskText: string;
		/** Source file path for sent-task tracking */
		filePath: string;
		/** Parsed metadata from emoji signifiers (auto-populates fields) */
		metadata?: TaskMetadata;
	} = $props();

	let open = $state(false);
	let selectedProjectId = $state('');
	let selectedSectionId = $state('');
	let selectedPriority = $state('1');
	let error = $state('');

	const PRIORITIES = [
		{ value: '1', label: 'Normal' },
		{ value: '2', label: 'High' },
		{ value: '3', label: 'Urgent' },
		{ value: '4', label: 'Very Urgent' },
	];

	/** Finds label for the selected project */
	function selectedProjectLabel(): string {
		if (!selectedProjectId) return 'Inbox (default)';
		return todoistStore.projects.find((p) => p.id === selectedProjectId)?.name ?? 'Inbox (default)';
	}

	/** Finds label for the selected section */
	function selectedSectionLabel(): string {
		if (!selectedSectionId) return 'No section';
		return todoistStore.sections.find((s) => s.id === selectedSectionId)?.name ?? 'No section';
	}

	/** Finds label for the selected priority */
	function selectedPriorityLabel(): string {
		return PRIORITIES.find((p) => p.value === selectedPriority)?.label ?? 'Normal';
	}

	async function handleOpen(isOpen: boolean) {
		open = isOpen;
		if (!isOpen) return;

		error = '';
		selectedProjectId = todoistStore.lastProjectId;
		selectedSectionId = todoistStore.lastSectionId;

		// Auto-populate priority from metadata, fallback to remembered selection
		if (metadata?.priority) {
			selectedPriority = String(mapPriorityToTodoist(metadata.priority));
		} else {
			selectedPriority = String(todoistStore.lastPriority || 1);
		}

		try {
			await loadProjects();
			if (selectedProjectId) {
				await loadSections(selectedProjectId);
			}
		} catch (err) {
			error = String(err);
		}
	}

	async function handleProjectChange(value: string) {
		selectedProjectId = value;
		selectedSectionId = '';
		todoistStore.setSections([]);

		if (value) {
			try {
				await loadSections(value);
			} catch (err) {
				error = String(err);
			}
		}
	}

	async function handleSend() {
		error = '';
		try {
			await sendTaskToTodoist(
				filePath,
				taskText,
				selectedProjectId || undefined,
				selectedSectionId || undefined,
				Number(selectedPriority) || undefined,
				metadata,
			);
			open = false;
		} catch (err) {
			error = String(err);
		}
	}
</script>

<Popover.Root bind:open onOpenChange={handleOpen}>
	<Popover.Trigger class="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-all cursor-pointer shrink-0"
		title="Send to Todoist"
	>
		<Send class="size-3 text-muted-foreground" />
	</Popover.Trigger>

	<Popover.Content align="end" sideOffset={8} class="w-64 p-3">
		<div class="flex flex-col gap-3">
			<p class="text-xs font-medium text-foreground truncate">{metadata?.description ?? taskText}</p>

			{#if metadata && (metadata.dueDate || metadata.recurrence || metadata.tags.length > 0)}
				<div class="flex flex-wrap gap-1">
					{#if metadata.dueDate}
						<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-accent text-accent-foreground">
							📅 {metadata.dueDate}
						</span>
					{/if}
					{#if metadata.recurrence}
						<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-accent text-accent-foreground">
							🔁 {metadata.recurrence.text}
						</span>
					{/if}
					{#each metadata.tags as tag (tag)}
						<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-accent text-accent-foreground">
							#{tag}
						</span>
					{/each}
				</div>
			{/if}

			<!-- Project -->
			<div class="flex flex-col gap-1">
				<span class="text-xs text-muted-foreground">Project</span>
				{#if todoistStore.isLoadingProjects}
					<div class="flex items-center gap-1.5 h-8 px-3 text-xs text-muted-foreground">
						<Loader2 class="size-3 animate-spin" />
						Loading...
					</div>
				{:else}
					<Select.Root
						type="single"
						value={selectedProjectId}
						onValueChange={handleProjectChange}
					>
						<Select.Trigger size="sm" class="w-full">
							<span data-slot="select-value">{selectedProjectLabel()}</span>
						</Select.Trigger>
						<Select.Content>
							{#each todoistStore.projects as project (project.id)}
								<Select.Item value={project.id} label={project.name} />
							{/each}
						</Select.Content>
					</Select.Root>
				{/if}
			</div>

			<!-- Section -->
			{#if todoistStore.sections.length > 0 || todoistStore.isLoadingSections}
				<div class="flex flex-col gap-1">
					<span class="text-xs text-muted-foreground">Section</span>
					{#if todoistStore.isLoadingSections}
						<div class="flex items-center gap-1.5 h-8 px-3 text-xs text-muted-foreground">
							<Loader2 class="size-3 animate-spin" />
							Loading...
						</div>
					{:else}
						<Select.Root
							type="single"
							value={selectedSectionId}
							onValueChange={(v: string) => (selectedSectionId = v)}
						>
							<Select.Trigger size="sm" class="w-full">
								<span data-slot="select-value">{selectedSectionLabel()}</span>
							</Select.Trigger>
							<Select.Content>
								{#each todoistStore.sections as section (section.id)}
									<Select.Item value={section.id} label={section.name} />
								{/each}
							</Select.Content>
						</Select.Root>
					{/if}
				</div>
			{/if}

			<!-- Priority -->
			<div class="flex flex-col gap-1">
				<span class="text-xs text-muted-foreground">Priority</span>
				<Select.Root
					type="single"
					value={selectedPriority}
					onValueChange={(v: string) => (selectedPriority = v)}
				>
					<Select.Trigger size="sm" class="w-full">
						<span data-slot="select-value">{selectedPriorityLabel()}</span>
					</Select.Trigger>
					<Select.Content>
						{#each PRIORITIES as p (p.value)}
							<Select.Item value={p.value} label={p.label} />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			{#if error}
				<p class="text-xs text-destructive">{error}</p>
			{/if}

			<!-- Send button -->
			<Button
				size="sm"
				class="w-full"
				disabled={todoistStore.isSending}
				onclick={handleSend}
			>
				{#if todoistStore.isSending}
					<Loader2 class="size-3.5 animate-spin" />
					Sending...
				{:else}
					<Send class="size-3.5" />
					Send to Todoist
				{/if}
			</Button>
		</div>
	</Popover.Content>
</Popover.Root>
