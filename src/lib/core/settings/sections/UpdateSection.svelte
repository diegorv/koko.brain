<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { invoke, Channel } from '@tauri-apps/api/core';
	import { relaunch } from '@tauri-apps/plugin-process';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { ask } from '@tauri-apps/plugin-dialog';
	import type { UpdateMetadata } from '#lib/contracts/index.js';
	import { call } from '#lib/contracts/ipc.js';
	import { prepareForExit } from '#lib/core/vault/exit.service.js';
	import { settingsStore } from '../settings.store.svelte';
	import type { ReleaseChannel } from '../settings.types';
	import BuildInfo from '../BuildInfo.svelte';
	import SettingItem from './SettingItem.svelte';

	/**
	 * GitHub Releases page of each channel. Used as a manual fallback link
	 * in the downgrade UI. The primary path is the in-app downgrade flow
	 * below, but if the in-app download fails (CDN lag, signature mismatch,
	 * …) the user still needs a way to reach the official DMG.
	 */
	const RELEASES_URL: Record<ReleaseChannel, string> = {
		stable: 'https://github.com/diegorv/koko.brain/releases/latest',
		nightly: 'https://github.com/diegorv/koko.brain/releases/tag/nightly',
		preview: 'https://github.com/diegorv/koko.brain/releases/tag/preview',
	};

	/**
	 * Version order of the channels for the same base: semver ranks the
	 * prerelease identifiers `nightly` < `preview`, both below the next
	 * stable and above the stable they build on (ADR-0039).
	 */
	const CHANNEL_RANK: Record<ReleaseChannel, number> = { stable: 0, nightly: 1, preview: 2 };

	/** Base URL of a commit page; the changelog appends the short sha. */
	const COMMIT_URL = 'https://github.com/diegorv/koko.brain/commit';

	/** Read once: Vite inlines the whole object at every `__CHANGELOG__` reference. */
	const changelog = __CHANGELOG__;

	type Status = 'idle' | 'checking' | 'downloading' | 'ready' | 'up-to-date' | 'error';

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
		{
			value: 'preview',
			label: 'Preview',
			description: 'Built from main plus features under test. May be unstable.',
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
	}

	/**
	 * Format a Unix-ms timestamp as a coarse "X ago" string. Intentionally
	 * imprecise — minute / hour / day granularity is enough for the
	 * Settings UI, and finer precision would require a re-render every
	 * second to stay accurate.
	 */
	function formatLastChecked(ts: number | null): string {
		if (ts === null) return 'never';
		const diff = Date.now() - ts;
		if (diff < 60_000) return 'just now';
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
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	/**
	 * The chosen channel when it ranks below the installed build's channel,
	 * else null. In that state the regular check always reports "up to
	 * date": the installed version is semver-greater than any release of
	 * the chosen channel on the same base. The "Install <channel>
	 * (downgrade)" button below installs it in-app instead.
	 */
	const downgradeTarget = $derived(
		CHANNEL_RANK[__APP_CHANNEL__] > CHANNEL_RANK[settingsStore.updates.channel]
			? settingsStore.updates.channel
			: null,
	);

	/**
	 * What a downgrade to `target` takes away: a preview build loses the
	 * features under test, and going to Stable loses what main gained
	 * since the last Stable tag.
	 */
	function downgradeLosses(target: ReleaseChannel): string {
		const losses: string[] = [];
		if (__APP_CHANNEL__ === 'preview') losses.push('the features under test that are not on main yet');
		if (target === 'stable') losses.push('any changes that landed on main since the last Stable tag');
		return losses.join(' and ');
	}

	/**
	 * Run the channel-aware check + download flow.
	 *
	 * `allowDowngrades` is only used by the downgrade path (where the
	 * installed version sorts semver-greater than any same-base release of
	 * the lower-ranked channel and the default comparator would report "up
	 * to date" instead of installing). For the regular "Check for updates"
	 * path it stays false so an accidental rollback can't happen.
	 *
	 * `forceChannel` lets the downgrade path name its target channel
	 * explicitly: it equals the chosen channel anyway, but passing it
	 * makes the intent obvious at the call site and decouples the flow
	 * from the setting's state at click time.
	 */
	async function checkForUpdates(
		opts: { allowDowngrades?: boolean; forceChannel?: ReleaseChannel } = {},
	) {
		const channel = opts.forceChannel ?? settingsStore.updates.channel;
		const allowDowngrades = opts.allowDowngrades ?? false;
		status = 'checking';
		errorMessage = '';
		try {
			const update = await call('check_for_update_on_channel', {
				channel,
				allowDowngrades,
			});
			// Record the check timestamp regardless of result so the
			// auto-check throttle and the "Last checked" line both reflect
			// the latest user action.
			settingsStore.updateUpdates({ lastCheckedAt: Date.now() });
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
				// Plugin command, outside CommandMap: stays a raw invoke (see `call()`).
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
	 * Confirm + run the in-app downgrade to `target`.
	 *
	 * Uses the native `ask` dialog so the destructive intent is gated
	 * by an OS-level prompt — the user has to explicitly click OK
	 * before any network call or install happens. On confirm, runs the
	 * same `checkForUpdates` flow with `allowDowngrades: true` so the
	 * default semver comparator's "newer-only" rule is overridden.
	 *
	 * A preview build warns about settings: `saveSettings` writes only the
	 * keys the running build knows, so the older build drops preview-only
	 * keys (ADR-0039).
	 */
	async function confirmDowngrade(target: ReleaseChannel) {
		const installed = channelOptionLabel(__APP_CHANNEL__);
		const label = channelOptionLabel(target);
		const until = target === 'stable' ? ', until the next Stable release ships' : '';
		const settingsNote =
			__APP_CHANNEL__ === 'preview'
				? `Your vault is unaffected, but settings that only Preview builds know are dropped when the ${label} build saves your settings.`
				: 'Your vault and settings are unaffected.';
		const ok = await ask(
			`This will replace your ${installed} build (${__BUILD_INFO__}) with the latest ${label} ${target === 'stable' ? 'release' : 'build'}. You will lose ${downgradeLosses(target)}${until}. ${settingsNote}\n\nContinue?`,
			{
				title: `Install ${label} (downgrade)`,
				kind: 'warning',
				okLabel: `Install ${label}`,
				cancelLabel: 'Cancel',
			},
		);
		if (!ok) return;
		await checkForUpdates({ allowDowngrades: true, forceChannel: target });
	}

	/**
	 * Relaunches into the installed update. `relaunch()` exits through a
	 * restart that cannot be prevented and runs no close handler, so the
	 * exit flush runs here first; a cancel at its discard prompt keeps the app open.
	 */
	async function restartApp() {
		if (!(await prepareForExit())) return;
		await relaunch();
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Update</h2>

	<h3 class="section-label mb-2">Version</h3>

	<SettingItem label="Current version" description="Release channel, version, commit and build time" layout="stacked">
		<BuildInfo />
	</SettingItem>

	<SettingItem
		label="Check for updates"
		description={`${channelOptionLabel(settingsStore.updates.channel)} channel. Last checked: ${formatLastChecked(settingsStore.updates.lastCheckedAt)}.`}
	>
		{#if status === 'idle'}
			<Button variant="outline" size="sm" onclick={() => checkForUpdates()}>
				Check and download
			</Button>
		{:else if status === 'checking'}
			<span class="text-meta text-muted-foreground">Checking...</span>
		{:else if status === 'downloading'}
			<!-- The size and percent show only once `Started` reports a content length; without one the bar pulses. -->
			<div class="flex w-48 flex-col gap-1.5">
				<span class="text-meta text-muted-foreground">
					{#if totalBytes > 0}
						Downloading v{pendingUpdate?.version} ({formatBytes(totalBytes)})... {downloadProgress}%
					{:else}
						Downloading v{pendingUpdate?.version}...
					{/if}
				</span>
				<div
					class="h-1.5 w-full overflow-hidden rounded-full bg-muted {totalBytes > 0 ? '' : 'animate-pulse'}"
					role="progressbar"
					aria-label="Download of update v{pendingUpdate?.version}"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={totalBytes > 0 ? downloadProgress : undefined}
				>
					<div class="h-full bg-primary transition-[width]" style:width="{totalBytes > 0 ? downloadProgress : 0}%"></div>
				</div>
			</div>
		{:else if status === 'ready'}
			<Button variant="default" size="sm" onclick={restartApp}>
				Restart to update
			</Button>
		{:else if status === 'up-to-date'}
			<span class="text-meta text-success">You're up to date</span>
		{:else if status === 'error'}
			<div class="flex items-center gap-2">
				<span class="select-text text-meta text-destructive">{errorMessage}</span>
				<Button variant="outline" size="sm" onclick={() => checkForUpdates()}>
					Retry
				</Button>
			</div>
		{/if}
	</SettingItem>

	<h3 class="section-label mt-6 mb-2">Preferences</h3>

	<SettingItem
		label="Release channel"
		description={channelOptionDescription(settingsStore.updates.channel)}
	>
		<Select.Root
			type="single"
			value={settingsStore.updates.channel}
			onValueChange={handleChannelChange}
		>
			<Select.Trigger class="w-44">
				<span data-slot="select-value">{channelOptionLabel(settingsStore.updates.channel)}</span>
			</Select.Trigger>
			<Select.Content>
				{#each CHANNEL_OPTIONS as opt (opt.value)}
					<Select.Item value={opt.value} label={opt.label} />
				{/each}
			</Select.Content>
		</Select.Root>
	</SettingItem>

	{#if downgradeTarget}
		{@const target = downgradeTarget}
		{@const label = channelOptionLabel(target)}
		<SettingItem
			label={`Install ${label}`}
			description={`You're on a ${channelOptionLabel(__APP_CHANNEL__)} build but the updater is set to ${label}. Auto-update normally won't downgrade, so click below to install the latest ${label} in-app. You'll lose ${downgradeLosses(target)}.`}
		>
			<div class="flex items-center gap-2">
				<Button variant="outline" size="sm" onclick={() => confirmDowngrade(target)}>
					Install {label} (downgrade)
				</Button>
				<Button variant="ghost" size="sm" onclick={() => openUrl(RELEASES_URL[target])} title="Open the GitHub Releases page if the in-app install fails">
					Releases page
				</Button>
			</div>
		</SettingItem>
	{/if}

	<SettingItem
		label="Auto-check on launch"
		description="Silently check for an update when the app opens."
	>
		<Switch
			checked={settingsStore.updates.autoCheck}
			onCheckedChange={handleAutoCheckChange}
		/>
	</SettingItem>

	{#if changelog}
		<h3 class="section-label mt-6 mb-2">Changes in this build</h3>

		<div class="flex flex-col gap-2 rounded-lg bg-setting-item-bg px-4 py-3">
			<span class="select-text text-meta text-muted-foreground">
				Since {changelog.since}. Docs, tests, CI and tooling commits are hidden.
			</span>
			{#if changelog.commits.length === 0}
				<span class="text-meta text-muted-foreground">No app changes since {changelog.since}</span>
			{:else}
				<ul class="flex max-h-64 flex-col gap-1 overflow-y-auto text-meta">
					{#each changelog.commits as commit}
						<li data-testid="changelog-entry">
							<button
								type="button"
								class="text-left hover:underline focus-visible:underline focus-visible:outline-none"
								title="Open the commit on GitHub"
								onclick={() => openUrl(`${COMMIT_URL}/${commit.sha}`)}
							>
								{commit.subject}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>
