<script lang="ts">
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';

	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { error } from '#lib/utils/debug.js';

	import { modsEnabledStore } from './mods-enabled.store.svelte';
	import { disableMod, enableMod, readModSettings, saveModSetting } from './mods-host.service';
	import type { ModSettingField } from './mods.logic';
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

	type SettingsRead = Awaited<ReturnType<typeof readModSettings>>;
	/** Per folder, the last read of the mod's setting values, with the edits committed since */
	let settingsReads = $state.raw<Record<string, SettingsRead>>({});
	/** Per folder, the entry the last read was for: a reload upserts a new entry, which reads again */
	const readFor = new Map<string, ModStatusEntry>();
	/** Per folder, the edits committed so far: a read that started before the latest one would overwrite its value */
	const commits = new Map<string, number>();

	$effect(() => {
		const vaultPath = vaultStore.path;
		const withSettings = modsStore.entries.filter((e) => e.state === 'loaded' && e.settings?.length);
		untrack(() => {
			if (vaultPath === null) return;
			for (const entry of withSettings) {
				if (readFor.get(entry.folder) === entry) continue;
				readFor.set(entry.folder, entry);
				const startedAt = commits.get(entry.folder) ?? 0;
				void readModSettings(vaultPath, entry.folder).then((result) => {
					if (readFor.get(entry.folder) !== entry || (commits.get(entry.folder) ?? 0) !== startedAt) return;
					settingsReads = { ...settingsReads, [entry.folder]: result };
				});
			}
		});
	});

	/** The stored value when it has the field's type, else the field's default; the host never writes defaults */
	function settingValue(field: ModSettingField, values: Record<string, unknown>): boolean | string {
		const value = values[field.key];
		if (typeof value === field.type) return value as boolean | string;
		return field.default ?? (field.type === 'boolean' ? false : '');
	}

	/** Saves a changed value, which reloads the mod; the row shows it until the reload's read */
	function commitSetting(entry: ModStatusEntry, field: ModSettingField, value: boolean | string) {
		const read = settingsReads[entry.folder];
		const vaultPath = vaultStore.path;
		if (!read?.ok || vaultPath === null || settingValue(field, read.values) === value) return;
		commits.set(entry.folder, (commits.get(entry.folder) ?? 0) + 1);
		settingsReads = { ...settingsReads, [entry.folder]: { ok: true, values: { ...read.values, [field.key]: value } } };
		saveModSetting(vaultPath, entry.folder, field.key, value);
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
					{#if entry.state === 'loaded' && entry.settings?.length}
						{@const read = settingsReads[entry.folder]}
						{#if read && !read.ok}
							<!-- No fields: a write would replace data the host cannot read. -->
							<p class="text-meta text-muted-foreground" data-mod-settings-unavailable>
								Settings unavailable: data.json is {read.reason}
							</p>
						{:else if read}
							<div class="flex flex-col gap-1 pt-1" data-mod-settings>
								{#each entry.settings as field (field.key)}
									{@const value = settingValue(field, read.values)}
									<div class="flex items-center justify-between gap-4">
										<span class="text-meta text-muted-foreground">{field.label}</span>
										{#if field.type === 'boolean'}
											<Switch
												aria-label="Setting {field.label} of {entry.name}"
												bind:checked={() => value === true, (v) => commitSetting(entry, field, v)}
											/>
										{:else}
											<Input
												class="h-7 max-w-56"
												aria-label="Setting {field.label} of {entry.name}"
												value={value as string}
												onchange={(e) => commitSetting(entry, field, (e.currentTarget as HTMLInputElement).value)}
											/>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
