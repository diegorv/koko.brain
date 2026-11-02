<script lang="ts">
	import { Switch } from '#lib/components/ui/switch/index.js';
	import SettingItem from '#lib/core/settings/sections/SettingItem.svelte';
	import { normalizeRemoteServerPort } from '#lib/core/settings/settings.logic.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { error } from '#lib/utils/debug.js';
	import { applyRemoteServerSettings } from './remote-server.service';
	import { remoteServerStore } from './remote-server.store.svelte';

	/** Applies the current setting; a start error is already in the store for the alert below. */
	async function apply(): Promise<void> {
		try {
			await applyRemoteServerSettings(settingsStore.remoteServer);
		} catch (err) {
			error('REMOTE', 'Failed to apply browser access settings:', err);
		}
	}

	function setEnabled(enabled: boolean): void {
		settingsStore.updateRemoteServer({ enabled });
		void apply();
	}

	/** Commits a port edit; a running server moves to the new port. */
	function commitPort(event: Event & { currentTarget: HTMLInputElement }): void {
		const port = normalizeRemoteServerPort(Number.parseFloat(event.currentTarget.value));
		event.currentTarget.value = String(port);
		if (port === settingsStore.remoteServer.port && remoteServerStore.error === null) return;
		settingsStore.updateRemoteServer({ port });
		if (settingsStore.remoteServer.enabled) void apply();
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Browser Access</h2>

	<SettingItem
		label="Serve the app to a browser"
		description="Off by default. When on, Kokobrain serves its own interface on this Mac only (127.0.0.1). The browser cannot reach your vault yet."
	>
		<Switch checked={settingsStore.remoteServer.enabled} onCheckedChange={setEnabled} />
	</SettingItem>

	<SettingItem label="Port" description="Port on 127.0.0.1, between 1024 and 65535.">
		<input
			type="number"
			min="1024"
			max="65535"
			step="1"
			value={settingsStore.remoteServer.port}
			onchange={commitPort}
			aria-label="Browser access port"
			aria-invalid={remoteServerStore.error ? 'true' : undefined}
			class="h-8 w-28 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:border-primary/50"
		/>
	</SettingItem>

	{#if remoteServerStore.error}
		<p class="px-4 text-xs text-destructive" role="alert">
			Browser access could not start: {remoteServerStore.error}. Pick another port.
		</p>
	{:else if remoteServerStore.url}
		<p class="px-4 text-xs text-muted-foreground" role="status">
			Open <span class="font-mono">{remoteServerStore.url}</span> in a browser on this Mac.
		</p>
	{/if}
</div>
