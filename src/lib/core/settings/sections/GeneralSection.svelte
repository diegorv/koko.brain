<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	let { onchange }: { onchange: () => void } = $props();
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Sidebar</h2>

	<SettingItem
		label="Right sidebar"
		description="Show the right sidebar (Properties, Backlinks, Tags)"
	>
		<Switch
			checked={settingsStore.layout.rightSidebarVisible}
			onCheckedChange={(v) => {
				settingsStore.updateLayout({ rightSidebarVisible: v });
				onchange();
			}}
		/>
	</SettingItem>

	<h3 class="mt-6 mb-2 text-sm font-medium text-muted-foreground">Sidebar sections</h3>

	<SettingItem label="Calendar" description="Show the calendar panel in the right sidebar">
		<Switch
			checked={settingsStore.layout.calendarVisible}
			onCheckedChange={(v) => {
				settingsStore.updateLayout({ calendarVisible: v });
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem label="Properties" description="Show the properties panel in the right sidebar">
		<Switch
			checked={settingsStore.layout.propertiesVisible}
			onCheckedChange={(v) => {
				settingsStore.updateLayout({ propertiesVisible: v });
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem label="Backlinks" description="Show the backlinks panel in the right sidebar">
		<Switch
			checked={settingsStore.layout.backlinksVisible}
			onCheckedChange={(v) => {
				settingsStore.updateLayout({ backlinksVisible: v });
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem label="Outgoing links" description="Show the outgoing links panel in the right sidebar">
		<Switch
			checked={settingsStore.layout.outgoingLinksVisible}
			onCheckedChange={(v) => {
				settingsStore.updateLayout({ outgoingLinksVisible: v });
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem label="Tags" description="Show the tags panel in the right sidebar">
		<Switch
			checked={settingsStore.layout.tagsVisible}
			onCheckedChange={(v) => {
				settingsStore.updateLayout({ tagsVisible: v });
				onchange();
			}}
		/>
	</SettingItem>

	<h3 class="mt-6 mb-2 text-sm font-medium text-muted-foreground">Other</h3>

	<SettingItem
		label="Folder notes"
		description="Clicking a folder also opens its matching folder note"
	>
		<Switch
			checked={settingsStore.folderNotes.enabled}
			onCheckedChange={(v) => {
				settingsStore.updateFolderNotes({ enabled: v });
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Terminal"
		description="Show the terminal sidebar panel"
	>
		<Switch
			checked={settingsStore.layout.terminalVisible}
			onCheckedChange={(v) => {
				settingsStore.updateLayout({ terminalVisible: v });
				onchange();
			}}
		/>
	</SettingItem>

</div>
