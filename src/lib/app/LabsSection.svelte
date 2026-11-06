<!-- Lives in app/ because Labs entries may come from several layers. -->
<script lang="ts">
	import { toast } from 'svelte-sonner';

	import { Switch } from '#lib/components/ui/switch/index.js';
	import SettingItem from '#lib/core/settings/sections/SettingItem.svelte';
	import { error } from '#lib/utils/debug.js';
	import { modsEnabledStore } from '#lib/plugins/mods/mods-enabled.store.svelte.js';

	/** Saves the flag; on a failed write, reports it and keeps the switch at the stored value */
	function setModsEnabled(enabled: boolean) {
		try {
			modsEnabledStore.setEnabled(enabled);
		} catch (err) {
			error('LABS', 'saving the Vault mods flag failed:', err);
			toast.error('Could not save the Vault mods setting');
		}
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Labs</h2>

	<SettingItem
		label="Vault mods"
		description="Run JavaScript mods from _system/mods/ in this vault. Mods run with full access to the app and your files. Only enable mods you wrote."
	>
		<Switch
			aria-label="Vault mods"
			bind:checked={() => modsEnabledStore.enabled, setModsEnabled}
		/>
	</SettingItem>
</div>
