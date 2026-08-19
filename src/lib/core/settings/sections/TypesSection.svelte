<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Types & Lifecycle</h2>

	<SettingItem
		label="Explicit organization"
		description="New notes start unorganized and appear in the Inbox. Disable to treat all notes as organized by default."
	>
		<Switch
			checked={settingsStore.explicitOrganization}
			onCheckedChange={(v) => {
				settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: v });
			}}
		/>
	</SettingItem>

	<h3 class="mt-6 mb-2 text-sm font-medium text-muted-foreground">Type sidebar</h3>

	<SettingItem
		label="Show untyped notes"
		description="Show notes without a type in an 'Untyped' section at the bottom of the type sidebar."
	>
		<Switch
			checked={settingsStore.showUntypedNotes}
			onCheckedChange={(v) => {
				settingsStore.setSettings({ ...settingsStore.settings, showUntypedNotes: v });
			}}
		/>
	</SettingItem>

	<h3 class="mt-6 mb-2 text-sm font-medium text-muted-foreground">New note location</h3>

	<SettingItem
		label="Base folder"
		description="Vault-relative folder prepended to every type's own folder. New typed notes go to base folder / type folder / note. Empty = vault root."
	>
		<Input
			value={settingsStore.typesBaseFolder}
			oninput={(e) => {
				settingsStore.setSettings({
					...settingsStore.settings,
					typesBaseFolder: (e.currentTarget as HTMLInputElement).value,
				});
			}}
		/>
	</SettingItem>

	<p class="text-muted-foreground text-sm">
		Each type also chooses its own subfolder: open a type definition and add "_folder: &lt;path&gt;"
		to its frontmatter (e.g. "_folder: Books"). Leave both empty to create notes in the vault root.
	</p>
</div>
