<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { queryjsSessionStore } from '#lib/plugins/queryjs/queryjs-session.store.svelte.js';
	import type { AutoRunQueriesPolicy } from '#lib/core/settings/settings.types.js';
	import SettingItem from '#lib/core/settings/sections/SettingItem.svelte';

	const POLICY_OPTIONS: { value: AutoRunQueriesPolicy; label: string; description: string }[] = [
		{
			value: 'first-open',
			label: 'First open',
			description: 'Run on the first time the file opens this session, then cache.',
		},
		{
			value: 'always',
			label: 'Always',
			description: 'Run every block that has no cached result, each time it is drawn. A result stays cached until a note is saved or changes on disk.',
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
	}

	function clearCache() {
		queryjsSessionStore.reset();
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">QueryJS</h2>
	<p class="mb-4 text-sm text-muted-foreground">
		QueryJS lets you embed JavaScript queries inside notes via <code>```queryjs</code> fenced
		blocks. The KBAPI surface (<code>kb.pages</code>, <code>kb.view</code>, <code>kb.ui</code>,
		<code>DataArray</code>, <code>KBDateTime</code>) is documented in the QueryJS page of the user guide (help/documentation/13-queryjs.md).
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
			<Select.Trigger class="w-44">
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
		<Button variant="outline" size="sm" onclick={clearCache}>
			Clear
		</Button>
	</SettingItem>
</div>
