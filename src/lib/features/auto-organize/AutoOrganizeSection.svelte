<script lang="ts">
	import { onDestroy } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import XIcon from '@lucide/svelte/icons/x';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
	import { collectAllDirPaths, getRelativePath } from '#lib/core/filesystem/fs.logic.js';
	import SettingItem from '#lib/core/settings/sections/SettingItem.svelte';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import AutoOrganizeRuleRow from './AutoOrganizeRuleRow.svelte';
	import { autoOrganizeStore } from './auto-organize.store.svelte';
	import { saveAutoOrganizeConfig, toggleAutoOrganizeHook } from './auto-organize.service';
	import { generateRuleId, isDuplicateExcluded, isExcludedFolderMissing } from './auto-organize.logic';
	import type { AutoOrganizeRule } from './auto-organize.types';
	import { error } from '#lib/utils/debug.js';
	import { clamp } from '#lib/utils/clamp.js';

	/** Folder input for adding excluded folders */
	let newExcludedFolder = $state('');

	/** Live notice under the folder input, set when the typed folder is already excluded */
	let excludedNotice = $state('');

	/** Types whose `archiveTo` sets an archive folder; their rules only run while Auto Organize is on */
	let archiveTypeCount = $derived(
		[...typeDefinitionsStore.typeMetadataMap.values()].filter((t) => t.archiveTo).length,
	);

	/** Vault-relative paths of every folder in the loaded tree, in tree order; empty without a vault */
	let vaultFolders = $derived.by(() => {
		const vaultPath = vaultStore.path;
		if (!vaultPath) return [];
		return [...collectAllDirPaths(fsStore.fileTree)].map((p) => getRelativePath(vaultPath, p));
	});

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
			saveAutoOrganizeConfig(vaultStore.path).catch((err) => {
				error('AUTO-ORGANIZE', 'Failed to save config:', err);
				// A fixed id replaces the toast instead of stacking one per failed save.
				toast.error('Could not save auto-organize rules', { id: 'auto-organize-save' });
			});
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
		if (isDuplicateExcluded(autoOrganizeStore.excludedFolders, folder)) {
			excludedNotice = 'Already excluded';
			return;
		}
		autoOrganizeStore.setExcludedFolders([...autoOrganizeStore.excludedFolders, folder]);
		newExcludedFolder = '';
		excludedNotice = '';
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
		description="After a save, applies the rules below and the archive rules of your types: notes are moved, renamed or updated automatically."
	>
		<Switch
			aria-label="Enable Auto Organize"
			checked={settingsStore.autoOrganize.enabled}
			onCheckedChange={(enabled) => {
				settingsStore.updateAutoOrganize({ enabled });
				toggleAutoOrganizeHook(enabled);
			}}
		/>
	</SettingItem>

	{#if !settingsStore.autoOrganize.enabled && archiveTypeCount > 0}
		<p class="px-4 text-meta text-muted-foreground">
			{archiveTypeCount} of your types set an archive folder. While Auto Organize is off, Archive marks a note as archived but does not move it.
		</p>
	{/if}

	<SettingItem
		label="Debounce delay"
		description="Seconds to wait after save before evaluating rules (0.5–30)"
	>
		<Input
			type="number"
			aria-label="Debounce delay"
			class="w-24"
			min={0.5}
			max={30}
			step={0.5}
			value={String(settingsStore.autoOrganize.debounceMs / 1000)}
			oninput={(e) => {
				// Writes only an in-range value, so clearing the field or typing the
				// first digit of 30 does not snap it; a NaN fails the equality too.
				const raw = (e.currentTarget as HTMLInputElement).value;
				const ms = Math.round(Number(raw) * 1000);
				if (raw.trim() !== '' && clampDebounce(ms) === ms) {
					settingsStore.updateAutoOrganize({ debounceMs: ms });
				}
			}}
			onchange={(e) => {
				const input = e.currentTarget as HTMLInputElement;
				const seconds = Number(input.value);
				if (input.value.trim() !== '' && Number.isFinite(seconds)) {
					settingsStore.updateAutoOrganize({ debounceMs: clampDebounce(Math.round(seconds * 1000)) });
				}
				// Svelte skips the DOM write when the bound value did not change.
				input.value = String(settingsStore.autoOrganize.debounceMs / 1000);
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
		Rules run top to bottom after a save. The first matching rule wins for rename, move to folder and run mod action.
		Set properties and create note apply from every matching rule. Your types' archive rules run last.
		Conditions use the same syntax as Collection filters (e.g. <code class="rounded-xs bg-muted px-1">file.hasTag('archive')</code>).
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
			Rules never run on notes inside these folders.
		</p>

		<div class="flex gap-2 mb-2">
			<Input
				class="flex-1"
				aria-label="Folder to exclude"
				placeholder="e.g. _templates"
				list="auto-organize-excluded-folders"
				bind:value={newExcludedFolder}
				oninput={() => (excludedNotice = '')}
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
		<datalist id="auto-organize-excluded-folders">
			{#each vaultFolders as folder (folder)}
				<option value={folder}></option>
			{/each}
		</datalist>
		<p class="text-meta text-muted-foreground" aria-live="polite">{excludedNotice}</p>

		{#if autoOrganizeStore.excludedFolders.length > 0}
			<div class="flex flex-wrap gap-1.5">
				{#each autoOrganizeStore.excludedFolders as folder}
					<span class="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-label" data-excluded-folder>
						{folder}
						{#if isExcludedFolderMissing(folder, vaultFolders)}
							<span class="text-muted-foreground">missing</span>
						{/if}
						<button
							class="text-muted-foreground hover:text-foreground transition-colors"
							aria-label="Remove {folder} from excluded folders"
							onclick={() => removeExcludedFolder(folder)}
						>
							<XIcon class="size-3" />
						</button>
					</span>
				{/each}
			</div>
		{:else}
			<p class="text-meta text-muted-foreground">No excluded folders</p>
		{/if}
	</div>
</div>
