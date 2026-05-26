<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import Type from '@lucide/svelte/icons/type';
	import Hash from '@lucide/svelte/icons/hash';
	import Calendar from '@lucide/svelte/icons/calendar';
	import ToggleLeft from '@lucide/svelte/icons/toggle-left';
	import List from '@lucide/svelte/icons/list';
	import Tag from '@lucide/svelte/icons/tag';
	import { Input } from '$lib/components/ui/input';
	import type { Property, PropertyType } from './properties.types';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { getTagColor } from '$lib/features/tags/tag-colors.logic';

	interface Props {
		property: Property;
		onUpdate: (key: string, value: string | number | boolean | string[], type?: PropertyType) => void;
		onRename: (oldKey: string, newKey: string) => void;
		onRemove: (key: string) => void;
	}

	let { property, onUpdate, onRename, onRemove }: Props = $props();

	let newListItem = $state('');
	let isAddingListItem = $state(false);
	let addListInputRef = $state<HTMLInputElement | null>(null);

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

	function handleValueChange(e: Event) {
		const input = e.target as HTMLInputElement;

		if (property.type === 'boolean') {
			onUpdate(property.key, input.checked);
			return;
		}

		if (property.type === 'number') {
			if (input.value.trim() === '') return;
			const num = Number(input.value);
			if (!isNaN(num)) {
				onUpdate(property.key, num);
			}
			return;
		}

		onUpdate(property.key, input.value);
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
			class="flex-[2] min-w-0 text-[14px] font-medium bg-transparent px-1 outline-none truncate text-right-sidebar-muted-fg focus:text-right-sidebar-fg"
			data-property-key
			value={property.key}
			onblur={handleKeyBlur}
			placeholder="key"
		/>

		<!-- Value area -->
		{#if property.type === 'boolean'}
			<label class="flex flex-[3] min-w-0 items-center gap-2 cursor-pointer">
				<input
					type="checkbox"
					checked={property.value as boolean}
					onchange={handleValueChange}
					class="rounded border-input"
				/>
				<span class="text-right-sidebar-fg/90">{String(property.value)}</span>
			</label>
		{:else if property.type !== 'list'}
			<Input
				type={property.type === 'number' ? 'number' : property.type === 'date' ? 'date' : 'text'}
				value={String(property.value)}
				oninput={handleValueChange}
				class="h-6 flex-[3] min-w-0 text-[14px] px-2.5 border-none shadow-none focus-visible:ring-0{property.type !== 'date' ? ' !text-right-sidebar-fg/70' : ''}"
				placeholder="--"
			/>
		{:else}
			<!-- List: show item count + add button on main row -->
			<span class="flex-[3] min-w-0"></span>
			<button
				class="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-all cursor-pointer shrink-0"
				onclick={() => { isAddingListItem = true; }}
				title="Add item"
			>
				<Plus class="size-3 text-right-sidebar-muted-fg" />
			</button>
		{/if}

		<!-- Delete button -->
		<button
			class="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer shrink-0"
			onclick={() => onRemove(property.key)}
			title="Remove property"
		>
			<X class="size-3" />
		</button>
	</div>

	<!-- List items (shown below main row) -->
	{#if property.type === 'list' && (listItems.length > 0 || isAddingListItem)}
		<div class="flex flex-col gap-1 rounded-md bg-right-sidebar-accent px-2 py-1.5">
			{#each listItems as item, i (i)}
				{@const tagColor = property.key === 'tags' ? getTagColor(item, settingsStore.tagColors.colors) : undefined}
				<div class="flex items-center gap-1.5 text-[14px]">
					<Tag class="size-3 shrink-0 text-right-sidebar-muted-fg" style="color: {tagColor ?? ''}" />
					<span class="truncate text-right-sidebar-fg/80">{item}</span>
					<button
						class="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer shrink-0 ml-auto"
						onclick={() => removeListItem(i)}
						title="Remove item"
					>
						<X class="size-2.5" />
					</button>
				</div>
			{/each}
			{#if isAddingListItem}
				<div class="flex items-center gap-1.5 text-[14px]">
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
