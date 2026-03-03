<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import * as Select from '$lib/components/ui/select';
	import CheckCircleIcon from '@lucide/svelte/icons/circle-check';
	import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';
	import Loader2Icon from '@lucide/svelte/icons/loader-circle';
	import XIcon from '@lucide/svelte/icons/x';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import { settingsStore } from '../settings.store.svelte';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { syncStore } from '$lib/features/sync/sync.store.svelte';
	import {
		generatePassphrase,
		savePassphrase,
		hasPassphrase,
		saveSyncLocalConfig,
		triggerSync,
		changePassphrase,
		resetSync,
		initSync,
		teardownSync,
		updateSyncInterval,
		updateSyncPort,
	} from '$lib/features/sync/sync.service';
	import { error } from '$lib/utils/debug';
	import SettingItem from './SettingItem.svelte';

	let { onchange }: { onchange: () => void } = $props();

	/** Passphrase input segments (3 groups of 5 chars) */
	let passSegments = $state(['', '', '']);
	let showPassphrase = $state(false);
	let passphraseStatus = $state<'unknown' | 'saved' | 'not-configured'>('unknown');
	let isSaving = $state(false);
	let newAllowedPath = $state('');
	let confirmingReset = $state(false);
	let confirmingChangePass = $state(false);

	const INTERVAL_OPTIONS = [
		{ value: '1', label: '1 minute' },
		{ value: '2', label: '2 minutes' },
		{ value: '5', label: '5 minutes' },
		{ value: '10', label: '10 minutes' },
		{ value: '15', label: '15 minutes' },
		{ value: '30', label: '30 minutes' },
	];

	let passInput0: HTMLInputElement | undefined = $state();
	let passInput1: HTMLInputElement | undefined = $state();
	let passInput2: HTMLInputElement | undefined = $state();
	const passInputRefs = $derived([passInput0, passInput1, passInput2]);

	/** Checks passphrase status on mount */
	$effect(() => {
		const vp = vaultStore.path;
		if (vp) {
			hasPassphrase(vp).then((has) => {
				passphraseStatus = has ? 'saved' : 'not-configured';
			}).catch(() => {
				passphraseStatus = 'unknown';
			});
		}
	});

	function handlePassInput(index: number, e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const value = input.value.slice(0, 5);
		passSegments[index] = value;
		// Auto-focus next segment when full
		if (value.length === 5 && index < 2) {
			passInputRefs[index + 1]?.focus();
		}
	}

	function handlePassPaste(e: ClipboardEvent) {
		const text = e.clipboardData?.getData('text')?.replace(/[\s-]/g, '') ?? '';
		if (text.length >= 15) {
			e.preventDefault();
			passSegments[0] = text.slice(0, 5);
			passSegments[1] = text.slice(5, 10);
			passSegments[2] = text.slice(10, 15);
			passInputRefs[2]?.focus();
		}
	}

	function getFullPassphrase(): string | null {
		const full = passSegments[0] + passSegments[1] + passSegments[2];
		return full.length === 15 ? full : null;
	}

	async function handleGenerate() {
		try {
			const pass = await generatePassphrase();
			passSegments[0] = pass.slice(0, 5);
			passSegments[1] = pass.slice(5, 10);
			passSegments[2] = pass.slice(10, 15);
			showPassphrase = true;
		} catch (err) {
			error('SYNC', 'Failed to generate passphrase:', err);
		}
	}

	async function handleSavePassphrase() {
		const vp = vaultStore.path;
		const full = getFullPassphrase();
		if (!vp || !full) return;

		isSaving = true;
		try {
			await savePassphrase(vp, full);
			passphraseStatus = 'saved';
			passSegments = ['', '', ''];
			showPassphrase = false;
		} catch (err) {
			error('SYNC', 'Failed to save passphrase:', err);
		} finally {
			isSaving = false;
		}
	}

	async function handleToggleSync(enabled: boolean) {
		const vp = vaultStore.path;
		if (!vp) return;

		settingsStore.updateSync({ enabled });
		onchange();

		if (enabled) {
			await initSync(vp);
			// initSync catches errors internally and sets running=false on failure
			if (!syncStore.isRunning) {
				settingsStore.updateSync({ enabled: false });
				onchange();
			}
		} else {
			await teardownSync();
		}
	}

	async function handleIntervalChange(value: string) {
		const minutes = Number(value);
		settingsStore.updateSync({ intervalMinutes: minutes });
		onchange();

		const vp = vaultStore.path;
		if (vp) {
			await updateSyncInterval(vp, minutes);
		}
	}

	async function handlePortChange(e: Event) {
		const vp = vaultStore.path;
		const val = Number((e.currentTarget as HTMLInputElement).value);
		if (val >= 1024 && val <= 65535) {
			settingsStore.updateSync({ port: val });
			onchange();

			if (vp) {
				await updateSyncPort(vp, val);
			}
		}
	}

	async function handleAddAllowedPath() {
		const vp = vaultStore.path;
		if (!vp || !newAllowedPath.trim()) return;
		const updated = [...syncStore.allowedPaths, newAllowedPath.trim()];
		await saveSyncLocalConfig(vp, updated);
		newAllowedPath = '';
	}

	async function handleRemoveAllowedPath(path: string) {
		const vp = vaultStore.path;
		if (!vp) return;
		const updated = syncStore.allowedPaths.filter((p) => p !== path);
		await saveSyncLocalConfig(vp, updated);
	}

	async function handleChangePassphrase() {
		const vp = vaultStore.path;
		const full = getFullPassphrase();
		if (!vp || !full) return;

		confirmingChangePass = false;
		try {
			await changePassphrase(vp, full);
			passphraseStatus = 'saved';
			passSegments = ['', '', ''];
			showPassphrase = false;
		} catch {
			// Error handled by service
		}
	}

	async function handleResetSync() {
		const vp = vaultStore.path;
		if (!vp) return;

		confirmingReset = false;
		try {
			await resetSync(vp);
			passphraseStatus = 'not-configured';
			settingsStore.updateSync({ enabled: false });
			onchange();
		} catch {
			// Error handled by service
		}
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">LAN Sync</h2>

	<!-- Passphrase status -->
	<div class="flex items-center gap-2 px-4 py-2 text-sm">
		{#if passphraseStatus === 'saved'}
			<CheckCircleIcon class="size-4 text-green-500" />
			<span class="text-muted-foreground">Passphrase saved</span>
		{:else if passphraseStatus === 'not-configured'}
			<AlertTriangleIcon class="size-4 text-yellow-500" />
			<span class="text-muted-foreground">Passphrase not configured</span>
		{:else}
			<span class="text-muted-foreground">Checking passphrase...</span>
		{/if}
	</div>

	<!-- Passphrase input -->
	<div class="flex flex-col gap-3 rounded-lg px-4 py-3 bg-setting-item-bg">
		<div class="flex flex-col gap-1">
			<span class="text-sm font-medium text-settings-text">Passphrase</span>
			<span class="text-xs text-muted-foreground">15-character shared secret — must match on all devices</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="flex items-center gap-1">
				<input
					bind:this={passInput0}
					type={showPassphrase ? 'text' : 'password'}
					value={passSegments[0]}
					oninput={(e) => handlePassInput(0, e)}
					onpaste={handlePassPaste}
					maxlength={5}
					autocomplete="off"
					spellcheck="false"
					class="h-8 w-20 rounded-md border border-border bg-background px-2 text-center font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
					placeholder="━━━━━"
				/>
				<span class="text-muted-foreground">-</span>
				<input
					bind:this={passInput1}
					type={showPassphrase ? 'text' : 'password'}
					value={passSegments[1]}
					oninput={(e) => handlePassInput(1, e)}
					onpaste={handlePassPaste}
					maxlength={5}
					autocomplete="off"
					spellcheck="false"
					class="h-8 w-20 rounded-md border border-border bg-background px-2 text-center font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
					placeholder="━━━━━"
				/>
				<span class="text-muted-foreground">-</span>
				<input
					bind:this={passInput2}
					type={showPassphrase ? 'text' : 'password'}
					value={passSegments[2]}
					oninput={(e) => handlePassInput(2, e)}
					onpaste={handlePassPaste}
					maxlength={5}
					autocomplete="off"
					spellcheck="false"
					class="h-8 w-20 rounded-md border border-border bg-background px-2 text-center font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
					placeholder="━━━━━"
				/>
			</div>
			<button
				class="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
				onclick={() => showPassphrase = !showPassphrase}
				title={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
			>
				{#if showPassphrase}
					<EyeOffIcon class="size-4" />
				{:else}
					<EyeIcon class="size-4" />
				{/if}
			</button>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" onclick={handleGenerate}>
				Generate
			</Button>
			<Button
				size="sm"
				disabled={!getFullPassphrase() || isSaving}
				onclick={handleSavePassphrase}
			>
				{#if isSaving}
					<Loader2Icon class="size-3 animate-spin mr-1" />
				{/if}
				Save
			</Button>
		</div>
		{#if getFullPassphrase()}
			<p class="text-xs text-amber-500/80">
				Save this passphrase before closing — it cannot be displayed again. Enter the same passphrase on every device you want to sync with.
			</p>
		{/if}
	</div>

	<!-- Enable sync toggle -->
	<SettingItem
		label="Enable sync"
		description="Start the LAN sync engine for this vault"
	>
		<Switch
			checked={settingsStore.sync.enabled}
			disabled={passphraseStatus !== 'saved'}
			onCheckedChange={handleToggleSync}
		/>
	</SettingItem>

	<!-- Sync interval -->
	<SettingItem
		label="Sync interval"
		description="How often to automatically sync with peers"
	>
		<Select.Root
			type="single"
			value={String(settingsStore.sync.intervalMinutes)}
			onValueChange={handleIntervalChange}
		>
			<Select.Trigger size="sm" class="w-36">
				<span data-slot="select-value">
					{INTERVAL_OPTIONS.find((o) => o.value === String(settingsStore.sync.intervalMinutes))?.label ?? `${settingsStore.sync.intervalMinutes} min`}
				</span>
			</Select.Trigger>
			<Select.Content>
				{#each INTERVAL_OPTIONS as option (option.value)}
					<Select.Item value={option.value} label={option.label} />
				{/each}
			</Select.Content>
		</Select.Root>
	</SettingItem>

	<!-- Port -->
	<SettingItem
		label="Port"
		description="TCP port for the sync server (1024–65535)"
	>
		<Input
			type="number"
			class="w-24"
			min={1024}
			max={65535}
			value={String(settingsStore.sync.port)}
			oninput={handlePortChange}
		/>
	</SettingItem>

	<!-- Allowed paths -->
	<div class="flex flex-col gap-2 rounded-lg px-4 py-3 bg-setting-item-bg">
		<div class="flex flex-col gap-1">
			<span class="text-sm font-medium text-settings-text">Allowed paths</span>
			<span class="text-xs text-muted-foreground">Only files matching these glob patterns will be synced (e.g. "notes/**", "**" for all)</span>
		</div>
		{#if syncStore.allowedPaths.length > 0}
			<div class="flex flex-col gap-1">
				{#each syncStore.allowedPaths as path (path)}
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<span class="font-mono text-xs flex-1 truncate">{path}</span>
						<button
							class="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
							onclick={() => handleRemoveAllowedPath(path)}
							title="Remove path"
						>
							<XIcon class="size-3.5" />
						</button>
					</div>
				{/each}
			</div>
		{/if}
		<div class="flex items-center gap-2">
			<input
				type="text"
				bind:value={newAllowedPath}
				placeholder='e.g. notes/** or ** for all'
				class="h-7 flex-1 rounded-md border border-border bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
				onkeydown={(e) => { if (e.key === 'Enter') handleAddAllowedPath(); }}
			/>
			<Button variant="outline" size="sm" onclick={handleAddAllowedPath} disabled={!newAllowedPath.trim()}>
				<PlusIcon class="size-3.5 mr-1" />
				Add
			</Button>
		</div>
	</div>

	<!-- Connected peers -->
	{#if syncStore.isRunning}
		<div class="flex flex-col gap-2 rounded-lg px-4 py-3 bg-setting-item-bg">
			<span class="text-sm font-medium text-settings-text">Connected peers</span>
			{#if syncStore.peers.length === 0}
				<span class="text-xs text-muted-foreground">No peers discovered yet</span>
			{:else}
				<div class="flex flex-col gap-1">
					{#each syncStore.peers as peer (peer.id)}
						<div class="flex items-center justify-between text-sm">
							<span class="text-foreground">{peer.name}</span>
							<span class="font-mono text-xs text-muted-foreground">{peer.ip}:{peer.port}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Sync status -->
		{#if syncStore.status.state === 'syncing'}
			<div class="flex items-center gap-2 px-4 text-xs text-muted-foreground">
				<Loader2Icon class="size-3 animate-spin" />
				<span>
					Syncing...
					{#if syncStore.status.filesTotal}
						({syncStore.status.filesDone ?? 0}/{syncStore.status.filesTotal} files)
					{/if}
				</span>
			</div>
		{:else if syncStore.status.state === 'error'}
			<div class="flex items-center gap-2 px-4 text-xs text-destructive">
				<AlertTriangleIcon class="size-3" />
				<span>{syncStore.status.error ?? 'Sync error'}</span>
			</div>
		{:else if syncStore.status.lastSyncAt}
			<div class="px-4 text-xs text-muted-foreground">
				Last sync: {new Date(syncStore.status.lastSyncAt).toLocaleTimeString()}
			</div>
		{/if}

		<!-- Sync Now button -->
		<div class="px-4">
			<Button
				variant="outline"
				size="sm"
				disabled={syncStore.status.state === 'syncing'}
				onclick={() => triggerSync()}
			>
				Sync Now
			</Button>
		</div>
	{/if}

	<!-- Danger Zone -->
	<h3 class="mt-6 mb-2 text-sm font-medium text-muted-foreground">Danger Zone</h3>

	<SettingItem
		label="Change passphrase"
		description="Enter a new passphrase and apply it (will restart sync engine)"
	>
		{#if confirmingChangePass}
			<div class="flex gap-2">
				<Button variant="destructive" size="sm" disabled={!getFullPassphrase()} onclick={handleChangePassphrase}>
					Confirm
				</Button>
				<Button variant="outline" size="sm" onclick={() => confirmingChangePass = false}>
					Cancel
				</Button>
			</div>
		{:else}
			<Button
				variant="outline"
				size="sm"
				disabled={passphraseStatus !== 'saved'}
				onclick={() => confirmingChangePass = true}
			>
				Change
			</Button>
		{/if}
	</SettingItem>

	<SettingItem
		label="Reset sync"
		description="Delete sync identity, state, and Keychain entries for this vault"
	>
		{#if confirmingReset}
			<div class="flex gap-2">
				<Button variant="destructive" size="sm" onclick={handleResetSync}>
					Confirm Reset
				</Button>
				<Button variant="outline" size="sm" onclick={() => confirmingReset = false}>
					Cancel
				</Button>
			</div>
		{:else}
			<Button variant="destructive" size="sm" onclick={() => confirmingReset = true}>
				Reset
			</Button>
		{/if}
	</SettingItem>
</div>
