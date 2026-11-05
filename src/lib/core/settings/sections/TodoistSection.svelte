<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { Input } from '#lib/components/ui/input/index.js';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	function handleTokenChange(value: string) {
		settingsStore.updateTodoist({ apiToken: value });
	}

	function handleDefaultLabelChange(value: string) {
		settingsStore.updateTodoist({ defaultLabel: value });
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Todoist</h2>

	<SettingItem
		label="API Token"
		description="Personal API token from Todoist Settings → Integrations → Developer"
		layout="stacked"
	>
		<Input
			type="password"
			value={settingsStore.todoist.apiToken}
			oninput={(e) => handleTokenChange((e.currentTarget as HTMLInputElement).value)}
			placeholder="Paste your token here"
		/>
	</SettingItem>

	<p class="px-4 text-meta text-muted-foreground">
		Get your token at
		<button
			class="text-primary hover:underline cursor-pointer"
			onclick={() => openUrl('https://todoist.com/prefs/integrations')}
		>
			todoist.com/prefs/integrations
		</button>
	</p>

	<SettingItem
		label="Default label"
		description="Added to every task created from the app. Todoist creates the label automatically if it doesn't exist. Leave empty for none."
	>
		<Input
			type="text"
			value={settingsStore.todoist.defaultLabel}
			oninput={(e) => handleDefaultLabelChange((e.currentTarget as HTMLInputElement).value)}
			placeholder="e.g. inbox"
		/>
	</SettingItem>
</div>
