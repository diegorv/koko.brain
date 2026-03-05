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
	<h2 class="mb-4 text-lg font-semibold">Quick Note</h2>

	<SettingItem
		label="Folder format"
		description="dayjs format for the subfolder path (e.g. YYYY/MM-MMM)"
	>
		<Input
			value={settingsStore.quickNote.folderFormat}
			oninput={(e) => {
				settingsStore.updateQuickNote({ folderFormat: inputValue(e) });
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Filename format"
		description="dayjs format for the filename (use [] for literal text, e.g. [capture-note-]YYYY-MM-DD)"
	>
		<Input
			value={settingsStore.quickNote.filenameFormat}
			oninput={(e) => {
				settingsStore.updateQuickNote({ filenameFormat: inputValue(e) });
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Template path"
		description="Path to the template file relative to vault root"
	>
		<Input
			value={settingsStore.quickNote.templatePath ?? ''}
			oninput={(e) => {
				settingsStore.updateQuickNote({ templatePath: inputValue(e) || undefined });
				onchange();
			}}
		/>
	</SettingItem>
</div>
