<script lang="ts">
	import { untrack } from 'svelte';
	import AutoOrganizeRuleRow from '#lib/features/auto-organize/AutoOrganizeRuleRow.svelte';
	import type { AutoOrganizeRule } from '#lib/features/auto-organize/auto-organize.types.js';

	/**
	 * Mounts a rule row whose updates merge back into its rule, as
	 * `autoOrganizeStore.updateRule` does for `AutoOrganizeSection`, and reports each one.
	 */
	let { initial, onupdate }: {
		initial: AutoOrganizeRule;
		onupdate: (id: string, updates: Partial<AutoOrganizeRule>) => void;
	} = $props();

	let rule = $state(untrack(() => initial));

	function update(id: string, updates: Partial<AutoOrganizeRule>) {
		rule = { ...rule, ...updates };
		onupdate(id, updates);
	}
</script>

<AutoOrganizeRuleRow
	{rule}
	isFirst={true}
	isLast={true}
	onupdate={update}
	onremove={() => {}}
	onmoveup={() => {}}
	onmovedown={() => {}}
/>
