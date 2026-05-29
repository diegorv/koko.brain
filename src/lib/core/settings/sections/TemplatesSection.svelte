<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	let { onchange }: { onchange: () => void } = $props();
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Templates</h2>

	<SettingItem
		label="Templates folder"
		description="Folder name relative to vault root"
	>
		<Input
			value={settingsStore.templates.folder}
			oninput={(e) => {
				settingsStore.updateTemplates({ folder: (e.currentTarget as HTMLInputElement).value });
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem
		label="System folder"
		description="Vault-relative folder whose files are hidden from the type sidebar (note list, nav counts, inbox dock badge). Leave empty to disable."
	>
		<Input
			value={settingsStore.templates.systemFolder}
			oninput={(e) => {
				settingsStore.updateTemplates({ systemFolder: (e.currentTarget as HTMLInputElement).value });
				onchange();
			}}
		/>
	</SettingItem>
</div>
