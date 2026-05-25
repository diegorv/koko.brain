<script lang="ts">
	import { untrack } from 'svelte';
	import Plus from 'lucide-svelte/icons/plus';
	import FileText from 'lucide-svelte/icons/file-text';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import Blocks from 'lucide-svelte/icons/blocks';
	import { Separator } from '$lib/components/ui/separator';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
	import { flattenFileTree } from '$lib/features/quick-switcher/quick-switcher.logic';
	import { resolveWikilink } from '$lib/features/backlinks/backlinks.logic';
	import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
	import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
	import { getIconSync } from '$lib/features/file-icons/file-icons.icon-data';
	import IconRenderer from '$lib/features/file-icons/IconRenderer.svelte';
	import { propertiesStore } from './properties.store.svelte';
	import {
		updateProperty,
		renameProperty,
		removePropertyByKey,
		addNewProperty,
		parseAndSetProperties,
		consumeSkipNextParse,
	} from './properties.service';
	import type { PropertyType } from './properties.types';
	import PropertyField from './PropertyField.svelte';
	import LifecycleActions from './LifecycleActions.svelte';

	let newKeyInput = $state('');
	let isAddingProperty = $state(false);
	let addInputRef = $state<HTMLInputElement | null>(null);

	// Focus the add-property input when it appears
	$effect(() => {
		if (addInputRef) addInputRef.focus();
	});

	const LIFECYCLE_KEYS = new Set(['_favorite', '_organized', '_archived']);
	interface RelationshipGroup {
		label: string;
		links: { display: string; resolvedPath: string | null }[];
	}

	function extractWikilinks(value: unknown): string[] {
		const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
		const targets: string[] = [];
		const re = /\[\[([^\]]+)\]\]/g;
		for (const m of text.matchAll(re)) targets.push(m[1]);
		return targets;
	}

	function formatLabel(key: string): string {
		return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	let relationshipGroups = $derived.by(() => {
		const allPaths = flattenFileTree(fsStore.fileTree).map((f) => f.path);
		const groups: RelationshipGroup[] = [];
		for (const p of propertiesStore.properties) {
			if (LIFECYCLE_KEYS.has(p.key)) continue;
			const targets = extractWikilinks(p.value);
			if (targets.length === 0) continue;
			groups.push({
				label: formatLabel(p.key),
				links: targets.map((t) => {
					const display = t.includes('|') ? t.split('|')[1] : t;
					const target = t.includes('|') ? t.split('|')[0] : t;
					return { display, resolvedPath: resolveWikilink(target, allPaths) };
				}),
			});
		}
		return groups;
	});

	let relationshipKeys = $derived.by(() => {
		const keys = new Set<string>();
		for (const p of propertiesStore.properties) {
			if (!LIFECYCLE_KEYS.has(p.key) && extractWikilinks(p.value).length > 0) keys.add(p.key);
		}
		return keys;
	});

	let typeProperty = $derived(propertiesStore.properties.find((p) => p.key === 'type'));
	let typeMetadata = $derived(typeProperty ? typeDefinitionsStore.getTypeMetadata(String(typeProperty.value)) : undefined);
	let availableTypes = $derived(typeDefinitionsStore.sortedTypes);

	let typeDefPaths = $derived.by(() => {
		const map = new Map<string, string>();
		for (const entry of typeDefinitionsStore.entries) {
			if (entry.isA === 'Type') map.set(entry.title, entry.path);
		}
		return map;
	});

	function getTypeIcon(typeName: string) {
		const defPath = typeDefPaths.get(typeName);
		if (!defPath) return undefined;
		const fmRef = fileIconsStore.getFrontmatterIcon(defPath);
		if (!fmRef) return undefined;
		const icon = getIconSync(fmRef.iconPack, fmRef.iconName);
		return icon ? { icon, color: fmRef.color } : undefined;
	}

	/** Properties sorted alphabetically, excluding lifecycle + relationship + type keys */
	let sortedProperties = $derived(
		[...propertiesStore.properties]
			.filter((p) => !LIFECYCLE_KEYS.has(p.key) && !relationshipKeys.has(p.key) && p.key !== 'type')
			.sort((a, b) => a.key.localeCompare(b.key))
	);

	// Re-parse properties when active tab content changes (debounced)
	$effect(() => {
		const _path = editorStore.activeTabPath;
		const content = editorStore.activeTab?.content ?? '';

		const timer = setTimeout(() => {
			untrack(() => {
				if (consumeSkipNextParse()) return;
				parseAndSetProperties(content);
			});
		}, 300);

		return () => clearTimeout(timer);
	});

	function handleUpdate(
		key: string,
		value: string | number | boolean | string[],
		type?: PropertyType,
	) {
		updateProperty(key, value, type);
	}

	function handleRename(oldKey: string, newKey: string) {
		renameProperty(oldKey, newKey);
	}

	function handleRemove(key: string) {
		removePropertyByKey(key);
	}

	function handleAddProperty() {
		if (addNewProperty(newKeyInput)) {
			newKeyInput = '';
			isAddingProperty = false;
		}
	}

	function handleAddKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleAddProperty();
		} else if (e.key === 'Escape') {
			isAddingProperty = false;
			newKeyInput = '';
		}
	}
</script>

