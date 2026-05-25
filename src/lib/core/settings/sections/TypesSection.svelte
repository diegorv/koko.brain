<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	let { onchange }: { onchange: () => void } = $props();
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
				onchange();
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
				onchange();
			}}
		/>
	</SettingItem>
</div>
