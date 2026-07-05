<script lang="ts">
	import { untrack } from 'svelte';
	import { writeText } from '@tauri-apps/plugin-clipboard-manager';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { syncStore } from '$lib/plugins/sync/sync.store.svelte';
	import {
		generatePairingKey,
		listRemoteShares,
		refreshStatus,
		startListener,
		stopListener,
		syncNow,
	} from '$lib/plugins/sync/sync.service';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	/** Input buffer for the add-exposed-folder field. */
	let newExposedFolder = $state('');

	$effect(() => {
		untrack(() => {
			refreshStatus().catch(() => {});
		});
	});

	/** Restart the listener when it is on, so config changes take effect. */
	async function restartListenerIfRunning() {
		const path = vaultStore.path;
		if (!path || !settingsStore.sync.exposeEnabled) return;
		try {
			await startListener(path);
		} catch {
			// service already toasted
		}
	}

	async function handleToggleExpose(enabled: boolean) {
		settingsStore.updateSync({ exposeEnabled: enabled });
		const path = vaultStore.path;
		if (!path) return;
		try {
			if (enabled) await startListener(path);
			else await stopListener();
		} catch {
			// service already toasted; revert so the UI matches reality
			settingsStore.updateSync({ exposeEnabled: !enabled });
		}
	}

	async function handleGenerateKey() {
		try {
			await generatePairingKey();
		} catch {
			// service already toasted
		}
	}

	async function handleCopyKey() {
		await writeText(settingsStore.sync.pairingKey);
	}

	function handleAddExposedFolder() {
		const folder = newExposedFolder.trim().replace(/^\/+|\/+$/g, '');
		if (!folder || settingsStore.sync.exposedFolders.includes(folder)) return;
		settingsStore.updateSync({ exposedFolders: [...settingsStore.sync.exposedFolders, folder] });
		newExposedFolder = '';
		void restartListenerIfRunning();
	}

	function handleRemoveExposedFolder(folder: string) {
		settingsStore.updateSync({
			exposedFolders: settingsStore.sync.exposedFolders.filter((f) => f !== folder),
		});
		void restartListenerIfRunning();
	}

	function handleToggleSubscription(folder: string, subscribed: boolean) {
		const rest = settingsStore.sync.subscriptions.filter((f) => f !== folder);
		settingsStore.updateSync({ subscriptions: subscribed ? [...rest, folder] : rest });
	}

	async function handleListShares() {
		try {
			await listRemoteShares();
		} catch {
			// service already toasted
		}
	}

	async function handleSyncNow() {
		const path = vaultStore.path;
		if (!path) return;
		try {
			await syncNow(path);
		} catch {
			// service already toasted
		}
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Sync</h2>

	<SettingItem label="Device name" description="Name this machine reports to the peer">
		<Input
			value={settingsStore.sync.deviceName}
			placeholder="kokobrain"
			oninput={(e) => {
				settingsStore.updateSync({ deviceName: (e.currentTarget as HTMLInputElement).value });
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Expose to peer"
		description="Listen for incoming connections from the paired machine"
	>
		<Switch checked={settingsStore.sync.exposeEnabled} onCheckedChange={handleToggleExpose} />
	</SettingItem>

	{#if syncStore.status.listening}
		<p class="px-4 text-xs text-muted-foreground">
			Listening on {syncStore.status.localIp ?? '?'}:{syncStore.status.port} — enter this address
			on the other machine.
		</p>
	{/if}

	<SettingItem label="Pairing key" description="Shared secret — must be identical on both machines">
		<div class="flex w-full items-center gap-2">
			<Input
				type="password"
				value={settingsStore.sync.pairingKey}
				placeholder="Generate or paste the peer's key"
				oninput={(e) => {
					settingsStore.updateSync({ pairingKey: (e.currentTarget as HTMLInputElement).value.trim() });
				}}
			/>
			<Button variant="outline" size="sm" onclick={handleGenerateKey}>Generate</Button>
			<Button variant="ghost" size="sm" onclick={handleCopyKey}>Copy</Button>
		</div>
	</SettingItem>

	<SettingItem label="Peer address" description="ip:port shown in the peer's Sync settings">
		<Input
			value={settingsStore.sync.peerAddress}
			placeholder="192.168.0.10:38712"
			oninput={(e) => {
				settingsStore.updateSync({ peerAddress: (e.currentTarget as HTMLInputElement).value.trim() });
			}}
		/>
	</SettingItem>

	<SettingItem label="Exposed folders" description="Vault folders the peer may read">
		<div class="flex w-full flex-col gap-1">
			{#each settingsStore.sync.exposedFolders as folder (folder)}
				<div class="flex items-center justify-between gap-2 text-sm">
					<span class="truncate">{folder}</span>
					<Button variant="ghost" size="sm" onclick={() => handleRemoveExposedFolder(folder)}>
						Remove
					</Button>
				</div>
			{/each}
			<div class="flex items-center gap-2">
				<Input
					value={newExposedFolder}
					placeholder="Notes/Public"
					oninput={(e) => (newExposedFolder = (e.currentTarget as HTMLInputElement).value)}
					onkeydown={(e) => {
						if (e.key === 'Enter') handleAddExposedFolder();
					}}
				/>
				<Button variant="outline" size="sm" onclick={handleAddExposedFolder}>Add</Button>
			</div>
		</div>
	</SettingItem>

	<SettingItem label="Subscriptions" description="Peer folders to pull on Sync now">
		<div class="flex w-full flex-col gap-1">
			<Button variant="outline" size="sm" disabled={syncStore.busy} onclick={handleListShares}>
				{syncStore.busy ? 'Listing…' : 'List peer shares'}
			</Button>
			{#if syncStore.remoteShares !== null}
				{#each syncStore.remoteShares as folder (folder)}
					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={settingsStore.sync.subscriptions.includes(folder)}
							onchange={(e) => handleToggleSubscription(folder, e.currentTarget.checked)}
						/>
						<span class="truncate">{folder}</span>
					</label>
				{/each}
				{#if syncStore.remoteShares.length === 0}
					<p class="text-xs text-muted-foreground">The peer exposes no folders.</p>
				{/if}
			{/if}
			{#each settingsStore.sync.subscriptions.filter((s) => !(syncStore.remoteShares ?? [s]).includes(s)) as stale (stale)}
				<label class="flex items-center gap-2 text-sm text-muted-foreground">
					<input
						type="checkbox"
						checked={true}
						onchange={(e) => handleToggleSubscription(stale, e.currentTarget.checked)}
					/>
					<span class="truncate">{stale} (no longer exposed)</span>
				</label>
			{/each}
		</div>
	</SettingItem>

	<SettingItem label="Sync now" description="Pull subscribed folders from the peer">
		<div class="flex w-full flex-col items-end gap-1">
			<Button variant="default" size="sm" disabled={syncStore.syncing} onclick={handleSyncNow}>
				{syncStore.syncing ? 'Syncing…' : 'Sync now'}
			</Button>
			{#if syncStore.lastSummary}
				<p class="text-xs text-muted-foreground">
					Last sync {syncStore.lastSyncAt}: {syncStore.lastSummary.downloaded} downloaded,
					{syncStore.lastSummary.conflicts} conflict(s), {syncStore.lastSummary.skipped} skipped{syncStore
						.lastSummary.errors.length > 0
						? `, ${syncStore.lastSummary.errors.length} error(s)`
						: ''}
				</p>
			{/if}
		</div>
	</SettingItem>
</div>