<div class="flex flex-col">
	<div class="flex items-center h-10 px-3 shrink-0">
		<h2 class="font-semibold uppercase tracking-wide text-primary">
			Properties
		</h2>
		{#if editorStore.activeTab && (!editorStore.activeTab.fileType || editorStore.activeTab.fileType === 'markdown')}
			<button
				class="ml-auto p-1 rounded-md hover:bg-accent transition-colors cursor-pointer"
				onclick={() => (isAddingProperty = !isAddingProperty)}
				title="Add property"
			>
				<Plus class="size-3.5 text-muted-foreground" />
			</button>
		{/if}
	</div>
	<Separator />
	{#if editorStore.activeTab && (!editorStore.activeTab.fileType || editorStore.activeTab.fileType === 'markdown')}
		<LifecycleActions />
		<Separator />
	{/if}
	<div class="max-h-[50vh] overflow-y-auto p-2">
		{#if !editorStore.activeTab}
			<p class="text-muted-foreground px-2 py-4 text-center">No file open</p>
		{:else if editorStore.activeTab.fileType && editorStore.activeTab.fileType !== 'markdown'}
			<p class="text-muted-foreground px-2 py-4 text-center">
				Not available
			</p>
		{:else}
			<!-- Type selector -->
			{#if typeProperty}
				<div class="group flex flex-col gap-1 rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors">
					<div class="flex items-center gap-2 min-h-7">
						<Blocks class="size-3.5 shrink-0 text-tab-text-inactive" />
						<span class="flex-[2] min-w-0 text-[14px] font-medium px-1 truncate text-muted-foreground">type</span>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									{@const selectedTypeIcon = getTypeIcon(String(typeProperty.value))}
								<button
										{...props}
										class="flex h-6 flex-[3] min-w-0 items-center gap-1.5 rounded-md bg-input-bg px-2.5 text-[14px] font-medium text-foreground/70 transition-colors cursor-pointer hover:bg-accent"
									>
										{#if selectedTypeIcon}
											<IconRenderer icon={selectedTypeIcon.icon} class="size-3.5 shrink-0" color={selectedTypeIcon.color} />
										{/if}
										<span class="truncate">{String(typeProperty.value) || '--'}</span>
										<ChevronDown class="size-3 opacity-60 ml-auto shrink-0" />
									</button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="start" class="w-48">
								{#each availableTypes as t (t.name)}
									{@const tIcon = getTypeIcon(t.name)}
									<DropdownMenu.Item
										onclick={() => handleUpdate('type', t.name)}
									>
										{#if tIcon}
											<IconRenderer icon={tIcon.icon} class="size-4 shrink-0" color={tIcon.color} />
										{/if}
										<span>{t.name}</span>
										{#if String(typeProperty.value) === t.name}
											<span class="ml-auto text-xs text-muted-foreground">&#10003;</span>
										{/if}
									</DropdownMenu.Item>
								{/each}
							</DropdownMenu.Content>
						</DropdownMenu.Root>
						<span class="p-0.5 shrink-0 w-[16px]"></span>
					</div>
				</div>
			{/if}

			{#if propertiesStore.properties.length > 0}
				<div class="flex flex-col">
					{#each sortedProperties as property (property.key)}
						<PropertyField
							{property}
							onUpdate={handleUpdate}
							onRename={handleRename}
							onRemove={handleRemove}
						/>
					{/each}
				</div>
			{/if}

			<!-- Add property row -->
			{#if isAddingProperty}
				<div class="flex items-center gap-1.5 mt-1 px-2 py-1">
					<Plus class="size-3.5 shrink-0 text-muted-foreground/60" />
					<input
						bind:this={addInputRef}
						class="flex-1 h-6 text-[14px] bg-transparent border border-input rounded px-1.5 outline-none focus:border-ring"
						bind:value={newKeyInput}
						onkeydown={handleAddKeydown}
						placeholder="Property name..."
					/>
				</div>
			{:else}
				<button
					class="flex items-center gap-1.5 w-full mt-1 px-2 py-1.5 rounded-md text-tab-text-inactive/60 hover:text-tab-text-inactive hover:bg-accent/50 transition-colors cursor-pointer"
					onclick={() => (isAddingProperty = true)}
				>
					<Plus class="size-3.5" />
					Add property
				</button>
			{/if}

			<!-- Relationships section -->
			{#if relationshipGroups.length > 0}
				<Separator class="my-2" />
				<h2 class="font-semibold uppercase tracking-wide text-primary px-2 mb-1">Relationships</h2>
				<div>
					{#each relationshipGroups as group (group.label)}
						<div class="px-2 py-1">
							<span class="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">{group.label}</span>
							<div class="mt-1 space-y-0.5">
								{#each group.links as link (link.display)}
									{#if link.resolvedPath}
										<button
											class="flex items-center gap-1.5 w-full px-1 py-0.5 rounded-md text-[14px] hover:bg-accent transition-colors cursor-pointer text-left"
											onclick={() => openFileInEditor(link.resolvedPath!)}
										>
											<FileText class="size-3.5 shrink-0 text-muted-foreground" />
											<span class="truncate">{link.display}</span>
										</button>
									{:else}
										<div class="flex items-center gap-1.5 px-1 py-0.5 text-[14px] opacity-50">
											<FileText class="size-3.5 shrink-0" />
											<span class="truncate">{link.display}</span>
										</div>
									{/if}
								{/each}
							</div>
						</div>
					{/each}
				</div>
				<Separator class="mt-2" />
			{/if}
		{/if}
	</div>
</div>
