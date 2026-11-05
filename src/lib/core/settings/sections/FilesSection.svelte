<script lang="ts">
	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Files & Folders</h2>

	<SettingItem
		label="Templates folder"
		description="Folder name relative to vault root"
	>
		<Input
			value={settingsStore.templates.folder}
			oninput={(e) => {
				settingsStore.updateTemplates({ folder: (e.currentTarget as HTMLInputElement).value });
			}}
		/>
	</SettingItem>

	<SettingItem
		label="System folder"
		description="Vault-relative folder left out of the rail's note lists, the Types navigator counts, the calendars, the inbox badges and QueryJS kb.pages(). The Files navigator still shows it. Leave empty to disable."
	>
		<Input
			value={settingsStore.templates.systemFolder}
			oninput={(e) => {
				settingsStore.updateTemplates({ systemFolder: (e.currentTarget as HTMLInputElement).value });
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Folder notes"
		description="Clicking a folder also opens its matching folder note"
	>
		<Switch
			checked={settingsStore.folderNotes.enabled}
			onCheckedChange={(v) => {
				settingsStore.updateFolderNotes({ enabled: v });
			}}
		/>
	</SettingItem>
</div>
