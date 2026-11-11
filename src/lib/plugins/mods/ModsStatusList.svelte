<script lang="ts">
	import { toast } from 'svelte-sonner';

	import { Switch } from '#lib/components/ui/switch/index.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { error } from '#lib/utils/debug.js';

	import { modsEnabledStore } from './mods-enabled.store.svelte';
	import { disableMod, enableMod } from './mods-host.service';
	import { modsStore, type ModStatusEntry } from './mods.store.svelte';

	const STATE_LABELS: Record<ModStatusEntry['state'], string> = {
		loaded: 'Loaded',
		error: 'Error',
		disabled: 'Disabled',
	};

	/**
	 * Saves one mod's switch, then loads or unloads only that mod; on a failed
	 * write, reports it and leaves the mod as it was.
	 */
	function setModEnabled(entry: ModStatusEntry, enabled: boolean) {
		try {
			modsEnabledStore.setModEnabled(entry.folder, enabled);
		} catch (err) {
			error('MODS', `saving the switch for ${entry.folder} failed:`, err);
			toast.error(`Could not save the setting for ${entry.name}`);
			return;
		}
		const vaultPath = vaultStore.path;
		if (enabled && vaultPath !== null) {
			enableMod(vaultPath, entry.folder).catch((err: unknown) => {
				error('MODS', `loading ${entry.folder} failed:`, err);
			});
		} else if (!enabled) {
			disableMod(entry.folder);
		}
	}
</script>

<div class="flex flex-col gap-1 px-4">
	{#if modsStore.entries.length === 0}
		<p class="text-meta text-muted-foreground">No mods in _system/mods/</p>
	{:else}
		<ul class="flex flex-col gap-1">
			{#each modsStore.entries as entry (entry.folder)}
				{@const callbackError = entry.state === 'loaded' ? modsStore.callbackErrorFor(entry.folder) : null}
				<li class="flex flex-col gap-0.5 py-1" data-mod-folder={entry.folder} data-mod-state={entry.state}>
					<div class="flex items-center justify-between gap-4">
						<span class="text-row text-settings-text">
							{entry.name}
							{#if entry.version}<span class="text-meta text-muted-foreground">{entry.version}</span>{/if}
						</span>
						<span class="flex items-center gap-3">
							<span class="text-meta {entry.state === 'error' ? 'text-destructive' : 'text-muted-foreground'}">
								{STATE_LABELS[entry.state]}{#if entry.loadMs !== undefined}{' · '}<span data-mod-load-ms={entry.loadMs}>{entry.loadMs === 0 ? '< 1' : entry.loadMs} ms</span>{/if}
							</span>
							<!-- Reads the saved switch, not the load state, which lags until onload settles. -->
							<Switch
								aria-label="Enable {entry.name}"
								bind:checked={
									() => !modsEnabledStore.disabledMods.includes(entry.folder), (v) => setModEnabled(entry, v)
								}
							/>
						</span>
					</div>
					{#if entry.error}
						<p class="text-meta text-destructive break-words">{entry.error.message}</p>
						{#if entry.error.stack}
							<details class="text-meta text-muted-foreground">
								<summary class="cursor-pointer">Stack trace</summary>
								<pre class="overflow-x-auto whitespace-pre-wrap">{entry.error.stack}</pre>
							</details>
						{/if}
					{/if}
					{#if callbackError}
						<!-- Absolute time: a relative one would go stale without a ticking state. -->
						<p class="text-meta text-destructive break-words" data-mod-callback-error={callbackError.callback}>
							Last callback error ({callbackError.callback}, <time datetime={new Date(callbackError.at).toISOString()}>{new Date(callbackError.at).toLocaleTimeString()}</time>): {callbackError.message}
						</p>
						{#if callbackError.stack}
							<details class="text-meta text-muted-foreground">
								<summary class="cursor-pointer">Stack trace</summary>
								<pre class="overflow-x-auto whitespace-pre-wrap">{callbackError.stack}</pre>
							</details>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
