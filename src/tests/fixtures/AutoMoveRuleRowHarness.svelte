<script lang="ts">
	import { untrack } from 'svelte';
	import AutoMoveRuleRow from '#lib/features/auto-move/AutoMoveRuleRow.svelte';
	import type { AutoMoveRule } from '#lib/features/auto-move/auto-move.types.js';

	/**
	 * Mounts a rule row whose updates merge back into its rule, as
	 * `autoMoveStore.updateRule` does for `AutoMoveSection`, and reports each one.
	 */
	let { initial, onupdate }: {
		initial: AutoMoveRule;
		onupdate: (id: string, updates: Partial<AutoMoveRule>) => void;
	} = $props();

	let rule = $state(untrack(() => initial));

	function update(id: string, updates: Partial<AutoMoveRule>) {
		rule = { ...rule, ...updates };
		onupdate(id, updates);
	}
</script>

<AutoMoveRuleRow
	{rule}
	isFirst={true}
	isLast={true}
	onupdate={update}
	onremove={() => {}}
	onmoveup={() => {}}
	onmovedown={() => {}}
/>
