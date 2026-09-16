<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	function updateSentry(value: Partial<typeof settingsStore.sentry>): void {
		settingsStore.updateSentry(value);
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Sentry</h2>

	<SettingItem
		label="Error monitoring"
		description="Disabled by default. When enabled, unhandled application errors are sent to the Sentry project configured below."
	>
		<Switch
			checked={settingsStore.sentry.enabled}
			onCheckedChange={(enabled) => updateSentry({ enabled })}
		/>
	</SettingItem>

	{#if settingsStore.sentry.enabled}
		<SettingItem
			label="Sentry DSN"
			description="Paste the project DSN from Sentry Settings → Projects → Client Keys (DSN)."
		>
			<input
				type="url"
				value={settingsStore.sentry.dsn}
				oninput={(event) => updateSentry({ dsn: event.currentTarget.value })}
				placeholder="https://public-key@o0.ingest.sentry.io/0"
				autocomplete="off"
				class="h-8 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
			/>
		</SettingItem>
	{/if}
</div>
