<script lang="ts">
	import AutoOrganizeRuleRow from '#lib/features/auto-organize/AutoOrganizeRuleRow.svelte';
	import { autoOrganizeStore } from '#lib/features/auto-organize/auto-organize.store.svelte.js';

	/**
	 * Renders a row per rule of `autoOrganizeStore` and writes its updates back
	 * through `updateRule`, as `AutoOrganizeSection` does, without saving to disk.
	 */
</script>

{#each autoOrganizeStore.rules as rule (rule.id)}
	<AutoOrganizeRuleRow
		{rule}
		isFirst={true}
		isLast={true}
		onupdate={(id, updates) => autoOrganizeStore.updateRule(id, updates)}
		onremove={() => {}}
		onmoveup={() => {}}
		onmovedown={() => {}}
	/>
{/each}
