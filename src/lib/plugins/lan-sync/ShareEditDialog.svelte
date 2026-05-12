<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { lanSyncStore } from './lan-sync.store.svelte';
	import { addShare } from './lan-sync.service';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import type { ShareDirection, ShareMode } from './lan-sync.types';
	import { toast } from 'svelte-sonner';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let mode = $state<ShareMode>('subfolder');
	let localPath = $state('');
	let excludesInput = $state('');
	let direction = $state<ShareDirection>('bi');
	let readOnly = $state(false);
	let allowedFingerprints = $state<string[]>([]);
	let busy = $state(false);

	function reset() {
		mode = 'subfolder';
		localPath = '';
		excludesInput = '';
		direction = 'bi';
		readOnly = false;
		allowedFingerprints = [];
		busy = false;
	}

	function togglePeer(fp: string) {
		if (allowedFingerprints.includes(fp)) {
			allowedFingerprints = allowedFingerprints.filter((f) => f !== fp);
		} else {
			allowedFingerprints = [...allowedFingerprints, fp];
		}
	}

	function validateClientSide(): string | null {
		if (mode === 'subfolder') {
			if (!localPath.trim()) return 'Subfolder path is required.';
			if (localPath.includes('..')) return 'Path cannot contain "..".';
			if (localPath.startsWith('/') || localPath.startsWith('\\')) {
				return 'Path must be relative to the vault root.';
			}
			const firstSeg = localPath.split('/')[0];
			if (firstSeg.startsWith('.')) {
				return 'Cannot expose a folder starting with "." (hidden directory).';
			}
		}
		if (allowedFingerprints.length === 0) {
			return 'Select at least one trusted peer to allow.';
		}
		return null;
	}

	const excludes = $derived(
		excludesInput
			.split(/[\n,]/)
			.map((s) => s.trim())
			.filter((s) => s.length > 0),
	);

	async function submit() {
		const vaultPath = vaultStore.path;
		if (!vaultPath) {
			toast.error('Open a vault first.');
			return;
		}
		const issue = validateClientSide();
		if (issue) {
			toast.error(issue);
			return;
		}
		busy = true;
		try {
			await addShare(vaultPath, {
				mode,
				localPath: mode === 'root-with-excludes' ? '' : localPath,
				excludes: mode === 'root-with-excludes' ? excludes : [],
				allowedPeerFingerprints: allowedFingerprints,
				direction,
				readOnly,
			});
			toast.success('Share created.');
			open = false;
			reset();
		} catch (err) {
			toast.error(`Add share failed: ${String(err)}`);
		} finally {
			busy = false;
		}
	}

	$effect(() => {
		if (!open) reset();
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Add share</Dialog.Title>
		</Dialog.Header>

		<div class="flex flex-col gap-4">
			<fieldset class="flex flex-col gap-2">
				<legend class="text-sm font-medium">Scope</legend>
				<label class="flex items-start gap-2 text-sm">
					<input
						type="radio"
						name="lan-sync-mode"
						value="subfolder"
						checked={mode === 'subfolder'}
						onchange={() => (mode = 'subfolder')}
					/>
					<span>
						<strong>Subfolder</strong>
						<span class="text-muted-foreground block text-xs">
							Expose a specific folder. Recommended for maximum isolation.
						</span>
					</span>
				</label>
				<label class="flex items-start gap-2 text-sm">
					<input
						type="radio"
						name="lan-sync-mode"
						value="root-with-excludes"
						checked={mode === 'root-with-excludes'}
						onchange={() => (mode = 'root-with-excludes')}
					/>
					<span>
						<strong>Entire vault with exclusions</strong>
						<span class="text-muted-foreground block text-xs">
							Expose everything except the folders you list below. Hidden folders
							(<code class="font-mono">.kokobrain</code>, <code class="font-mono">.git</code>,
							encrypted notes) are always excluded.
						</span>
					</span>
				</label>
			</fieldset>

			{#if mode === 'subfolder'}
				<div class="flex flex-col gap-2">
					<Label for="lan-sync-local-path">Subfolder path (relative to vault root)</Label>
					<Input
						id="lan-sync-local-path"
						bind:value={localPath}
						placeholder="Projects/sync-test"
					/>
				</div>
			{:else}
				<div class="flex flex-col gap-2">
					<Label for="lan-sync-excludes">Excludes (one per line)</Label>
					<textarea
						id="lan-sync-excludes"
						bind:value={excludesInput}
						rows="4"
						class="bg-background min-h-20 rounded border border-input p-2 font-mono text-xs"
						placeholder={'Trabalho\nPessoal'}
					></textarea>
					<p class="text-muted-foreground text-xs">
						Each entry excludes a folder and everything under it.
					</p>
				</div>
			{/if}

			<div class="flex flex-col gap-2">
				<Label>Allowed peers</Label>
				{#if lanSyncStore.trustedPeers.length === 0}
					<p class="text-muted-foreground text-xs">
						No trusted peers yet. Pair a device first, then come back.
					</p>
				{:else}
					<ul class="flex flex-col gap-1">
						{#each lanSyncStore.trustedPeers as peer (peer.fingerprintHex)}
							<li class="flex items-center gap-2">
								<input
									type="checkbox"
									checked={allowedFingerprints.includes(peer.fingerprintHex)}
									onchange={() => togglePeer(peer.fingerprintHex)}
								/>
								<span class="font-mono text-xs" title={peer.fingerprintHex}>
									{peer.fingerprintDisplay}
								</span>
								<span class="text-muted-foreground text-xs">{peer.displayName}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="flex flex-col gap-2">
				<Label for="lan-sync-direction">Direction</Label>
				<select
					id="lan-sync-direction"
					bind:value={direction}
					class="bg-background rounded border border-input px-2 py-1 text-sm"
				>
					<option value="bi">Bidirectional</option>
					<option value="push">Push only (send local to peers)</option>
					<option value="pull">Pull only (mirror peer changes)</option>
				</select>
			</div>

			<div class="flex items-center justify-between">
				<Label for="lan-sync-readonly">Read-only on this device</Label>
				<Switch id="lan-sync-readonly" bind:checked={readOnly} />
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={submit} disabled={busy}>Create share</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
