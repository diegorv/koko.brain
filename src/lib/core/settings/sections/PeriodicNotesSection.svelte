<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	let { onchange }: { onchange: () => void } = $props();

	function inputValue(e: Event): string {
		return (e.currentTarget as HTMLInputElement).value;
	}

	/** Helper to update a nested periodic note type */
	function updatePeriod(period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly', field: string, value: string | boolean) {
		settingsStore.updatePeriodicNotes({
			[period]: { [field]: value },
		});
		onchange();
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Periodic Notes</h2>

	<SettingItem
		label="Base folder"
		description="Folder where periodic notes are created"
	>
		<Input
			value={settingsStore.periodicNotes.folder}
			oninput={(e) => {
				settingsStore.updatePeriodicNotes({ folder: inputValue(e) });
				onchange();
			}}
		/>
	</SettingItem>

	<!-- Daily -->
	<h3 class="mb-2 text-base font-bold text-settings-text">Daily</h3>

	<SettingItem label="Format" description="dayjs format string for the note path">
		<Input
		value={settingsStore.periodicNotes.daily.format}
			oninput={(e) => updatePeriod('daily', 'format', inputValue(e))}
		/>
	</SettingItem>

	<SettingItem label="Template path" description="Path to the template file">
		<Input
		value={settingsStore.periodicNotes.daily.templatePath ?? ''}
			oninput={(e) => updatePeriod('daily', 'templatePath', inputValue(e))}
		/>
	</SettingItem>

	<SettingItem label="Auto-open" description="Open today's daily note on vault load">
		<Switch
			checked={settingsStore.periodicNotes.daily.autoOpen ?? false}
			onCheckedChange={(v) => updatePeriod('daily', 'autoOpen', v)}
		/>
	</SettingItem>

	<SettingItem label="Auto-pin" description="Pin the daily note tab (requires auto-open)">
		<Switch
			checked={settingsStore.periodicNotes.daily.autoPin ?? false}
			onCheckedChange={(v) => updatePeriod('daily', 'autoPin', v)}
		/>
	</SettingItem>

	<!-- Weekly -->
	<h3 class="mb-2 text-base font-bold text-settings-text">Weekly</h3>

	<SettingItem label="Format" description="dayjs format string for the note path">
		<Input
		value={settingsStore.periodicNotes.weekly.format}
			oninput={(e) => updatePeriod('weekly', 'format', inputValue(e))}
		/>
	</SettingItem>

	<SettingItem label="Template path" description="Path to the template file">
		<Input
		value={settingsStore.periodicNotes.weekly.templatePath ?? ''}
			oninput={(e) => updatePeriod('weekly', 'templatePath', inputValue(e))}
		/>
	</SettingItem>

	<!-- Monthly -->
	<h3 class="mb-2 text-base font-bold text-settings-text">Monthly</h3>

	<SettingItem label="Format" description="dayjs format string for the note path">
		<Input
		value={settingsStore.periodicNotes.monthly.format}
			oninput={(e) => updatePeriod('monthly', 'format', inputValue(e))}
		/>
	</SettingItem>

	<SettingItem label="Template path" description="Path to the template file">
		<Input
		value={settingsStore.periodicNotes.monthly.templatePath ?? ''}
			oninput={(e) => updatePeriod('monthly', 'templatePath', inputValue(e))}
		/>
	</SettingItem>

	<!-- Quarterly -->
	<h3 class="mb-2 text-base font-bold text-settings-text">Quarterly</h3>

	<SettingItem label="Format" description="dayjs format string for the note path">
		<Input
		value={settingsStore.periodicNotes.quarterly.format}
			oninput={(e) => updatePeriod('quarterly', 'format', inputValue(e))}
		/>
	</SettingItem>

	<SettingItem label="Template path" description="Path to the template file">
		<Input
		value={settingsStore.periodicNotes.quarterly.templatePath ?? ''}
			oninput={(e) => updatePeriod('quarterly', 'templatePath', inputValue(e))}
		/>
	</SettingItem>

	<!-- Yearly -->
	<h3 class="mb-2 text-base font-bold text-settings-text">Yearly</h3>

	<SettingItem label="Format" description="dayjs format string for the note path">
		<Input
		value={settingsStore.periodicNotes.yearly.format}
			oninput={(e) => updatePeriod('yearly', 'format', inputValue(e))}
		/>
	</SettingItem>

	<SettingItem label="Template path" description="Path to the template file">
		<Input
		value={settingsStore.periodicNotes.yearly.templatePath ?? ''}
			oninput={(e) => updatePeriod('yearly', 'templatePath', inputValue(e))}
		/>
	</SettingItem>
</div>
