<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import Type from '@lucide/svelte/icons/type';
	import Hash from '@lucide/svelte/icons/hash';
	import Calendar from '@lucide/svelte/icons/calendar';
	import ToggleLeft from '@lucide/svelte/icons/toggle-left';
	import List from '@lucide/svelte/icons/list';
	import Tag from '@lucide/svelte/icons/tag';
	import { Input } from '#lib/components/ui/input/index.js';
	import type { Property, PropertyType } from '#lib/core/frontmatter/properties.types.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { getTagColor } from '#lib/utils/tag-colors.js';

	interface Props {
		property: Property;
		/** Returns false when the edit was refused; the field then shows `property` again. */
		onUpdate: (key: string, value: string | number | boolean | string[], type?: PropertyType) => boolean;
		onRename: (oldKey: string, newKey: string) => void;
		onRemove: (key: string) => void;
	}

	let { property, onUpdate, onRename, onRemove }: Props = $props();

	let newListItem = $state('');
	let isAddingListItem = $state(false);
	let addListInputRef = $state<HTMLInputElement | null>(null);

	/**
	 * Bumped when an edit is refused, to rebuild the value control from
	 * `property`: the input otherwise keeps showing text that was never written.
	 */
	let refusals = $state(0);

	let listItems = $derived(property.type === 'list' ? (property.value as string[]) : []);

	$effect(() => {
		if (isAddingListItem && addListInputRef) addListInputRef.focus();
	});

	/** Icon component mapped from property type */
	const typeIcons: Record<PropertyType, typeof Type> = {
		text: Type,
		number: Hash,
		date: Calendar,
		boolean: ToggleLeft,
		list: List,
	};

	let IconComponent = $derived(typeIcons[property.type] ?? Type);

	function handleKeyBlur(e: FocusEvent) {
		const input = e.target as HTMLInputElement;
		const newKey = input.value.trim();
		if (newKey && newKey !== property.key) {
			onRename(property.key, newKey);
		}
	}

	function commitValue(value: string | number | boolean) {
		if (!onUpdate(property.key, value)) refusals++;
	}

	function handleValueChange(e: Event) {
		const input = e.target as HTMLInputElement;

		if (property.type === 'boolean') {
			commitValue(input.checked);
			return;
		}

		if (property.type === 'number') {
			if (input.value.trim() === '') return;
			const num = Number(input.value);
			if (!isNaN(num)) {
				commitValue(num);
			}
			return;
		}

		commitValue(input.value);
	}

	function removeListItem(index: number) {
		const items = [...(property.value as string[])];
		items.splice(index, 1);
		onUpdate(property.key, items);
	}

	function addListItem() {
		const trimmed = newListItem.trim();
		if (!trimmed) return;
		const items = [...(property.value as string[]), trimmed];
		onUpdate(property.key, items);
		newListItem = '';
	}

	function handleListKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addListItem();
		}
	}
</script>

<div class="group flex flex-col gap-1 rounded-md px-2 py-1.5 hover:bg-right-sidebar-accent/50 transition-colors">
	<!-- Main row: icon + key + value + delete -->
	<div class="flex items-center gap-2 min-h-7">
		<!-- Type icon -->
		<IconComponent class="size-3.5 shrink-0 text-tab-text-inactive" />

		<!-- Property key -->
		<input
			class="flex-[2] min-w-0 text-row bg-transparent px-1 outline-none truncate text-right-sidebar-muted-fg focus:text-right-sidebar-fg"
			data-property-key
			value={property.key}
			onblur={handleKeyBlur}
			placeholder="key"
		/>

		<!-- Value area -->
		{#key refusals}
		{#if property.type === 'boolean'}
			<label class="flex flex-[3] min-w-0 items-center gap-2 cursor-pointer">
				<input
					type="checkbox"
					checked={property.value as boolean}
					onchange={handleValueChange}
					class="rounded-xs border-input"
				/>
				<span class="text-row font-medium text-right-sidebar-fg/70" data-property-value>{String(property.value)}</span>
			</label>
		{:else if property.type !== 'list'}
			<!-- md:text-row is not a duplicate: it makes cn() drop Input's md:text-sm. -->
			<Input
				type={property.type === 'number' ? 'number' : property.type === 'date' ? 'date' : 'text'}
				value={String(property.value)}
				oninput={handleValueChange}
				class="h-6 flex-[3] min-w-0 text-row md:text-row font-medium px-2.5 border-none shadow-none focus-visible:ring-0 !text-right-sidebar-fg/70"
				style={property.type === 'date' ? '--date-input-fg: var(--right-sidebar-fg)' : undefined}
				data-property-value
				placeholder="--"
			/>
		{:else}
			<!-- List: show item count + add button on main row -->
			<span class="flex-[3] min-w-0"></span>
			<button
				class="p-0.5 rounded-xs opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-accent transition-opacity cursor-pointer shrink-0"
				onclick={() => { isAddingListItem = true; }}
				title="Add item"
			>
				<Plus class="size-3 text-right-sidebar-muted-fg" />
			</button>
		{/if}
		{/key}

		<!-- Delete button -->
		<button
			class="p-0.5 rounded-xs opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity cursor-pointer shrink-0"
			onclick={() => onRemove(property.key)}
			title="Remove property"
		>
			<X class="size-3" />
		</button>
	</div>

	<!-- List items (shown below main row) -->
	{#if property.type === 'list' && (listItems.length > 0 || isAddingListItem)}
		<div class="flex flex-wrap gap-1.5 rounded-md bg-right-sidebar-accent p-2">
			{#each listItems as item, i (i)}
				{@const tagColor = property.key === 'tags' ? getTagColor(item, settingsStore.tagColors.colors) : undefined}
				<div class="flex max-w-full min-w-0 items-center gap-1.5 rounded-md bg-input-bg py-1 pl-2 pr-1 text-row" data-property-list-item>
					<Tag class="size-3 shrink-0 text-right-sidebar-muted-fg" style="color: {tagColor ?? ''}" />
					<span class="truncate text-right-sidebar-fg/80">{item}</span>
					<button
						class="p-0.5 rounded-xs opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity cursor-pointer shrink-0"
						onclick={() => removeListItem(i)}
						title="Remove item"
					>
						<X class="size-2.5" />
					</button>
				</div>
			{/each}
			{#if isAddingListItem}
				<div class="flex w-full items-center gap-1.5 rounded-md bg-input-bg px-2 py-1 text-row">
					<Tag class="size-3 shrink-0 text-right-sidebar-muted-fg" />
					<input
						bind:this={addListInputRef}
						bind:value={newListItem}
						placeholder="Add item..."
						class="flex-1 min-w-0 bg-transparent outline-none text-right-sidebar-fg/80 placeholder:text-right-sidebar-muted-fg/30"
						onkeydown={(e) => {
							if (e.key === 'Enter') { e.preventDefault(); addListItem(); }
							else if (e.key === 'Escape') { isAddingListItem = false; newListItem = ''; }
						}}
						onblur={() => { addListItem(); isAddingListItem = false; }}
					/>
				</div>
			{/if}
		</div>
	{/if}
</div>
