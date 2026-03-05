<script lang="ts">
	import { untrack } from 'svelte';
	import { Plus } from 'lucide-svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
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

	let newKeyInput = $state('');
	let isAddingProperty = $state(false);
	let addInputRef = $state<HTMLInputElement | null>(null);

	// Focus the add-property input when it appears
	$effect(() => {
		if (addInputRef) addInputRef.focus();
	});

	/** Properties sorted alphabetically by key for display */
	let sortedProperties = $derived(
		[...propertiesStore.properties].sort((a, b) => a.key.localeCompare(b.key))
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
	<div class="max-h-[50vh] overflow-y-auto p-2">
		{#if !editorStore.activeTab}
			<p class="text-muted-foreground px-2 py-4 text-center">No file open</p>
		{:else if editorStore.activeTab.fileType && editorStore.activeTab.fileType !== 'markdown'}
			<p class="text-muted-foreground px-2 py-4 text-center">
				Not available
			</p>
		{:else}
			{#if propertiesStore.properties.length > 0}
				<div class="divide-y divide-divider/60">
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

			<!-- Add property row (always visible for markdown files) -->
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
		{/if}
	</div>
</div>
