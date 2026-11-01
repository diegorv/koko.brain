<script lang="ts">
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';
	import type { LayoutShell } from '../settings.types';
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Sidebar</h2>

	<SettingItem
		label="Layout"
		description="Classic keeps the Files, Types and Calendar sidebar; Rail shows an icon rail and one note list"
	>
		<select
			aria-label="Layout"
			class="h-9 w-28 rounded-md border border-input bg-input-bg px-2 text-sm text-settings-text"
			value={settingsStore.layout.shell}
			onchange={(e) => {
				settingsStore.updateLayout({ shell: (e.currentTarget as HTMLSelectElement).value as LayoutShell });
			}}
		>
			<option value="classic">Classic</option>
			<option value="rail">Rail</option>
		</select>
	</SettingItem>

	<SettingItem
		label="Right sidebar"
		description="Show the right sidebar (Properties, Backlinks, Outgoing links, Table of Contents)"
	>
		<Switch
			checked={settingsStore.layout.rightSidebarVisible}
			onCheckedChange={(v) => {
				settingsStore.updateLayout({ rightSidebarVisible: v });
			}}
		/>
	</SettingItem>

	<h3 class="mt-6 mb-2 text-sm font-medium text-muted-foreground">Sidebar sections</h3>

	<SettingItem label="Properties" description="Show the properties panel in the right sidebar">
		<Switch
			checked={settingsStore.layout.propertiesVisible}
			onCheckedChange={(v) => {
				settingsStore.updateLayout({ propertiesVisible: v });
			}}
		/>
	</SettingItem>

	<SettingItem label="Backlinks" description="Show the backlinks panel in the right sidebar">
		<Switch
			checked={settingsStore.layout.backlinksVisible}
			onCheckedChange={(v) => {
				settingsStore.updateLayout({ backlinksVisible: v });
			}}
		/>
	</SettingItem>

	<SettingItem label="Outgoing links" description="Show the outgoing links panel in the right sidebar">
		<Switch
			checked={settingsStore.layout.outgoingLinksVisible}
			onCheckedChange={(v) => {
				settingsStore.updateLayout({ outgoingLinksVisible: v });
			}}
		/>
	</SettingItem>

	<SettingItem label="Table of Contents" description="Show the document outline panel in the right sidebar">
		<Switch
			checked={settingsStore.layout.tableOfContentsVisible}
			onCheckedChange={(v) => {
				settingsStore.updateLayout({ tableOfContentsVisible: v });
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
			}}
		/>
	</SettingItem>

</div>
