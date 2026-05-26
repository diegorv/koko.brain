<script lang="ts">
	import { untrack } from 'svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import FileText from '@lucide/svelte/icons/file-text';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Blocks from '@lucide/svelte/icons/blocks';
	import { Separator } from '$lib/components/ui/separator';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
	import { flattenFileTree } from '$lib/features/quick-switcher/quick-switcher.logic';
	import { resolveWikilink } from '$lib/features/backlinks/backlinks.logic';
	import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
	import { resolveIconForPath, resolveIconForType } from '$lib/features/file-icons/icon-resolver';
	import IconRenderer from '$lib/features/file-icons/IconRenderer.svelte';
	import { propertiesStore } from './properties.store.svelte';
	import {
		updateProperty,
		renameProperty,
		removePropertyByKey,
		addNewProperty,
		upsertProperty,
		parseAndSetProperties,
		consumeSkipNextParse,
	} from './properties.service';
	import {
		resolveRelationshipLinks,
		computeAddRelationshipValue,
		computeRemoveRelationshipValue,
		type ResolvedLink,
	} from './properties.logic';
	import type { PropertyType } from './properties.types';
	import X from '@lucide/svelte/icons/x';
	import PropertyField from './PropertyField.svelte';
	import LifecycleActions from './LifecycleActions.svelte';
	import RelationshipSearch from './RelationshipSearch.svelte';

	let newKeyInput = $state('');
	let isAddingProperty = $state(false);
	let addInputRef = $state<HTMLInputElement | null>(null);

	// Focus the add-property input when it appears
	$effect(() => {
		if (addInputRef) addInputRef.focus();
	});

	const LIFECYCLE_KEYS = new Set(['_favorite', '_organized', '_archived']);
	const FIXED_RELATIONSHIPS: { key: string; label: string }[] = [
		{ key: 'belongs_to', label: 'Belongs To' },
		{ key: 'related_to', label: 'Related To' },
		{ key: 'has', label: 'Has' },
	];
	const RELATIONSHIP_KEYS = new Set(FIXED_RELATIONSHIPS.map((r) => r.key));

	let relLinksMap = $derived.by(() => {
		const allPaths = flattenFileTree(fsStore.fileTree).map((f) => f.path);
		const map = new Map<string, ResolvedLink[]>();
		for (const rel of FIXED_RELATIONSHIPS) {
			const prop = propertiesStore.properties.find((p) => p.key === rel.key);
			map.set(rel.key, prop ? resolveRelationshipLinks(prop.value, allPaths, resolveWikilink) : []);
		}
		return map;
	});

	function addRelationshipLink(key: string, fileName: string) {
		const prop = propertiesStore.properties.find((p) => p.key === key);
		const result = computeAddRelationshipValue(prop?.value, fileName);
		if (result.isNew) {
			upsertProperty(key, result.value);
		} else {
			updateProperty(key, result.value);
		}
	}

	function removeRelationshipLink(key: string, raw: string) {
		const prop = propertiesStore.properties.find((p) => p.key === key);
		if (!prop) return;
		const result = computeRemoveRelationshipValue(prop.value, raw);
		if (result.shouldDelete) {
			removePropertyByKey(key);
		} else {
			updateProperty(key, result.value);
		}
	}

	let typeProperty = $derived(propertiesStore.properties.find((p) => p.key === 'type'));
	let typeMetadata = $derived(typeProperty ? typeDefinitionsStore.getTypeMetadata(String(typeProperty.value)) : undefined);
	let availableTypes = $derived(typeDefinitionsStore.sortedTypes);

	/** Properties sorted alphabetically, excluding lifecycle + relationship + type keys */
	let sortedProperties = $derived(
		[...propertiesStore.properties]
			.filter((p) => !LIFECYCLE_KEYS.has(p.key) && !RELATIONSHIP_KEYS.has(p.key) && p.key !== 'type')
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
	<div class="p-2">
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
									{@const selectedTypeIcon = resolveIconForType(String(typeProperty.value))}
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
									{@const tIcon = resolveIconForType(t.name)}
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
			<Separator class="my-2" />
			<h2 class="font-semibold uppercase tracking-wide text-primary px-2 mb-1">Relationships</h2>
			{#each FIXED_RELATIONSHIPS as rel (rel.key)}
				{@const links = relLinksMap.get(rel.key) ?? []}
				<div class="px-2 py-1">
					<div class="flex items-center gap-1">
						<span class="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">{rel.label}</span>
						<div class="ml-auto">
							<RelationshipSearch onSelect={(name) => addRelationshipLink(rel.key, name)} />
						</div>
					</div>
					{#if links.length > 0}
						<div class="mt-1 space-y-0.5">
							{#each links as link (link.raw)}
								{@const linkResolved = link.resolvedPath ? resolveIconForPath(link.resolvedPath) : undefined}
								<div class="group/rel flex items-center gap-1.5 px-1 py-0.5 rounded-md text-[14px] hover:bg-accent transition-colors">
									{#if link.resolvedPath}
										<button
											class="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer text-left"
											onclick={() => openFileInEditor(link.resolvedPath!)}
										>
											{#if linkResolved}
												<IconRenderer icon={linkResolved.icon} class="size-3.5 shrink-0" color={linkResolved.color} />
											{:else}
												<FileText class="size-3.5 shrink-0 text-muted-foreground" />
											{/if}
											<span class="truncate">{link.display}</span>
										</button>
									{:else}
										<div class="flex items-center gap-1.5 min-w-0 flex-1 opacity-50">
											<FileText class="size-3.5 shrink-0" />
											<span class="truncate">{link.display}</span>
										</div>
									{/if}
									<button
										class="p-0.5 rounded opacity-0 group-hover/rel:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer shrink-0"
										onclick={() => removeRelationshipLink(rel.key, link.raw)}
										title="Remove"
									>
										<X class="size-2.5" />
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
			<Separator class="mt-2" />
		{/if}
	</div>
</div>
