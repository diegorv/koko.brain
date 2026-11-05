<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import { debug } from '#lib/utils/debug.js';
	import { settingsStore } from '../settings.store.svelte';
	import { applyActiveTheme } from '../theme.service';
	import { DEFAULT_THEME_NAME, KOKOBRAIN_DEFAULT_THEME, isBuiltinTheme } from '../theme.logic';
	import {
		buildThemeFromPackage,
		catalogEntryState,
		installThemePackage,
		isInstalledTheme,
		sortCatalogEntries,
		sortThemesForDisplay,
		uninstallTheme,
		updateThemePackage,
		type CatalogEntry,
		type ThemePackage,
	} from '../theme-package.logic';
	import { fetchThemeCatalog } from '../theme-catalog.service';
	import type { Theme } from '../theme.types';
	import ThemeEditor from './ThemeEditor.svelte';
	import ThemePreview from './ThemePreview.svelte';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import PlusIcon from '@lucide/svelte/icons/plus';

	let editorOpen = $state(false);
	let editingTheme = $state.raw<Theme | null>(null);
	let isNewTheme = $state(false);

	/** Online catalog load state; fetched once each time the section opens. */
	let catalogStatus = $state<'loading' | 'ready' | 'error'>('loading');
	/** Entries of the last catalog load that passed validation, sorted by name. */
	let catalogEntries = $state.raw<CatalogEntry[]>([]);
	/** Built theme of every catalog package, for the mini previews. */
	const catalogPreviews = $derived(
		new Map(catalogEntries.flatMap((e) => (e.kind === 'package' ? [[e.pkg.id, buildThemeFromPackage(e.pkg)] as const] : []))),
	);

	async function loadCatalog() {
		catalogStatus = 'loading';
		try {
			catalogEntries = sortCatalogEntries(await fetchThemeCatalog());
			catalogStatus = 'ready';
		} catch (err) {
			debug('THEME-CATALOG', 'Failed to load the theme catalog:', err);
			catalogStatus = 'error';
			toast.error(`Could not load the theme catalog: ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	onMount(() => {
		void loadCatalog();
	});

	function installTheme(pkg: ThemePackage) {
		const result = installThemePackage(settingsStore.appearance, pkg);
		if (!result.ok) {
			toast.error(result.error);
			return;
		}
		settingsStore.updateAppearance(result.appearance);
		toast.success(`Installed "${pkg.name}"`);
	}

	function updateTheme(pkg: ThemePackage) {
		const result = updateThemePackage(settingsStore.appearance, pkg);
		if (!result.ok) {
			toast.error(result.error);
			return;
		}
		settingsStore.updateAppearance(result.appearance);
		applyActiveTheme();
		toast.success(`Updated "${pkg.name}" to ${pkg.version}`);
	}

	function handleUninstall(name: string, event: MouseEvent) {
		event.stopPropagation();
		settingsStore.updateAppearance(uninstallTheme(settingsStore.appearance, name));
		applyActiveTheme();
	}

	function selectTheme(name: string) {
		settingsStore.updateAppearance({ activeTheme: name });
		applyActiveTheme();
	}

	function deleteTheme(name: string, event: MouseEvent) {
		event.stopPropagation();
		if (isBuiltinTheme(name)) return;

		const themes = settingsStore.appearance.themes.filter((t) => t.name !== name);
		const activeTheme = settingsStore.appearance.activeTheme === name
			? DEFAULT_THEME_NAME
			: settingsStore.appearance.activeTheme;

		settingsStore.updateAppearance({ themes, activeTheme });
		applyActiveTheme();
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
		editorOpen = false;
		editingTheme = null;
	}

	function handleEditorCancel() {
		applyActiveTheme();
		editorOpen = false;
		editingTheme = null;
	}
</script>

<!-- The title stays while the theme editor replaces the list below it. -->
<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Appearance</h2>

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
		<p class="mb-4 text-sm text-muted-foreground">
			Select a color theme, or create your own with the theme editor.
		</p>

		<div class="flex flex-col gap-3">
			{#each sortThemesForDisplay(settingsStore.appearance.themes) as theme}
				{@const isActive = theme.name === settingsStore.appearance.activeTheme}
				{@const isBuiltin = isBuiltinTheme(theme.name)}
				{@const isInstalled = isInstalledTheme(settingsStore.appearance, theme.name)}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="group flex items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors bg-setting-item-bg hover:bg-settings-hover-bg cursor-pointer {isActive ? 'ring-2 ring-primary' : ''}"
					onclick={() => selectTheme(theme.name)}
					role="button"
					tabindex="0"
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectTheme(theme.name); }}
				>
					<ThemePreview colors={theme.colors} />

					<!-- Theme name + status -->
					<div class="flex flex-1 flex-col gap-1.5">
						<span class="text-row font-medium text-settings-text">{theme.name}</span>
						{#if isActive}
							<span class="text-meta text-primary">Active</span>
						{/if}
					</div>

					<!-- Action buttons (visible on hover or keyboard focus) -->
					<div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
						{#if !isBuiltin && !isInstalled}
							<Button
								variant="ghost"
								size="icon"
								class="size-7 text-muted-foreground"
								onclick={(e) => handleEdit(theme, e)}
								title="Edit theme"
							>
								<PencilIcon class="size-3.5" />
							</Button>
						{/if}
						<Button
							variant="ghost"
							size="icon"
							class="size-7 text-muted-foreground"
							onclick={(e) => handleDuplicate(theme, e)}
							title="Duplicate theme"
						>
							<CopyIcon class="size-3.5" />
						</Button>
					</div>

					{#if isActive}
						<CheckIcon class="size-5 text-primary shrink-0" />
					{/if}
					{#if isInstalled}
						<Button
							variant="ghost"
							size="icon"
							class="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/10"
							onclick={(e) => handleUninstall(theme.name, e)}
							title="Uninstall theme"
						>
							<XIcon class="size-3.5" />
						</Button>
					{:else if !isBuiltin}
						<Button
							variant="ghost"
							size="icon"
							class="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/10"
							onclick={(e) => deleteTheme(theme.name, e)}
							title="Delete theme"
						>
							<XIcon class="size-3.5" />
						</Button>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Create new theme button -->
		<Button variant="outline" class="mt-2 w-full border-dashed" onclick={handleCreateNew}>
			<PlusIcon class="size-4" />
			Create New Theme
		</Button>

		<!-- Online catalog (diegorv/koko.brain-themes) -->
		<section class="mt-8 flex flex-col gap-3" data-testid="theme-catalog">
			<h3 class="section-label">Theme catalog</h3>
			<p class="text-meta text-muted-foreground">
				Themes published online. An installed theme works offline; duplicate it to customize it.
			</p>

			{#if catalogStatus === 'loading'}
				<p class="text-meta text-muted-foreground">Loading the theme catalog...</p>
			{:else if catalogStatus === 'error'}
				<div class="flex items-center gap-3 rounded-lg px-4 py-3 bg-setting-item-bg" data-testid="theme-catalog-error">
					<span class="flex-1 text-meta text-destructive">
						Could not load the theme catalog. Your installed and built-in themes still work.
					</span>
					<Button variant="outline" size="sm" onclick={() => loadCatalog()}>
						Retry
					</Button>
				</div>
			{:else}
				{#each catalogEntries as entry (entry.kind === 'package' ? entry.pkg.id : entry.info.id)}
					{@const info = entry.kind === 'package' ? entry.pkg : entry.info}
					{@const entryState = catalogEntryState(entry, settingsStore.appearance)}
					{@const preview = catalogPreviews.get(info.id)}
					<div class="flex items-center gap-4 rounded-lg px-4 py-3 bg-setting-item-bg" data-testid="catalog-entry">
						{#if preview}
							<ThemePreview colors={preview.colors} />
						{:else}
							<div class="w-36 h-20 rounded-md border border-dashed border-border shrink-0"></div>
						{/if}
						<div class="flex flex-1 flex-col gap-0.5">
							<span class="text-row font-medium text-settings-text">{info.name}</span>
							<span class="text-meta text-muted-foreground">
								{#if info.author}by {info.author} · {/if}v{info.version}
							</span>
						</div>
						{#if entryState === 'install' && entry.kind === 'package'}
							<Button size="sm" onclick={() => installTheme(entry.pkg)}>
								Install
							</Button>
						{:else if entryState === 'update' && entry.kind === 'package'}
							<Button size="sm" onclick={() => updateTheme(entry.pkg)}>
								Update to {entry.pkg.version}
							</Button>
						{:else if entryState === 'installed'}
							<span class="text-meta text-primary">Installed</span>
						{:else}
							<span class="text-meta text-muted-foreground">Requires a newer KokoBrain</span>
						{/if}
					</div>
				{:else}
					<p class="text-meta text-muted-foreground">The theme catalog is empty.</p>
				{/each}
			{/if}
		</section>
	{/if}
</div>
