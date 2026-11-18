<script lang="ts">
	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { formatNow } from '#lib/utils/date.js';
	import { isTemplateMissing } from '../settings.logic';
	import { settingsStore } from '../settings.store.svelte';
	import type { PeriodType } from '../settings.types';
	import SettingItem from './SettingItem.svelte';

	function inputValue(e: Event): string {
		return (e.currentTarget as HTMLInputElement).value;
	}

	/** Helper to update a nested periodic note type */
	function updatePeriod(period: PeriodType, field: string, value: string | boolean) {
		settingsStore.updatePeriodicNotes({
			[period]: { [field]: value },
		});
	}

	/**
	 * The vault-relative file a create for today opens: the note service formats a plain
	 * current date with the same plugins `formatNow` uses, and joins it as here
	 * (`buildPeriodicNotePath`). An empty format gives the default timestamp, as a create does.
	 */
	function todayPath(format: string): string {
		const fileName = `${formatNow(format)}.md`;
		const { folder } = settingsStore.periodicNotes;
		return folder ? `${folder}/${fileName}` : fileName;
	}

	function isMissing(period: PeriodType): boolean {
		return isTemplateMissing(fsStore.fileTree, vaultStore.path, settingsStore.periodicNotes[period].templatePath);
	}
</script>

{#snippet todayExample(period: PeriodType)}
	<p id="periodic-example-{period}" class="mt-1 text-meta text-muted-foreground" data-periodic-example={period}>
		Today: {todayPath(settingsStore.periodicNotes[period].format)}
	</p>
{/snippet}

{#snippet templateMissing(period: PeriodType)}
	{#if isMissing(period)}
		<p id="periodic-template-missing-{period}" class="mt-1 text-meta text-muted-foreground" data-template-missing={period}>File not found</p>
	{/if}
{/snippet}

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

	<SettingItem label="Format" description="Date pattern for the note path and name" layout="stacked">
		<Input
		value={settingsStore.periodicNotes.daily.format}
			aria-describedby="periodic-example-daily"
			oninput={(e) => updatePeriod('daily', 'format', inputValue(e))}
		/>
		{@render todayExample('daily')}
	</SettingItem>

	<SettingItem label="Template path" description="Path to the template file" layout="stacked">
		<Input
		value={settingsStore.periodicNotes.daily.templatePath ?? ''}
			aria-describedby={isMissing('daily') ? 'periodic-template-missing-daily' : undefined}
			oninput={(e) => updatePeriod('daily', 'templatePath', inputValue(e))}
		/>
		{@render templateMissing('daily')}
	</SettingItem>

	<SettingItem label="Auto-open" description="Open today's daily note on vault load">
		<Switch
			checked={settingsStore.periodicNotes.daily.autoOpen ?? false}
			onCheckedChange={(v) => updatePeriod('daily', 'autoOpen', v)}
		/>
	</SettingItem>

	<SettingItem label="Auto-pin" description="Pin the daily note tab (requires auto-open)">
		<!-- Disabled only while it is off too, so an Auto-pin stored on can always be turned off. -->
		<Switch
			aria-label="Auto-pin"
			disabled={!(settingsStore.periodicNotes.daily.autoPin ?? false) && !(settingsStore.periodicNotes.daily.autoOpen ?? false)}
			checked={settingsStore.periodicNotes.daily.autoPin ?? false}
			onCheckedChange={(v) => updatePeriod('daily', 'autoPin', v)}
		/>
	</SettingItem>

	<!-- Weekly -->
	<h3 class="section-label mt-6 mb-2">Weekly</h3>

	<SettingItem label="Format" description="Date pattern for the note path and name" layout="stacked">
		<Input
		value={settingsStore.periodicNotes.weekly.format}
			aria-describedby="periodic-example-weekly"
			oninput={(e) => updatePeriod('weekly', 'format', inputValue(e))}
		/>
		{@render todayExample('weekly')}
	</SettingItem>

	<SettingItem label="Template path" description="Path to the template file" layout="stacked">
		<Input
		value={settingsStore.periodicNotes.weekly.templatePath ?? ''}
			aria-describedby={isMissing('weekly') ? 'periodic-template-missing-weekly' : undefined}
			oninput={(e) => updatePeriod('weekly', 'templatePath', inputValue(e))}
		/>
		{@render templateMissing('weekly')}
	</SettingItem>

	<!-- Monthly -->
	<h3 class="section-label mt-6 mb-2">Monthly</h3>

	<SettingItem label="Format" description="Date pattern for the note path and name" layout="stacked">
		<Input
		value={settingsStore.periodicNotes.monthly.format}
			aria-describedby="periodic-example-monthly"
			oninput={(e) => updatePeriod('monthly', 'format', inputValue(e))}
		/>
		{@render todayExample('monthly')}
	</SettingItem>

	<SettingItem label="Template path" description="Path to the template file" layout="stacked">
		<Input
		value={settingsStore.periodicNotes.monthly.templatePath ?? ''}
			aria-describedby={isMissing('monthly') ? 'periodic-template-missing-monthly' : undefined}
			oninput={(e) => updatePeriod('monthly', 'templatePath', inputValue(e))}
		/>
		{@render templateMissing('monthly')}
	</SettingItem>

	<!-- Quarterly -->
	<h3 class="section-label mt-6 mb-2">Quarterly</h3>

	<SettingItem label="Format" description="Date pattern for the note path and name" layout="stacked">
		<Input
		value={settingsStore.periodicNotes.quarterly.format}
			aria-describedby="periodic-example-quarterly"
			oninput={(e) => updatePeriod('quarterly', 'format', inputValue(e))}
		/>
		{@render todayExample('quarterly')}
	</SettingItem>

	<SettingItem label="Template path" description="Path to the template file" layout="stacked">
		<Input
		value={settingsStore.periodicNotes.quarterly.templatePath ?? ''}
			aria-describedby={isMissing('quarterly') ? 'periodic-template-missing-quarterly' : undefined}
			oninput={(e) => updatePeriod('quarterly', 'templatePath', inputValue(e))}
		/>
		{@render templateMissing('quarterly')}
	</SettingItem>

	<!-- Yearly -->
	<h3 class="section-label mt-6 mb-2">Yearly</h3>

	<SettingItem label="Format" description="Date pattern for the note path and name" layout="stacked">
		<Input
		value={settingsStore.periodicNotes.yearly.format}
			aria-describedby="periodic-example-yearly"
			oninput={(e) => updatePeriod('yearly', 'format', inputValue(e))}
		/>
		{@render todayExample('yearly')}
	</SettingItem>

	<SettingItem label="Template path" description="Path to the template file" layout="stacked">
		<Input
		value={settingsStore.periodicNotes.yearly.templatePath ?? ''}
			aria-describedby={isMissing('yearly') ? 'periodic-template-missing-yearly' : undefined}
			oninput={(e) => updatePeriod('yearly', 'templatePath', inputValue(e))}
		/>
		{@render templateMissing('yearly')}
	</SettingItem>
</div>
