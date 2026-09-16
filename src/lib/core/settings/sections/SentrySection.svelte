<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { configureSentry, sendSentryTestEvent } from '../sentry.service';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	let configurationError = $state('');
	let testEventStatus = $state('');
	let isSendingTestEvent = $state(false);

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

	async function sendTestEvent(): Promise<void> {
		testEventStatus = '';
		isSendingTestEvent = true;
		try {
			const result = await sendSentryTestEvent();
			testEventStatus = result === 'sent'
				? 'Test event sent. Check Sentry Issues in a few moments.'
				: result === 'pending'
					? 'Test event was queued but delivery could not be confirmed. Check your connection and Sentry Issues.'
					: 'Sentry is not active. Enter a valid DSN before sending a test event.';
		} catch (err) {
			testEventStatus = 'Could not send the test event. Check the DSN and try again.';
			console.error('Failed to send Sentry test event:', err);
		} finally {
			isSendingTestEvent = false;
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

		<SettingItem
			label="Send test event"
			description="Send a synthetic error without vault data to confirm this DSN reaches your Sentry project."
		>
			<Button variant="outline" size="sm" disabled={isSendingTestEvent} onclick={() => void sendTestEvent()}>
				{isSendingTestEvent ? 'Sending…' : 'Send test event'}
			</Button>
		</SettingItem>

		{#if testEventStatus}
			<p class="px-4 text-xs text-muted-foreground" role="status">{testEventStatus}</p>
		{/if}

		<p class="px-4 text-xs text-muted-foreground">
			This sends error events and stack traces only. Session replay, performance tracing, breadcrumbs, user identity, and request data are disabled. Error messages can still include technical details supplied by the application.
		</p>
	{/if}
</div>
