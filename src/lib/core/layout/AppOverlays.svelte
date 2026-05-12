<script lang="ts">
	import { Toaster } from 'svelte-sonner';
	import QuickSwitcher from '$lib/features/quick-switcher/QuickSwitcher.svelte';
	import CommandPalette from '$lib/features/command-palette/CommandPalette.svelte';
	import TemplatePicker from '$lib/plugins/templates/TemplatePicker.svelte';
	import OneOnOnePicker from '$lib/plugins/one-on-one/OneOnOnePicker.svelte';
	import SettingsDialog from '$lib/core/settings/SettingsDialog.svelte';
	import FileHistoryDialog from '$lib/features/file-history/FileHistoryDialog.svelte';
	import PairingPrompt from '$lib/plugins/lan-sync/PairingPrompt.svelte';
	import PushFolderDialog from '$lib/plugins/lan-sync/PushFolderDialog.svelte';
	import { lanSyncPlugin } from '$lib/plugins/lan-sync/lan-sync.plugin';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';

	/** Reactive view of the pending push request so the dialog opens when set. */
	const pushReq = $derived(lanSyncPlugin.pushFolderRequest.get());
</script>

<Toaster richColors theme="dark" />
<QuickSwitcher />
<CommandPalette />
<TemplatePicker />
<OneOnOnePicker />
<SettingsDialog />
<FileHistoryDialog />
{#if vaultStore.path}
	<PairingPrompt vaultPath={vaultStore.path} service={lanSyncPlugin.service} />
	{#if pushReq}
		<PushFolderDialog
			vaultPath={vaultStore.path}
			sourceRelPath={pushReq.sourceRelPath}
			service={lanSyncPlugin.service}
			open={true}
			onClose={() => lanSyncPlugin.pushFolderRequest.set(null)}
		/>
	{/if}
{/if}
