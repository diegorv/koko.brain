<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';
	import { configureSentry } from '../sentry.service';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	let configurationError = $state('');

	async function updateSentry(value: Partial<typeof settingsStore.sentry>): Promise<void> {
		settingsStore.updateSentry(value);
		try {
			const result = await configureSentry(settingsStore.sentry);
			configurationError = result === 'invalid-dsn'
				? 'Enter a valid Sentry Cloud DSN to start error monitoring.'
				: '';
		} catch (err) {
			configurationError = 'Sentry could not be configured. Check the DSN and try again.';
			console.error('Failed to configure Sentry:', err);
		}
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
			onCheckedChange={(enabled) => void updateSentry({ enabled })}
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
				oninput={(event) => void updateSentry({ dsn: event.currentTarget.value })}
				placeholder="https://public-key@o0.ingest.sentry.io/0"
				autocomplete="off"
				aria-invalid={configurationError ? 'true' : undefined}
				class="h-8 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
			/>
		</SettingItem>

		{#if configurationError}
			<p class="px-4 text-xs text-destructive" role="alert">{configurationError}</p>
		{/if}

		<p class="px-4 text-xs text-muted-foreground">
			This sends error events and stack traces only. Session replay, performance tracing, breadcrumbs, user identity, and request data are disabled. Error messages can still include technical details supplied by the application.
		</p>
	{/if}
</div>
