<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { invoke, Channel } from '@tauri-apps/api/core';
	import { relaunch } from '@tauri-apps/plugin-process';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { settingsStore } from '../settings.store.svelte';
	import type { ReleaseChannel } from '../settings.types';
	import BuildInfo from '../BuildInfo.svelte';
	import SettingItem from './SettingItem.svelte';

	/**
	 * Canonical GitHub Releases page for the stable channel. Used by the
	 * "Reinstall Stable" deep-link below — the in-app updater cannot
	 * downgrade a nightly install to stable because nightly versions are
	 * semver-greater than the same-base stable version, so a manual DMG
	 * reinstall is the only path back.
	 */
	const STABLE_DOWNLOAD_URL = 'https://github.com/diegorv/koko.brain/releases/latest';

	let { onchange }: { onchange: () => void } = $props();

	type Status = 'idle' | 'checking' | 'downloading' | 'ready' | 'up-to-date' | 'error';

	/**
	 * Metadata returned by the channel-aware Rust command. Matches the
	 * `UpdateMetadata` struct in src-tauri/src/commands/update_channel.rs.
	 * The `rid` is opaque to JS — it's only handed back to the plugin's
	 * built-in `download_and_install` command, which uses the webview's
	 * resource table to find the cached `Update` (and its channel-specific
	 * bundle URL).
	 */
	interface UpdateMetadata {
		rid: number;
		currentVersion: string;
		version: string;
		body: string | null;
	}

	/**
	 * Download progress event emitted by the plugin's `download_and_install`
	 * command. Serde-tagged "event" + "data", camelCase nested fields.
	 */
	type DownloadEvent =
		| { event: 'Started'; data: { contentLength: number | null } }
		| { event: 'Progress'; data: { chunkLength: number } }
		| { event: 'Finished' };

	const CHANNEL_OPTIONS: { value: ReleaseChannel; label: string; description: string }[] = [
		{
			value: 'stable',
			label: 'Stable',
			description: 'Official tagged releases. Recommended for everyday use.',
		},
		{
			value: 'nightly',
			label: 'Nightly',
			description: 'Built from the latest commit on main. May be unstable.',
		},
	];

	function channelOptionLabel(value: ReleaseChannel): string {
		return CHANNEL_OPTIONS.find((o) => o.value === value)?.label ?? value;
	}

	function channelOptionDescription(value: ReleaseChannel): string {
		return CHANNEL_OPTIONS.find((o) => o.value === value)?.description ?? '';
	}

	function handleChannelChange(value: string) {
		settingsStore.updateChannel(value as ReleaseChannel);
		onchange();
		// Reset any pending download state — the previous "Restart to update"
		// pointed at an Update from the other channel and is no longer valid.
		status = 'idle';
		errorMessage = '';
		pendingUpdate = null;
		downloadProgress = 0;
	}

	let status = $state<Status>('idle');
	let errorMessage = $state('');
	let pendingUpdate = $state<UpdateMetadata | null>(null);
	let downloadProgress = $state(0);

	/**
	 * True when the installed build is nightly but the user has picked
	 * the stable channel for updates. This is the only state where the
	 * in-app updater can't help — the installed version is already
	 * semver-greater than any stable release of the same base version,
	 * so "Check for updates" will always report "up to date" against
	 * stable. The "Reinstall Stable" button below opens the GitHub
	 * Releases page so the user can download the canonical stable DMG.
	 */
	const needsManualReinstall = $derived(
		__APP_CHANNEL__ === 'nightly' && settingsStore.updates.channel === 'stable',
	);

	async function checkForUpdates() {
		status = 'checking';
		errorMessage = '';
		try {
			const update = await invoke<UpdateMetadata | null>('check_for_update_on_channel', {
				channel: settingsStore.updates.channel,
			});
			if (update) {
				pendingUpdate = update;
				status = 'downloading';
				let totalBytes = 0;
				let downloadedBytes = 0;
				const onEvent = new Channel<DownloadEvent>();
				onEvent.onmessage = (msg) => {
					if (msg.event === 'Started') {
						totalBytes = msg.data.contentLength ?? 0;
					} else if (msg.event === 'Progress') {
						downloadedBytes += msg.data.chunkLength;
						if (totalBytes > 0) {
							downloadProgress = Math.round((downloadedBytes / totalBytes) * 100);
						}
					} else if (msg.event === 'Finished') {
						downloadProgress = 100;
					}
				};
				await invoke('plugin:updater|download_and_install', {
					rid: update.rid,
					onEvent,
				});
				status = 'ready';
			} else {
				status = 'up-to-date';
			}
		} catch (err) {
			status = 'error';
			errorMessage = err instanceof Error ? err.message : String(err);
		}
	}

	async function restartApp() {
		await relaunch();
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Update</h2>

	<SettingItem
		label="Release channel"
		description={channelOptionDescription(settingsStore.updates.channel)}
	>
		<Select.Root
			type="single"
			value={settingsStore.updates.channel}
			onValueChange={handleChannelChange}
		>
			<Select.Trigger size="sm" class="w-44">
				<span data-slot="select-value">{channelOptionLabel(settingsStore.updates.channel)}</span>
			</Select.Trigger>
			<Select.Content>
				{#each CHANNEL_OPTIONS as opt (opt.value)}
					<Select.Item value={opt.value} label={opt.label} />
				{/each}
			</Select.Content>
		</Select.Root>
	</SettingItem>

	<p class="-mt-1 mb-2 text-xs text-muted-foreground">
		Nightly versions use the format <code>X.Y.Z-nightly.&lt;count&gt;.&lt;sha&gt;</code> and sort
		semver-greater than the same-base stable release. Switching from <strong>Nightly</strong> back
		to <strong>Stable</strong> will not automatically downgrade — the auto-updater never moves to a
		lower version. Reinstall the stable DMG manually if you want a clean switch.
	</p>

	{#if needsManualReinstall}
		<SettingItem
			label="Reinstall Stable"
			description="You're on a Nightly build but the updater is set to Stable. Auto-update can't downgrade; open the Releases page to download the latest Stable DMG manually."
		>
			<Button variant="outline" size="sm" onclick={() => openUrl(STABLE_DOWNLOAD_URL)}>
				Open Releases
			</Button>
		</SettingItem>
	{/if}

	<SettingItem label="Current version" description="The version currently installed">
		<BuildInfo />
	</SettingItem>

	<SettingItem
		label="Check for updates"
		description={`Check the ${channelOptionLabel(settingsStore.updates.channel).toLowerCase()} channel for a newer version`}
	>
		{#if status === 'idle'}
			<Button variant="outline" size="sm" onclick={checkForUpdates}>
				Check
			</Button>
		{:else if status === 'checking'}
			<span class="text-sm text-muted-foreground">Checking...</span>
		{:else if status === 'downloading'}
			<span class="text-sm text-muted-foreground">Downloading v{pendingUpdate?.version}... {downloadProgress}%</span>
		{:else if status === 'ready'}
			<Button variant="default" size="sm" onclick={restartApp}>
				Restart to update
			</Button>
		{:else if status === 'up-to-date'}
			<span class="text-sm text-green-500">You're up to date!</span>
		{:else if status === 'error'}
			<div class="flex items-center gap-2">
				<span class="text-sm text-destructive">{errorMessage}</span>
				<Button variant="outline" size="sm" onclick={checkForUpdates}>
					Retry
				</Button>
			</div>
		{/if}
	</SettingItem>
</div>
