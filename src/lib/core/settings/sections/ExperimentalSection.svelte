<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	let { onchange }: { onchange: () => void } = $props();
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Experimental</h2>

	<p class="text-xs text-muted-foreground mb-4">
		Opt-in features under active development. Behavior may change without notice. App restart may be required after toggling.
	</p>

	<h3 class="mb-2 text-sm font-medium text-muted-foreground">Live Preview</h3>

	<SettingItem
		label="Unified renderer (new)"
		description="Use the consolidated HighlightStyle + inlineFormattingPlugin pipeline instead of the legacy 11 inline plugins. Requires restart."
	>
		<Switch
			checked={settingsStore.experimental.newLivePreview}
			onCheckedChange={(v) => {
				settingsStore.updateExperimental({ newLivePreview: v });
				onchange();
			}}
		/>
	</SettingItem>
</div>
