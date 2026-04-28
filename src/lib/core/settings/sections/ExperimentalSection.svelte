<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	let { onchange }: { onchange: () => void } = $props();

	function handleNewLivePreviewToggle(enabled: boolean) {
		settingsStore.updateExperimental({ newLivePreview: enabled });
		onchange();
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-1 text-lg font-semibold">Experimental</h2>
	<p class="mb-4 text-xs text-muted-foreground">
		Opt-in features that are still being validated. Toggling them off restores the default behaviour.
	</p>

	<SettingItem
		label="New live-preview pipeline"
		description="Use the consolidated rendering pipeline (HighlightStyle + unified inline plugin). Refresh the editor or reopen a note for the change to take effect."
	>
		<Switch
			checked={settingsStore.experimental.newLivePreview}
			onCheckedChange={handleNewLivePreviewToggle}
		/>
	</SettingItem>
</div>
