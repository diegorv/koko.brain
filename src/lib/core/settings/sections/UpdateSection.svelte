<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { invoke, Channel } from '@tauri-apps/api/core';
	import { relaunch } from '@tauri-apps/plugin-process';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { ask } from '@tauri-apps/plugin-dialog';
	import { settingsStore } from '../settings.store.svelte';
	import type { ReleaseChannel } from '../settings.types';
	import BuildInfo from '../BuildInfo.svelte';
	import SettingItem from './SettingItem.svelte';

	/**
	 * Canonical GitHub Releases page for the stable channel. Used as a
	 * manual fallback link in the downgrade UI — the primary path is the
	 * in-app downgrade flow below, but if the in-app download fails (CDN
	 * lag, signature mismatch, …) the user still needs a way to reach
	 * the official DMG.
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
		settingsStore.updateUpdates({ channel: value as ReleaseChannel });
		onchange();
		// Reset any pending download state — the previous "Restart to update"
		// pointed at an Update from the other channel and is no longer valid.
		status = 'idle';
		errorMessage = '';
		pendingUpdate = null;
		downloadProgress = 0;
		totalBytes = 0;
	}

	function handleAutoCheckChange(value: boolean) {
		settingsStore.updateUpdates({ autoCheck: value });
		onchange();
	}

	/**
	 * Format a Unix-ms timestamp as a coarse "X ago" string. Intentionally
	 * imprecise — minute / hour / day granularity is enough for the
	 * Settings UI, and finer precision would require a re-render every
	 * second to stay accurate.
	 */
	function formatLastChecked(ts: number | null): string {
		if (ts === null) return 'Never';
		const diff = Date.now() - ts;
		if (diff < 60_000) return 'Just now';
		if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
		if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
		return `${Math.floor(diff / 86_400_000)} d ago`;
	}

	let status = $state<Status>('idle');
	let errorMessage = $state('');
	let pendingUpdate = $state<UpdateMetadata | null>(null);
	let downloadProgress = $state(0);
	/** Total download size in bytes, populated from the Channel `Started` event. 0 until known. */
	let totalBytes = $state(0);

	/**
	 * Format a byte count as a coarse "X.X MB" / "X KB" string. Used by the
	 * download status row. The Tauri bundle is always megabytes-sized, so
	 * MB is the default unit; KB is only relevant if a future build ships
	 * a tiny delta installer.
	 */
	function formatBytes(bytes: number): string {
		if (bytes <= 0) return '?';
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

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

	/**
	 * Run the channel-aware check + download flow.
	 *
	 * `allowDowngrades` is only used by the "Install Stable" path on
	 * a nightly build (where the installed nightly version sorts
	 * semver-greater than any same-base stable release and the default
	 * comparator would report "up to date" instead of installing). For
	 * the regular "Check for updates" path it stays false so an
	 * accidental rollback can't happen.
	 *
	 * `forceChannel` lets the downgrade path target the stable channel
	 * regardless of the user's current setting — the button only shows
	 * when `settings.updates.channel === 'stable'` anyway, but passing
	 * it explicitly makes the intent obvious at the call site and
	 * decouples the flow from the setting's state at click time.
	 */
	async function checkForUpdates(
		opts: { allowDowngrades?: boolean; forceChannel?: ReleaseChannel } = {},
	) {
		const channel = opts.forceChannel ?? settingsStore.updates.channel;
		const allowDowngrades = opts.allowDowngrades ?? false;
		status = 'checking';
		errorMessage = '';
		try {
			const update = await invoke<UpdateMetadata | null>('check_for_update_on_channel', {
				channel,
				allowDowngrades,
			});
			// Record the check timestamp regardless of result so the
			// auto-check throttle and the "Last checked" line both reflect
			// the latest user action.
			settingsStore.updateUpdates({ lastCheckedAt: Date.now() });
			onchange();
			if (update) {
				pendingUpdate = update;
				status = 'downloading';
				downloadProgress = 0;
				totalBytes = 0;
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

	/**
	 * Confirm + run the nightly → stable in-app downgrade.
	 *
	 * Uses the native `ask` dialog so the destructive intent is gated
	 * by an OS-level prompt — the user has to explicitly click OK
	 * before any network call or install happens. On confirm, runs the
	 * same `checkForUpdates` flow with `allowDowngrades: true` so the
	 * default semver comparator's "newer-only" rule is overridden.
	 */
	async function confirmInstallStable() {
		const ok = await ask(
			`This will replace your Nightly build (${__BUILD_INFO__}) with the latest Stable release. You will lose any changes that landed on main since the last Stable tag, until the next Stable release ships. Your vault and settings are unaffected.\n\nContinue?`,
			{
				title: 'Install Stable (downgrade)',
				kind: 'warning',
				okLabel: 'Install Stable',
				cancelLabel: 'Cancel',
			},
		);
		if (!ok) return;
		await checkForUpdates({ allowDowngrades: true, forceChannel: 'stable' });
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
			label="Install Stable"
			description="You're on a Nightly build but the updater is set to Stable. Auto-update normally won't downgrade — click below to install the latest Stable in-app. You'll lose any changes that landed on main since the last Stable tag."
		>
			<div class="flex items-center gap-2">
				<Button variant="outline" size="sm" onclick={confirmInstallStable}>
					Install Stable (downgrade)
				</Button>
				<Button variant="ghost" size="sm" onclick={() => openUrl(STABLE_DOWNLOAD_URL)} title="Open the GitHub Releases page if the in-app install fails">
					Releases page
				</Button>
			</div>
		</SettingItem>
	{/if}

	<SettingItem label="Current version" description="The version currently installed">
		<BuildInfo />
	</SettingItem>

	<SettingItem
		label="Auto-check on launch"
		description="Silently check for an update when the app opens. Throttled to once per 24h."
	>
		<Switch
			checked={settingsStore.updates.autoCheck}
			onCheckedChange={handleAutoCheckChange}
		/>
	</SettingItem>

	<SettingItem
		label="Last checked"
		description="When the app most recently asked GitHub for a newer version"
	>
		<span class="text-sm text-muted-foreground">{formatLastChecked(settingsStore.updates.lastCheckedAt)}</span>
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
			<span class="text-sm text-muted-foreground">Downloading v{pendingUpdate?.version} ({formatBytes(totalBytes)})... {downloadProgress}%</span>
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
