<script lang="ts">
	import SettingItem from '#lib/core/settings/sections/SettingItem.svelte';

	/** Mounts a SettingItem with a marked control child, so tests can find both parts. */
	let { label, description, layout }: {
		label: string;
		description?: string;
		layout?: 'inline' | 'stacked';
	} = $props();
</script>

<SettingItem {label} {description} {layout}>
	<button type="button" data-testid="control">Control</button>
</SettingItem>
