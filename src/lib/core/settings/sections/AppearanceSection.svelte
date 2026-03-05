<script lang="ts">
	import { settingsStore } from '../settings.store.svelte';
	import { applyActiveTheme } from '../theme.service';
	import { DEFAULT_THEME_NAME, KOKOBRAIN_DEFAULT_THEME } from '../theme.logic';
	import type { Theme } from '../theme.types';
	import ThemeEditor from './ThemeEditor.svelte';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import PlusIcon from '@lucide/svelte/icons/plus';

	let { onchange }: { onchange: () => void } = $props();

	let editorOpen = $state(false);
	let editingTheme = $state.raw<Theme | null>(null);
	let isNewTheme = $state(false);

	function selectTheme(name: string) {
		settingsStore.updateAppearance({ activeTheme: name });
		applyActiveTheme();
		onchange();
	}

	function deleteTheme(name: string, event: MouseEvent) {
		event.stopPropagation();
		if (name === DEFAULT_THEME_NAME) return;

		const themes = settingsStore.appearance.themes.filter((t) => t.name !== name);
		const activeTheme = settingsStore.appearance.activeTheme === name
			? DEFAULT_THEME_NAME
			: settingsStore.appearance.activeTheme;

		settingsStore.updateAppearance({ themes, activeTheme });
		applyActiveTheme();
		onchange();
	}

	function handleCreateNew() {
		editingTheme = { name: '', colors: structuredClone(KOKOBRAIN_DEFAULT_THEME.colors) };
		isNewTheme = true;
		editorOpen = true;
	}

	function handleEdit(theme: Theme, event: MouseEvent) {
		event.stopPropagation();
		editingTheme = $state.snapshot(theme) as Theme;
		isNewTheme = false;
		editorOpen = true;
	}

	function handleDuplicate(theme: Theme, event: MouseEvent) {
		event.stopPropagation();
		const snapshot = $state.snapshot(theme) as Theme;
		editingTheme = { name: snapshot.name + ' Copy', colors: snapshot.colors };
		isNewTheme = true;
		editorOpen = true;
	}

	function handleEditorSave(savedTheme: Theme) {
		const themes = settingsStore.appearance.themes;
		if (isNewTheme) {
			settingsStore.updateAppearance({ themes: [...themes, savedTheme] });
		} else {
			const updated = themes.map((t) => (t.name === editingTheme!.name ? savedTheme : t));
			settingsStore.updateAppearance({ themes: updated });
		}
		settingsStore.updateAppearance({ activeTheme: savedTheme.name });
		applyActiveTheme();
		onchange();
		editorOpen = false;
		editingTheme = null;
	}

	function handleEditorCancel() {
		applyActiveTheme();
		editorOpen = false;
		editingTheme = null;
	}
</script>

{#if editorOpen && editingTheme}
	<ThemeEditor
		theme={editingTheme}
		isNew={isNewTheme}
		existingNames={settingsStore.appearance.themes
			.filter((t) => isNewTheme || t.name !== editingTheme?.name)
			.map((t) => t.name)}
		onSave={handleEditorSave}
		onCancel={handleEditorCancel}
	/>
{:else}
	<div class="flex flex-col gap-2">
		<h2 class="mb-4 text-lg font-semibold">Appearance</h2>

		<p class="mb-4 text-sm text-muted-foreground">
			Select a color theme, or create your own with the theme editor.
		</p>

		<div class="flex flex-col gap-3">
			{#each settingsStore.appearance.themes as theme}
				{@const isActive = theme.name === settingsStore.appearance.activeTheme}
				{@const isDefault = theme.name === DEFAULT_THEME_NAME}
				{@const ui = theme.colors.ui}
				{@const syntax = theme.colors.syntax}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="group flex items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors bg-setting-item-bg hover:bg-settings-hover-bg cursor-pointer {isActive ? 'ring-2 ring-primary' : ''}"
					onclick={() => selectTheme(theme.name)}
					role="button"
					tabindex="0"
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectTheme(theme.name); }}
				>
					<!-- Mini app preview -->
					<div
						class="w-36 h-20 rounded-md overflow-hidden border border-border shrink-0 flex flex-col"
						style="background-color: {ui.background}"
					>
						<!-- Tab bar -->
						<div class="flex items-center gap-1 px-1.5" style="background-color: {ui.tabBar}; height: 14px;">
							<span class="rounded-t-sm px-1" style="background-color: {ui.card}; font-size: 5px; color: {ui.foreground}; line-height: 10px;">file.md</span>
							<span class="rounded-t-sm px-1 opacity-50" style="font-size: 5px; color: {ui.foreground}; line-height: 10px;">other.md</span>
						</div>
						<!-- Content area -->
						<div class="flex flex-1 min-h-0">
							<!-- Sidebar -->
							<div class="flex flex-col gap-0.5 px-1 py-1" style="width: 36px; background-color: {ui.background}; border-right: 1px solid {ui.divider};">
								<span style="height: 3px; width: 70%; border-radius: 1px; background-color: {ui.foreground}; opacity: 0.4;"></span>
								<span style="height: 3px; width: 55%; border-radius: 1px; background-color: {ui.foreground}; opacity: 0.3;"></span>
								<span style="height: 3px; width: 80%; border-radius: 1px; background-color: {ui.primary}; opacity: 0.6;"></span>
								<span style="height: 3px; width: 50%; border-radius: 1px; background-color: {ui.foreground}; opacity: 0.3;"></span>
							</div>
							<!-- Editor -->
							<div class="flex flex-col gap-1 px-2 py-1.5 flex-1 min-w-0" style="background-color: {ui.card};">
								<span style="height: 4px; width: 60%; border-radius: 1px; background-color: {syntax.heading1};"></span>
								<span style="height: 3px; width: 85%; border-radius: 1px; background-color: {ui.foreground}; opacity: 0.3;"></span>
								<span style="height: 3px; width: 70%; border-radius: 1px; background-color: {ui.foreground}; opacity: 0.25;"></span>
								<span style="height: 4px; width: 45%; border-radius: 1px; background-color: {syntax.heading2};"></span>
								<span style="height: 3px; width: 75%; border-radius: 1px; background-color: {ui.foreground}; opacity: 0.3;"></span>
							</div>
						</div>
					</div>

					<!-- Theme name + status -->
					<div class="flex flex-1 flex-col gap-1.5">
						<span class="text-sm font-medium text-settings-text">{theme.name}</span>
						{#if isActive}
							<span class="text-xs text-primary">Active</span>
						{/if}
					</div>

					<!-- Action buttons (visible on hover) -->
					<div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
						{#if !isDefault}
							<button
								class="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-settings-text"
								onclick={(e) => handleEdit(theme, e)}
								title="Edit theme"
							>
								<PencilIcon class="size-3.5" />
							</button>
						{/if}
						<button
							class="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-settings-text"
							onclick={(e) => handleDuplicate(theme, e)}
							title="Duplicate theme"
						>
							<CopyIcon class="size-3.5" />
						</button>
					</div>

					{#if isActive}
						<CheckIcon class="size-5 text-primary shrink-0" />
					{/if}
					{#if !isDefault}
						<button
							class="size-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
							onclick={(e) => deleteTheme(theme.name, e)}
							title="Delete theme"
						>
							<XIcon class="size-4" />
						</button>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Create new theme button -->
		<button
			class="mt-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-settings-text"
			onclick={handleCreateNew}
		>
			<PlusIcon class="size-4" />
			Create New Theme
		</button>
	</div>
{/if}
