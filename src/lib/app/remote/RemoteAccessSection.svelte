<script lang="ts">
	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import SettingItem from '#lib/core/settings/sections/SettingItem.svelte';
	import { normalizeOwnerLogin, normalizeRemoteServerPort, normalizeTailnetHost } from '#lib/core/settings/settings.logic.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { error } from '#lib/utils/debug.js';
	import { serveCommands, tailnetUrl } from './remote-serve.logic';
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

	/** Set when the typed port was replaced, so the Serve commands below never name a port the owner did not see change. */
	let portNote = $state<string | null>(null);

	/** Commits a port edit; a running server moves to the new port. */
	function commitPort(event: Event): void {
		const input = event.currentTarget as HTMLInputElement;
		const typed = input.value.trim();
		const port = normalizeRemoteServerPort(Number.parseFloat(typed));
		portNote = typed === String(port) ? null : `Port ${typed || '(empty)'} cannot be used here, so ${port} is used instead.`;
		input.value = String(port);
		if (port === settingsStore.remoteServer.port && remoteServerStore.error === null) return;
		settingsStore.updateRemoteServer({ port });
		if (settingsStore.remoteServer.enabled) void apply();
	}

	/** Commits a tailnet name or owner login edit; a running server restarts with it. */
	function commitRoute(key: 'tailnetHost' | 'ownerLogin', event: Event): void {
		const input = event.currentTarget as HTMLInputElement;
		const value = (key === 'tailnetHost' ? normalizeTailnetHost : normalizeOwnerLogin)(input.value);
		input.value = value;
		if (value === settingsStore.remoteServer[key]) return;
		settingsStore.updateRemoteServer({ [key]: value });
		if (settingsStore.remoteServer.enabled) void apply();
	}

	const commands = $derived(serveCommands(settingsStore.remoteServer.port));
	const tailnet = $derived(
		remoteServerStore.runningPort === null ? null : tailnetUrl(settingsStore.remoteServer.tailnetHost, remoteServerStore.runningPort),
	);
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Browser Access</h2>

	<SettingItem
		label="Serve the app to a browser"
		description="Off by default. When on, Kokobrain serves its own interface and the open vault on this Mac only (127.0.0.1). Other devices reach it only through Tailscale Serve, as the owner login below."
	>
		<Switch checked={settingsStore.remoteServer.enabled} onCheckedChange={setEnabled} />
	</SettingItem>

	<SettingItem
		label="Port"
		description="Port on 127.0.0.1, between 1024 and 65535, also the Tailscale Serve port. Not 8443 or 10000 (Funnel ports), and not a port t3code already uses: run the status command below first."
	>
		<Input
			type="number"
			class="w-28"
			min={1024}
			max={65535}
			step={1}
			value={String(settingsStore.remoteServer.port)}
			onchange={commitPort}
			aria-label="Browser access port"
			aria-invalid={remoteServerStore.error ? 'true' : undefined}
		/>
	</SettingItem>
	{#if portNote}
		<p class="px-4 text-meta text-muted-foreground" data-testid="port-note">{portNote}</p>
	{/if}

	<SettingItem label="Tailnet host name" description="This Mac's name on the tailnet, for example mac.tail1234.ts.net. Empty: no tailnet access.">
		<Input
			type="text"
			class="w-64"
			value={settingsStore.remoteServer.tailnetHost}
			onchange={(e) => commitRoute('tailnetHost', e)}
			placeholder="mac.tail1234.ts.net"
			aria-label="Tailnet host name"
			spellcheck="false"
			autocomplete="off"
		/>
	</SettingItem>

	<SettingItem label="Owner Tailscale login" description="Only requests from this Tailscale login get in through Serve. Enter it exactly as tailscale status --json prints it (the match is case-sensitive). Empty: every tailnet request is refused.">
		<Input
			type="text"
			class="w-64"
			value={settingsStore.remoteServer.ownerLogin}
			onchange={(e) => commitRoute('ownerLogin', e)}
			placeholder="you@example.com"
			aria-label="Owner Tailscale login"
			spellcheck="false"
			autocomplete="off"
		/>
	</SettingItem>

	<div class="flex flex-col gap-1 px-4 text-meta text-muted-foreground" data-testid="serve-commands">
		<p>Publish on the tailnet (Terminal on this Mac):</p>
		<code class="select-all rounded-sm bg-muted px-2 py-1 font-mono text-foreground">{commands.publish}</code>
		<p>Unpublish:</p>
		<code class="select-all rounded-sm bg-muted px-2 py-1 font-mono text-foreground">{commands.unpublish}</code>
		<p>See what Serve publishes now:</p>
		<code class="select-all rounded-sm bg-muted px-2 py-1 font-mono text-foreground">{commands.status}</code>
	</div>

	{#if remoteServerStore.error}
		<p class="px-4 text-meta text-destructive" role="alert">
			Browser access could not start: {remoteServerStore.error}. Pick another port.
		</p>
	{:else if remoteServerStore.url}
		<p class="px-4 text-meta text-muted-foreground" role="status">
			Open <span class="font-mono">{remoteServerStore.url}</span> in a browser on this Mac.
			{#if tailnet}
				On the iPad or iPhone, open <span class="font-mono">{tailnet}</span>.
			{/if}
		</p>
	{/if}
</div>
