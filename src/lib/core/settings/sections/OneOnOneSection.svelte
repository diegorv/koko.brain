<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	let { onchange }: { onchange: () => void } = $props();

	function inputValue(e: Event): string {
		return (e.currentTarget as HTMLInputElement).value;
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">1:1 Notes</h2>

	<SettingItem
		label="Work people folder"
		description="Folder relative to vault root where work contacts are stored (listed first)"
	>
		<Input
			value={settingsStore.oneOnOne.workPeopleFolder}
			oninput={(e) => {
				settingsStore.updateOneOnOne({ workPeopleFolder: inputValue(e) });
				onchange();
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
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Folder format"
		description="dayjs format for the subfolder path (e.g. YYYY/MM-MMM)"
	>
		<Input
			value={settingsStore.oneOnOne.folderFormat}
			oninput={(e) => {
				settingsStore.updateOneOnOne({ folderFormat: inputValue(e) });
				onchange();
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
				onchange();
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
				onchange();
			}}
		/>
	</SettingItem>
</div>
