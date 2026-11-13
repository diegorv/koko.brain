<script lang="ts">
	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	function inputValue(e: Event): string {
		return (e.currentTarget as HTMLInputElement).value;
	}

	/** Helper to update a nested periodic note type */
	function updatePeriod(period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly', field: string, value: string | boolean) {
		settingsStore.updatePeriodicNotes({
			[period]: { [field]: value },
		});
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Periodic Notes</h2>

	<SettingItem
		label="Notes folder"
		description="Folder where periodic notes are created. Quick Capture notes (Cmd+N included) and a plain + New here note go in it too."
	>
		<Input
			value={settingsStore.periodicNotes.folder}
			oninput={(e) => {
				settingsStore.updatePeriodicNotes({ folder: inputValue(e) });
			}}
		/>
	</SettingItem>

	<!-- Daily -->
	<h3 class="section-label mt-6 mb-2">Daily</h3>

	<SettingItem label="Format" description="Date pattern for the note path and name">
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
	<h3 class="section-label mt-6 mb-2">Weekly</h3>

	<SettingItem label="Format" description="Date pattern for the note path and name">
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
	<h3 class="section-label mt-6 mb-2">Monthly</h3>

	<SettingItem label="Format" description="Date pattern for the note path and name">
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
	<h3 class="section-label mt-6 mb-2">Quarterly</h3>

	<SettingItem label="Format" description="Date pattern for the note path and name">
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
	<h3 class="section-label mt-6 mb-2">Yearly</h3>

	<SettingItem label="Format" description="Date pattern for the note path and name">
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
