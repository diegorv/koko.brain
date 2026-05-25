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
</div>
