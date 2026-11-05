<script lang="ts">
	import { Input } from '#lib/components/ui/input/index.js';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	function inputValue(e: Event): string {
		return (e.currentTarget as HTMLInputElement).value;
	}

	/** Writes the typed due threshold as whole, non-negative days; an empty or unparseable field changes nothing. */
	function updateDueAfterDays(e: Event) {
		const raw = inputValue(e);
		const days = Number(raw);
		if (raw.trim() === '' || !Number.isFinite(days)) return;
		settingsStore.updateOneOnOne({ dueAfterDays: Math.max(0, Math.floor(days)) });
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">1:1 Notes</h2>

	<h3 class="section-label mb-2">People</h3>

	<SettingItem
		label="Work people folder"
		description="Folder relative to vault root where work contacts are stored (listed first)"
	>
		<Input
			value={settingsStore.oneOnOne.workPeopleFolder}
			oninput={(e) => {
				settingsStore.updateOneOnOne({ workPeopleFolder: inputValue(e) });
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Personal people folder"
		description="Folder relative to vault root where personal contacts are stored"
	>
		<Input
			value={settingsStore.oneOnOne.peopleFolder}
			oninput={(e) => {
				settingsStore.updateOneOnOne({ peopleFolder: inputValue(e) });
			}}
		/>
	</SettingItem>

	<h3 class="section-label mt-6 mb-2">New notes</h3>

	<SettingItem
		label="Folder format"
		description="dayjs format for the subfolder path (e.g. YYYY/MM-MMM)"
	>
		<Input
			value={settingsStore.oneOnOne.folderFormat}
			oninput={(e) => {
				settingsStore.updateOneOnOne({ folderFormat: inputValue(e) });
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Filename format"
		description={"dayjs format with {person} placeholder (e.g. [-1on1-]{person}[-]DD-MM-YYYY)"}
	>
		<Input
			value={settingsStore.oneOnOne.filenameFormat}
			oninput={(e) => {
				settingsStore.updateOneOnOne({ filenameFormat: inputValue(e) });
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Template path"
		description="Path to the template file relative to vault root"
	>
		<Input
			value={settingsStore.oneOnOne.templatePath ?? ''}
			oninput={(e) => {
				settingsStore.updateOneOnOne({ templatePath: inputValue(e) || undefined });
			}}
		/>
	</SettingItem>

	<h3 class="section-label mt-6 mb-2">Reminders</h3>

	<SettingItem
		label="1:1 due after (days)"
		description="Today's My people flags a work person with no 1:1 for more than this many days"
	>
		<Input
			type="number"
			class="w-24"
			min={0}
			value={String(settingsStore.oneOnOne.dueAfterDays)}
			oninput={updateDueAfterDays}
			data-one-on-one-due-after
		/>
	</SettingItem>
</div>
