<script lang="ts">
	import * as Select from '$lib/components/ui/select';
	import { settingsStore } from '../settings.store.svelte';
	import { queryjsSessionStore } from '$lib/plugins/queryjs/queryjs-session.store.svelte';
	import type { AutoRunQueriesPolicy } from '../settings.types';
	import SettingItem from './SettingItem.svelte';

	let { onchange }: { onchange: () => void } = $props();

	const POLICY_OPTIONS: { value: AutoRunQueriesPolicy; label: string; description: string }[] = [
		{
			value: 'first-open',
			label: 'First open',
			description: 'Run on the first time the file opens this session, then cache.',
		},
		{
			value: 'always',
			label: 'Always',
			description: 'Re-run on every render. Slower but always fresh.',
		},
		{
			value: 'manual',
			label: 'Manual',
			description: 'Never auto-execute. Use ▶ Run on each block.',
		},
	];

	function policyLabel(value: AutoRunQueriesPolicy): string {
		return POLICY_OPTIONS.find((o) => o.value === value)?.label ?? value;
	}

	function policyDescription(value: AutoRunQueriesPolicy): string {
		return POLICY_OPTIONS.find((o) => o.value === value)?.description ?? '';
	}

	function handlePolicyChange(value: string) {
		settingsStore.updateQueryjs({ autoRunQueries: value as AutoRunQueriesPolicy });
		onchange();
	}

	function clearCache() {
		queryjsSessionStore.reset();
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-1 text-lg font-semibold">QueryJS</h2>
	<p class="mb-4 text-xs text-muted-foreground">
		QueryJS lets you embed JavaScript queries inside notes via <code>```queryjs</code> fenced
		blocks. The KBAPI surface (<code>kb.pages</code>, <code>kb.view</code>, <code>kb.ui</code>,
		<code>DataArray</code>, <code>KBDateTime</code>) is documented in the README.
	</p>

	<SettingItem
		label="Auto-run policy"
		description={policyDescription(settingsStore.queryjs.autoRunQueries)}
	>
		<Select.Root
			type="single"
			value={settingsStore.queryjs.autoRunQueries}
			onValueChange={handlePolicyChange}
		>
			<Select.Trigger size="sm" class="w-44">
				<span data-slot="select-value">{policyLabel(settingsStore.queryjs.autoRunQueries)}</span>
			</Select.Trigger>
			<Select.Content>
				{#each POLICY_OPTIONS as opt (opt.value)}
					<Select.Item value={opt.value} label={opt.label} />
				{/each}
			</Select.Content>
		</Select.Root>
	</SettingItem>

	<SettingItem
		label="Clear cache"
		description="Drop all cached query results + autoRun markers for this session. Each block re-runs on its next render (according to the policy above)."
	>
		<button
			type="button"
			class="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
			onclick={clearCache}
		>
			Clear
		</button>
	</SettingItem>
</div>
