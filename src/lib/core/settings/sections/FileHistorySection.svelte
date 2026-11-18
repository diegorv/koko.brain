<script lang="ts">
	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { clamp } from '#lib/utils/clamp.js';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	function clampRetentionDays(value: number): number {
		return clamp(Math.round(value), 1, 365);
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
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Retention days"
		description="Days to keep every snapshot. For 30 more days one per day is kept per file, then they are deleted (1–365)"
	>
		<Input
			type="number"
			class="w-24"
			min={1}
			max={365}
			value={String(settingsStore.history.retentionDays)}
			onchange={(e) => {
				// Commit only, never on input: the value feeds `cleanup_history` at vault
				// open, which deletes snapshots, so a half-typed value must not be stored.
				const input = e.currentTarget as HTMLInputElement;
				const n = Number(input.value);
				if (input.value.trim() !== '' && Number.isFinite(n)) {
					settingsStore.updateHistory({ retentionDays: clampRetentionDays(n) });
				}
				// Svelte skips the DOM write when the bound value did not change.
				input.value = String(settingsStore.history.retentionDays);
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
			}}
		/>
	</SettingItem>
</div>
