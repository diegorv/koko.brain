<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { applyTheme } from '../theme.service';
	import { mergeThemeWithDefaults } from '../theme.logic';
	import {
		camelCaseToLabel,
		validateThemeName,
		serializeThemeForExport,
		parseThemeFromImport,
		COLOR_GROUP_ORDER,
		COLOR_GROUP_LABELS,
		UI_COLOR_GROUPS,
		SYNTAX_COLOR_GROUPS,
		PREVIEW_COLOR_GROUPS,
		WIKILINK_COLOR_GROUPS,
		CALLOUT_COLOR_GROUPS,
		type ColorGroupKey,
		type ColorSubGroup,
	} from '../theme-editor.logic';
	import type { Theme, ThemeColors } from '../theme.types';
	import { KOKOBRAIN_DEFAULT_THEME } from '../theme.logic';
	import ThemeColorRow from './ThemeColorRow.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import UploadIcon from '@lucide/svelte/icons/upload';

	let {
		theme,
		isNew,
		existingNames,
		onSave,
		onCancel,
	}: {
		theme: Theme;
		isNew: boolean;
		existingNames: string[];
		onSave: (t: Theme) => void;
		onCancel: () => void;
	} = $props();

	let draftName = $state('');
	let draftColors = $state.raw<ThemeColors>(KOKOBRAIN_DEFAULT_THEME.colors);
	let activeGroup = $state<ColorGroupKey>('ui');
	let nameError = $state<string | null>(null);
	let fileInput: HTMLInputElement | null = $state(null);

	/** Initialize draft from the theme prop before first render */
	let _initDone = false;
	$effect.pre(() => {
		if (_initDone) return;
		_initDone = true;
		draftName = theme.name;
		draftColors = structuredClone(theme.colors);
	});

	/** Map of group key → sub-group definitions */
	const GROUP_SUB_GROUPS: Record<ColorGroupKey, ColorSubGroup[]> = {
		ui: UI_COLOR_GROUPS,
		syntax: SYNTAX_COLOR_GROUPS,
		preview: PREVIEW_COLOR_GROUPS,
		wikilink: WIKILINK_COLOR_GROUPS,
		callout: CALLOUT_COLOR_GROUPS,
	};

	/** Apply live preview on every color change */
	function applyDraft() {
		applyTheme({ name: draftName, colors: draftColors });
	}

	/** Update a single color token in the draft */
	function updateColor(group: ColorGroupKey, key: string, value: string) {
		draftColors = {
			...draftColors,
			[group]: { ...draftColors[group], [key]: value },
		};
		applyDraft();
	}

	function handleSave() {
		nameError = validateThemeName(draftName.trim(), existingNames);
		if (nameError) return;
		onSave({ name: draftName.trim(), colors: draftColors });
	}

	function handleExport() {
		const json = serializeThemeForExport({ name: draftName.trim() || 'Untitled', colors: draftColors });
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${(draftName.trim() || 'theme').toLowerCase().replace(/\s+/g, '-')}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function handleImportClick() {
		fileInput?.click();
	}

	function handleFileImport(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = () => {
			const result = parseThemeFromImport(reader.result as string);
			if (!result.ok) {
				nameError = result.error;
				return;
			}
			const parsed = result.theme;
			draftColors = mergeThemeWithDefaults(parsed.colors as Partial<ThemeColors>);
			// Avoid name collision on import
			let importName = parsed.name;
			if (existingNames.includes(importName)) {
				importName = importName + ' (Imported)';
			}
			draftName = importName;
			nameError = null;
			applyDraft();
		};
		reader.readAsText(file);

		// Reset so same file can be re-imported
		if (fileInput) fileInput.value = '';
	}
</script>

<div class="flex flex-col gap-0">
	<!-- Header -->
	<div class="mb-4 flex items-center gap-3">
		<Button variant="ghost" size="icon-sm" class="text-muted-foreground" onclick={onCancel} title="Back to themes" aria-label="Back to themes">
			<ArrowLeftIcon class="size-4" />
		</Button>
		<div class="flex min-w-0 flex-1 flex-col gap-0.5">
			<Input
				type="text"
				class="h-8 font-medium"
				bind:value={draftName}
				oninput={() => (nameError = null)}
				placeholder="Theme name"
			/>
			{#if nameError}
				<span class="text-meta text-destructive">{nameError}</span>
			{/if}
		</div>
		<div class="flex shrink-0 items-center gap-2">
			<Button variant="ghost" size="sm" onclick={onCancel}>Cancel</Button>
			<Button size="sm" onclick={handleSave}>Save</Button>
		</div>
	</div>

	<!-- Import / Export -->
	<div class="mb-4 flex gap-2">
		<Button variant="outline" size="sm" onclick={handleExport}>
			<DownloadIcon class="size-3.5" />
			Export
		</Button>
		<Button variant="outline" size="sm" onclick={handleImportClick}>
			<UploadIcon class="size-3.5" />
			Import
		</Button>
		<input
			type="file"
			accept=".json"
			bind:this={fileInput}
			onchange={handleFileImport}
			class="hidden"
		/>
	</div>

	<!-- Group tabs -->
	<div class="mb-4 flex gap-1 border-b border-border">
		{#each COLOR_GROUP_ORDER as group}
			<button
				class="px-3 py-1.5 text-row transition-colors {activeGroup === group
					? 'border-b-2 border-primary text-settings-text'
					: 'text-muted-foreground hover:text-settings-text'}"
				onclick={() => (activeGroup = group)}
			>
				{COLOR_GROUP_LABELS[group]}
			</button>
		{/each}
	</div>

	<!-- Color rows grouped by sub-group -->
	{#each GROUP_SUB_GROUPS[activeGroup] as subgroup}
		<div class="mb-4">
			<h4 class="section-label mb-1.5">
				{subgroup.label}
			</h4>
			{#each subgroup.keys as key}
				<ThemeColorRow
					label={camelCaseToLabel(key)}
					value={draftColors[activeGroup][key as keyof (typeof draftColors)[typeof activeGroup]]}
					onchange={(v) => updateColor(activeGroup, key, v)}
				/>
			{/each}
		</div>
	{/each}
</div>
