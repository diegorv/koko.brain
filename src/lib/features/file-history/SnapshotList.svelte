<script lang="ts">
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import { groupSnapshotsByDay, formatSnapshotTime, formatSnapshotDateTime, formatFileSize, hasBackupForTimestamp } from './file-history.logic';
	import type { SnapshotInfo } from './file-history.types';

	interface Props {
		snapshots: SnapshotInfo[];
		selectedId: number | null;
		onselect: (snapshot: SnapshotInfo) => void;
		isLoading: boolean;
		backedUpTimestamps: Set<number>;
		onrevealBackup: (snapshot: SnapshotInfo) => void;
	}

	let { snapshots, selectedId, onselect, isLoading, backedUpTimestamps, onrevealBackup }: Props = $props();

	const groups = $derived(groupSnapshotsByDay(snapshots));
</script>

<ScrollArea class="h-full">
	{#if isLoading}
		<div class="flex items-center justify-center py-12 text-sm text-muted-foreground">
			Loading history...
		</div>
	{:else if snapshots.length === 0}
		<div class="flex items-center justify-center py-12 text-sm text-muted-foreground">
			No history available
		</div>
	{:else}
		<div class="p-2">
			{#each groups as group}
				<div class="mb-3">
					<h3 class="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						{group.label}
					</h3>
					{#each group.snapshots as snapshot}
						<button
							class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent {selectedId === snapshot.id ? 'bg-accent' : ''}"
							onclick={() => onselect(snapshot)}
						>
							<div class="flex flex-col">
								<span class="text-foreground">{formatSnapshotTime(snapshot.timestamp)}</span>
								<span class="text-xs text-muted-foreground">{formatSnapshotDateTime(snapshot.timestamp)}</span>
							</div>
							<span class="flex items-center gap-2">
								{#if hasBackupForTimestamp(snapshot.timestamp, backedUpTimestamps)}
									<!-- svelte-ignore node_invalid_placement_ssr -->
									<span
										role="button"
										tabindex="0"
										class="text-muted-foreground transition-colors hover:text-foreground"
										title="Show backup file in Finder"
										onclick={(e) => { e.stopPropagation(); onrevealBackup(snapshot); }}
										onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onrevealBackup(snapshot); } }}
									>
										<HardDriveIcon class="size-3.5" />
									</span>
								{/if}
								<span class="text-xs text-muted-foreground">{formatFileSize(snapshot.size)}</span>
							</span>
						</button>
					{/each}
				</div>
			{/each}
		</div>
	{/if}
</ScrollArea>
