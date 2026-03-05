<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	let { onchange }: { onchange: () => void } = $props();

	function handleTokenChange(value: string) {
		settingsStore.updateTodoist({ apiToken: value });
		onchange();
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Todoist</h2>

	<SettingItem
		label="API Token"
		description="Personal API token from Todoist Settings → Integrations → Developer"
	>
		<input
			type="password"
			value={settingsStore.todoist.apiToken}
			oninput={(e) => handleTokenChange(e.currentTarget.value)}
			placeholder="Paste your token here"
			class="h-8 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
		/>
	</SettingItem>

	<p class="px-4 text-xs text-muted-foreground">
		Get your token at
		<button
			class="text-primary hover:underline cursor-pointer"
			onclick={() => openUrl('https://todoist.com/prefs/integrations')}
		>
			todoist.com/prefs/integrations
		</button>
	</p>
</div>
