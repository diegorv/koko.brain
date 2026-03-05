<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { fileHistoryStore } from './file-history.store.svelte';
	import { selectSnapshot, restoreSnapshot, closeFileHistory } from './file-history.service';
	import { formatSnapshotTime, formatSnapshotDateTime, formatSnapshotLabel, getSnapshotBackupPath, findBackupTimestamp } from './file-history.logic';
	import { revealInSystemExplorer } from '$lib/core/filesystem/fs.service';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import SnapshotList from './SnapshotList.svelte';
	import DiffViewer from './DiffViewer.svelte';
	import { ask } from '@tauri-apps/plugin-dialog';
	import type { SnapshotInfo } from './file-history.types';

	const fileName = $derived(
		fileHistoryStore.filePath
			? fileHistoryStore.filePath.split('/').pop() ?? ''
			: '',
	);

	const selectedSnapshotIndex = $derived(
		fileHistoryStore.selectedSnapshot
			? fileHistoryStore.snapshots.findIndex((s) => s.id === fileHistoryStore.selectedSnapshot!.id)
			: -1,
	);

	function handleOpenChange(open: boolean) {
		if (!open) closeFileHistory();
	}

	function handleRevealBackup(snapshot: SnapshotInfo) {
		const filePath = fileHistoryStore.filePath;
		const vaultPath = vaultStore.path;
		if (!filePath || !vaultPath) return;
		const backupTs = findBackupTimestamp(snapshot.timestamp, fileHistoryStore.backedUpTimestamps);
		if (backupTs === null) return;
		const backupPath = getSnapshotBackupPath(vaultPath, filePath, backupTs);
		revealInSystemExplorer(backupPath);
	}

	async function handleRestore() {
		const snapshot = fileHistoryStore.selectedSnapshot;
		if (!snapshot) return;

		const confirmed = await ask(
			`Restore this file to the version from ${formatSnapshotTime(snapshot.timestamp)}? Current content will be replaced.`,
			{ title: 'Restore Version', kind: 'warning' },
		);
		if (!confirmed) return;

		await restoreSnapshot(snapshot.id);
	}
</script>

<Dialog.Root open={fileHistoryStore.isOpen} onOpenChange={handleOpenChange}>
	<Dialog.Content
		class="flex h-[80vh] !max-w-5xl flex-col gap-0 overflow-hidden p-0"
		showCloseButton={false}
	>
		<Dialog.Title class="sr-only">File History: {fileName}</Dialog.Title>
		<Dialog.Description class="sr-only">
			View and restore previous versions of this file
		</Dialog.Description>

		<!-- Header -->
		<div class="flex items-center justify-between border-b border-border px-4 py-3">
			<h2 class="text-sm font-semibold">File History: {fileName}</h2>
		</div>

		<!-- Content: Two-pane layout -->
		<div class="flex flex-1 overflow-hidden">
			<!-- Left pane: Snapshot list -->
			<div class="w-60 shrink-0 border-r border-border">
				<SnapshotList
					snapshots={fileHistoryStore.snapshots}
					selectedId={fileHistoryStore.selectedSnapshot?.id ?? null}
					onselect={selectSnapshot}
					isLoading={fileHistoryStore.isLoading}
					backedUpTimestamps={fileHistoryStore.backedUpTimestamps}
					onrevealBackup={handleRevealBackup}
				/>
			</div>

			<!-- Right pane: Diff viewer + restore button -->
			<div class="flex flex-1 flex-col overflow-hidden">
				{#if fileHistoryStore.selectedSnapshot}
					<div class="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
						<span>{formatSnapshotDateTime(fileHistoryStore.selectedSnapshot.timestamp)} <span class="font-mono opacity-50">({fileHistoryStore.selectedSnapshot.timestamp})</span></span>
						<span>{formatSnapshotLabel(selectedSnapshotIndex)}</span>
					</div>
				{/if}
				<div class="flex-1 overflow-hidden">
					<DiffViewer
						diffLines={fileHistoryStore.diffLines}
						isLoading={fileHistoryStore.isLoadingDiff}
					/>
				</div>

				{#if fileHistoryStore.selectedSnapshot}
					<div class="flex justify-end border-t border-border px-4 py-3">
						<Button onclick={handleRestore}>Restore This Version</Button>
					</div>
				{/if}
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
