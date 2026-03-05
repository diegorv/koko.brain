<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Switch } from '$lib/components/ui/switch';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import XIcon from '@lucide/svelte/icons/x';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import SettingItem from '$lib/core/settings/sections/SettingItem.svelte';
	import AutoMoveRuleRow from './AutoMoveRuleRow.svelte';
	import { autoMoveStore } from './auto-move.store.svelte';
	import { saveAutoMoveConfig, toggleAutoMoveHook } from './auto-move.service';
	import { generateRuleId } from './auto-move.logic';
	import type { AutoMoveRule } from './auto-move.types';
	import { error } from '$lib/utils/debug';

	let { onchange }: { onchange: () => void } = $props();

	/** Folder input for adding excluded folders */
	let newExcludedFolder = $state('');

	/** Debounce timer for config saves triggered by text input */
	let saveTimer: ReturnType<typeof setTimeout> | undefined;

	onDestroy(() => {
		if (saveTimer) clearTimeout(saveTimer);
	});

	function clampDebounce(value: number): number {
		return Math.max(500, Math.min(30000, Math.round(value)));
	}

	function saveConfig() {
		if (vaultStore.path) {
			saveAutoMoveConfig(vaultStore.path).catch((err) =>
				error('AUTO-MOVE', 'Failed to save config:', err),
			);
		}
	}

	/** Debounced save — updates store immediately but delays disk write (for keystroke inputs) */
	function saveConfigDebounced() {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			saveConfig();
		}, 500);
	}

	function addRule() {
		const rule: AutoMoveRule = {
			id: generateRuleId(),
			name: '',
			expression: '',
			destination: '',
			enabled: true,
		};
		autoMoveStore.addRule(rule);
		saveConfig();
	}

	function updateRule(id: string, updates: Partial<AutoMoveRule>) {
		autoMoveStore.updateRule(id, updates);
		saveConfigDebounced();
	}

	function removeRule(id: string) {
		autoMoveStore.removeRule(id);
		saveConfig();
	}

	function moveRuleUp(id: string) {
		const rules = [...autoMoveStore.rules];
		const idx = rules.findIndex((r) => r.id === id);
		if (idx <= 0) return;
		[rules[idx - 1], rules[idx]] = [rules[idx], rules[idx - 1]];
		autoMoveStore.reorderRules(rules);
		saveConfig();
	}

	function moveRuleDown(id: string) {
		const rules = [...autoMoveStore.rules];
		const idx = rules.findIndex((r) => r.id === id);
		if (idx < 0 || idx >= rules.length - 1) return;
		[rules[idx], rules[idx + 1]] = [rules[idx + 1], rules[idx]];
		autoMoveStore.reorderRules(rules);
		saveConfig();
	}

	function addExcludedFolder() {
		const folder = newExcludedFolder.trim();
		if (!folder) return;
		if (autoMoveStore.excludedFolders.includes(folder)) return;
		autoMoveStore.setExcludedFolders([...autoMoveStore.excludedFolders, folder]);
		newExcludedFolder = '';
		saveConfig();
	}

	function removeExcludedFolder(folder: string) {
		autoMoveStore.setExcludedFolders(
			autoMoveStore.excludedFolders.filter((f) => f !== folder),
		);
		saveConfig();
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Auto Move</h2>

	<SettingItem
		label="Enable Auto Move"
		description="Automatically move notes to folders based on rules when saved"
	>
		<Switch
			checked={settingsStore.autoMove.enabled}
			onCheckedChange={(enabled) => {
				settingsStore.updateAutoMove({ enabled });
				toggleAutoMoveHook(enabled);
				onchange();
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Debounce delay"
		description="Seconds to wait after save before evaluating rules (0.5–30)"
	>
		<Input
			type="number"
			class="w-24"
			min={0.5}
			max={30}
			step={0.5}
			value={String(settingsStore.autoMove.debounceMs / 1000)}
			oninput={(e) => {
				const seconds = Number((e.currentTarget as HTMLInputElement).value);
				const ms = clampDebounce(Math.round(seconds * 1000));
				settingsStore.updateAutoMove({ debounceMs: ms });
				onchange();
			}}
		/>
	</SettingItem>

	<!-- Rules section -->
	<div class="mt-6 flex items-center justify-between">
		<h3 class="text-sm font-semibold">Rules</h3>
		<Button variant="outline" size="sm" class="gap-1.5 text-xs" onclick={addRule}>
			<PlusIcon class="size-3.5" />
			Add Rule
		</Button>
	</div>

	<p class="text-xs text-muted-foreground">
		Rules are evaluated top-to-bottom. The first matching rule determines the destination folder.
		Expressions use the same syntax as Collection filters (e.g. <code class="rounded bg-muted px-1">file.hasTag('archive')</code>).
	</p>

	{#if autoMoveStore.rules.length === 0}
		<div class="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
			No rules configured. Click "Add Rule" to create one.
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			{#each autoMoveStore.rules as rule, i (rule.id)}
				<AutoMoveRuleRow
					{rule}
					isFirst={i === 0}
					isLast={i === autoMoveStore.rules.length - 1}
					onupdate={updateRule}
					onremove={removeRule}
					onmoveup={moveRuleUp}
					onmovedown={moveRuleDown}
				/>
			{/each}
		</div>
	{/if}

	<!-- Excluded folders section -->
	<div class="mt-6">
		<h3 class="text-sm font-semibold mb-2">Excluded Folders</h3>
		<p class="text-xs text-muted-foreground mb-3">
			Notes inside these folders will never be automatically moved.
		</p>

		<div class="flex gap-2 mb-2">
			<Input
				class="flex-1 text-sm"
				placeholder="_templates"
				bind:value={newExcludedFolder}
				onkeydown={(e) => {
					if (e.key === 'Enter') addExcludedFolder();
				}}
			/>
			<Button
				variant="outline"
				size="sm"
				disabled={!newExcludedFolder.trim()}
				onclick={addExcludedFolder}
			>
				Add
			</Button>
		</div>

		{#if autoMoveStore.excludedFolders.length > 0}
			<div class="flex flex-wrap gap-1.5">
				{#each autoMoveStore.excludedFolders as folder}
					<span class="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
						{folder}
						<button
							class="text-muted-foreground hover:text-foreground transition-colors"
							onclick={() => removeExcludedFolder(folder)}
						>
							<XIcon class="size-3" />
						</button>
					</span>
				{/each}
			</div>
		{/if}
	</div>
</div>
