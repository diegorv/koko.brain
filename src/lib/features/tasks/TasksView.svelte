<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Circle, CircleCheckBig, Eye, EyeOff, Hash, Cloud, CloudCheck, RefreshCcw, Loader2 } from 'lucide-svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { tasksStore } from './tasks.store.svelte';
	import { todoistStore } from './todoist.store.svelte';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { toggleTask, updateSectionTagFilter } from './tasks.service';
	import { initTodoist, syncTodoistTasks } from './todoist.service';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { filterByDate, filterCompleted, computeTaskStats } from './tasks.logic';
	import TodoistPopover from './TodoistPopover.svelte';
	import type { TaskDateFilter } from './tasks.types';

	const DATE_FILTERS: { label: string; value: TaskDateFilter }[] = [
		{ label: 'All time', value: 'all' },
		{ label: 'Last 7 days', value: 'last7days' },
		{ label: 'Last 30 days', value: 'last30days' },
	];

	let sectionTagInput = $state(tasksStore.sectionTag);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	function handleSectionTagChange(value: string) {
		sectionTagInput = value;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			updateSectionTagFilter(value);
		}, 400);
	}

	onDestroy(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
	});

	let filteredGroups = $derived.by(() => {
		let groups = filterByDate(tasksStore.fileTaskGroups, tasksStore.dateFilter);
		if (tasksStore.hideCompleted) {
			groups = filterCompleted(groups);
		}
		return groups;
	});

	let stats = $derived(computeTaskStats(filteredGroups));

	function handleFileClick(filePath: string) {
		openFileInEditor(filePath);
	}

	async function handleToggle(filePath: string, lineNumber: number) {
		await toggleTask(filePath, lineNumber);
	}

	let hasTodoistToken = $derived(settingsStore.todoist.apiToken.length > 0);

	onMount(() => {
		initTodoist();
	});

	async function handleSync() {
		try {
			await syncTodoistTasks();
		} catch (err) {
			console.error('Failed to sync Todoist tasks:', err);
		}
	}

	function formatDate(timestamp: number): string {
		if (!timestamp) return '';
		return new Date(timestamp).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	}
</script>

<div class="flex h-full flex-col bg-card">
	<!-- Toolbar -->
	<div class="flex items-center gap-2 px-4 py-2 shrink-0 border-b border-divider">
		<div class="flex items-center gap-1">
			{#each DATE_FILTERS as filter (filter.value)}
				<button
					class="px-2 py-0.5 text-xs rounded-md transition-colors cursor-pointer
						{tasksStore.dateFilter === filter.value
							? 'bg-primary/20 text-primary'
							: 'text-muted-foreground hover:bg-accent'}"
					onclick={() => tasksStore.setDateFilter(filter.value)}
				>
					{filter.label}
				</button>
			{/each}
		</div>

		<div class="flex items-center gap-1">
			<button
				class="p-1 rounded-md transition-colors cursor-pointer
					{tasksStore.hideCompleted
						? 'bg-primary/20 text-primary'
						: 'text-muted-foreground hover:bg-accent'}"
				onclick={() => tasksStore.setHideCompleted(!tasksStore.hideCompleted)}
				title="{tasksStore.hideCompleted ? 'Show' : 'Hide'} completed tasks"
			>
				{#if tasksStore.hideCompleted}
					<EyeOff class="size-3.5" />
				{:else}
					<Eye class="size-3.5" />
				{/if}
			</button>
		</div>

		{#if hasTodoistToken}
			<div class="flex items-center gap-1">
				<button
					class="p-1 rounded-md transition-colors cursor-pointer text-muted-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
					onclick={handleSync}
					disabled={todoistStore.isSyncing}
					title="Sync task status from Todoist"
				>
					{#if todoistStore.isSyncing}
						<Loader2 class="size-3.5 animate-spin" />
					{:else}
						<RefreshCcw class="size-3.5" />
					{/if}
				</button>
			</div>
		{/if}

		<div class="flex items-center gap-1 relative">
			<Hash class="size-3 text-muted-foreground absolute left-1.5 pointer-events-none" />
			<input
				type="text"
				value={sectionTagInput}
				oninput={(e) => handleSectionTagChange(e.currentTarget.value)}
				placeholder="section tag"
				class="h-6 w-28 pl-5 pr-2 text-xs rounded-md bg-background/50 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
			/>
		</div>
	</div>

	<!-- Content -->
	<ScrollArea class="flex-1">
		<div class="p-4">
			{#if tasksStore.isLoading}
				<p class="text-sm text-muted-foreground text-center py-8">Indexing tasks...</p>
			{:else if filteredGroups.length === 0}
				<p class="text-sm text-muted-foreground text-center py-8">No tasks found</p>
			{:else}
				<p class="text-xs text-muted-foreground mb-4">
					{stats.total} {stats.total === 1 ? 'task' : 'tasks'} in {stats.fileCount} {stats.fileCount === 1 ? 'file' : 'files'}
				</p>

				<div class="space-y-6">
					{#each filteredGroups as group (group.filePath)}
						<div>
							<!-- File header -->
							<div class="flex items-baseline gap-2 mb-2">
								<button
									class="text-sm font-medium text-purple-400 hover:underline cursor-pointer"
									onclick={() => handleFileClick(group.filePath)}
								>
									{group.fileName}
								</button>
								<span class="text-xs text-muted-foreground">
									({formatDate(group.modifiedAt)})
								</span>
								<span class="text-xs text-muted-foreground">
									({group.tasks.length})
								</span>
							</div>

							<!-- Task list -->
							<div class="space-y-1">
								{#each group.tasks as task (task.lineNumber)}
									<div
										class="flex items-start gap-2 w-full group rounded px-1 py-0.5 hover:bg-accent/50 transition-colors"
										style="padding-left: {task.indent * 1.25 + 0.25}rem"
									>
										<button
											class="flex items-start gap-2 flex-1 text-left cursor-pointer"
											onclick={() => handleToggle(group.filePath, task.lineNumber)}
										>
											{#if task.checked}
												<CircleCheckBig class="size-4 shrink-0 mt-0.5 text-primary/60" />
												<span class="text-sm text-muted-foreground line-through">{task.text}</span>
											{:else}
												<Circle class="size-4 shrink-0 mt-0.5 text-muted-foreground group-hover:text-primary/80 transition-colors" />
												<span class="text-sm text-foreground">{task.text}</span>
											{/if}
										</button>
										{#if hasTodoistToken}
											{#if todoistStore.isSent(group.filePath, task.text)}
												{@const completed = todoistStore.isCompletedInTodoist(group.filePath, task.text)}
												{@const url = todoistStore.getTodoistUrl(group.filePath, task.text)}
												{#if completed}
													<a
														href={url}
														target="_blank"
														rel="noopener noreferrer"
														title="Completed in Todoist"
													>
														<CloudCheck class="size-3 shrink-0 mt-1 text-green-400" />
													</a>
												{:else}
													<a
														href={url}
														target="_blank"
														rel="noopener noreferrer"
														title="Open in Todoist"
													>
														<Cloud class="size-3 shrink-0 mt-1 text-muted-foreground" />
													</a>
												{/if}
											{:else}
												<TodoistPopover taskText={task.text} filePath={group.filePath} metadata={task.metadata} />
											{/if}
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</ScrollArea>
</div>
