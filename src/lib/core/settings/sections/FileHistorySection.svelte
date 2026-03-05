<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	let { onchange }: { onchange: () => void } = $props();

	function clampRetentionDays(value: number): number {
		return Math.max(1, Math.min(365, Math.round(value)));
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">File History</h2>

	<SettingItem
		label="Automatic snapshots"
		description="Save a snapshot every time a file is saved"
	>
		<Switch
			checked={settingsStore.history.enabled}
			onCheckedChange={(enabled) => {
				settingsStore.updateHistory({ enabled });
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Retention days"
		description="Days to keep all snapshots before thinning (1–365)"
	>
		<Input
			type="number"
			class="w-24"
			min={1}
			max={365}
			value={String(settingsStore.history.retentionDays)}
			oninput={(e) => {
				const val = clampRetentionDays(Number((e.currentTarget as HTMLInputElement).value));
				settingsStore.updateHistory({ retentionDays: val });
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Snapshot backup"
		description="Also save snapshots as .md files in .kokobrain/snapshots-backup/"
	>
		<Switch
			checked={settingsStore.history.snapshotBackupEnabled}
			onCheckedChange={(snapshotBackupEnabled) => {
				settingsStore.updateHistory({ snapshotBackupEnabled });
				onchange();
			}}
		/>
	</SettingItem>
</div>
