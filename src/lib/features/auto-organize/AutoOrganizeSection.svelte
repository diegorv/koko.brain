<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import XIcon from '@lucide/svelte/icons/x';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import SettingItem from '#lib/core/settings/sections/SettingItem.svelte';
	import AutoOrganizeRuleRow from './AutoOrganizeRuleRow.svelte';
	import { autoOrganizeStore } from './auto-organize.store.svelte';
	import { saveAutoOrganizeConfig, toggleAutoOrganizeHook } from './auto-organize.service';
	import { generateRuleId } from './auto-organize.logic';
	import type { AutoOrganizeRule } from './auto-organize.types';
	import { error } from '#lib/utils/debug.js';
	import { clamp } from '#lib/utils/clamp.js';

	/** Folder input for adding excluded folders */
	let newExcludedFolder = $state('');

	/** Debounce timer for config saves triggered by text input */
	let saveTimer: ReturnType<typeof setTimeout> | undefined;

	onDestroy(() => {
		if (saveTimer) clearTimeout(saveTimer);
	});

	function clampDebounce(value: number): number {
		return clamp(Math.round(value), 500, 30000);
	}

	function saveConfig() {
		if (vaultStore.path) {
			saveAutoOrganizeConfig(vaultStore.path).catch((err) =>
				error('AUTO-ORGANIZE', 'Failed to save config:', err),
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
		const rule: AutoOrganizeRule = {
			id: generateRuleId(),
			name: '',
			expression: '',
			destination: '',
			// A rule runs on every save, so it stays off until the user finishes it.
			enabled: false,
		};
		autoOrganizeStore.addRule(rule);
		saveConfig();
	}

	function updateRule(id: string, updates: Partial<AutoOrganizeRule>) {
		autoOrganizeStore.updateRule(id, updates);
		saveConfigDebounced();
	}

	function removeRule(id: string) {
		autoOrganizeStore.removeRule(id);
		saveConfig();
	}

	function moveRuleUp(id: string) {
		const rules = [...autoOrganizeStore.rules];
		const idx = rules.findIndex((r) => r.id === id);
		if (idx <= 0) return;
		[rules[idx - 1], rules[idx]] = [rules[idx], rules[idx - 1]];
		autoOrganizeStore.reorderRules(rules);
		saveConfig();
	}

	function moveRuleDown(id: string) {
		const rules = [...autoOrganizeStore.rules];
		const idx = rules.findIndex((r) => r.id === id);
		if (idx < 0 || idx >= rules.length - 1) return;
		[rules[idx], rules[idx + 1]] = [rules[idx + 1], rules[idx]];
		autoOrganizeStore.reorderRules(rules);
		saveConfig();
	}

	function addExcludedFolder() {
		const folder = newExcludedFolder.trim();
		if (!folder) return;
		if (autoOrganizeStore.excludedFolders.includes(folder)) return;
		autoOrganizeStore.setExcludedFolders([...autoOrganizeStore.excludedFolders, folder]);
		newExcludedFolder = '';
		saveConfig();
	}

	function removeExcludedFolder(folder: string) {
		autoOrganizeStore.setExcludedFolders(
			autoOrganizeStore.excludedFolders.filter((f) => f !== folder),
		);
		saveConfig();
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Auto Organize</h2>

	<SettingItem
		label="Enable Auto Organize"
		description="Automatically move notes to folders based on rules when saved"
	>
		<Switch
			checked={settingsStore.autoOrganize.enabled}
			onCheckedChange={(enabled) => {
				settingsStore.updateAutoOrganize({ enabled });
				toggleAutoOrganizeHook(enabled);
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
			value={String(settingsStore.autoOrganize.debounceMs / 1000)}
			oninput={(e) => {
				const seconds = Number((e.currentTarget as HTMLInputElement).value);
				const ms = clampDebounce(Math.round(seconds * 1000));
				settingsStore.updateAutoOrganize({ debounceMs: ms });
			}}
		/>
	</SettingItem>

	<!-- Rules section -->
	<div class="mt-6 flex items-center justify-between">
		<h3 class="section-label">Rules</h3>
		<Button variant="outline" size="sm" onclick={addRule}>
			<PlusIcon class="size-3.5" />
			Add rule
		</Button>
	</div>

	<p class="text-meta text-muted-foreground">
		Rules are evaluated top-to-bottom. The first matching rule determines the destination folder.
		Expressions use the same syntax as Collection filters (e.g. <code class="rounded-xs bg-muted px-1">file.hasTag('archive')</code>).
	</p>

	{#if autoOrganizeStore.rules.length === 0}
		<div class="rounded-lg border border-dashed border-border p-6 text-center text-meta text-muted-foreground">
			No rules configured. Click "Add rule" to create one.
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			{#each autoOrganizeStore.rules as rule, i (rule.id)}
				<AutoOrganizeRuleRow
					{rule}
					isFirst={i === 0}
					isLast={i === autoOrganizeStore.rules.length - 1}
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
		<h3 class="section-label mb-2">Excluded folders</h3>
		<p class="mb-3 text-meta text-muted-foreground">
			Notes inside these folders will never be automatically moved.
		</p>

		<div class="flex gap-2 mb-2">
			<Input
				class="flex-1"
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

		{#if autoOrganizeStore.excludedFolders.length > 0}
			<div class="flex flex-wrap gap-1.5">
				{#each autoOrganizeStore.excludedFolders as folder}
					<span class="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-label">
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
