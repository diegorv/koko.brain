<script lang="ts">
	import { X, Plus, Type, Hash, Calendar, ToggleLeft, List, Tag } from 'lucide-svelte';
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

	let listItems = $derived(property.type === 'list' ? (property.value as string[]) : []);

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

<div class="group flex flex-col gap-1 rounded-md px-2 py-2 hover:bg-accent/50 transition-colors">
	<!-- Main row: icon + key + value + delete -->
	<div class="flex items-center gap-2 min-h-7">
		<!-- Type icon -->
		<IconComponent class="size-3.5 shrink-0 text-tab-text-inactive" />

		<!-- Property key -->
		<input
			class="flex-[2] min-w-0 text-[14px] font-medium bg-transparent rounded border px-1.5 py-0.5 outline-none truncate"
			style="border-color: color-mix(in srgb, var(--tab-text-inactive) 50%, transparent)"
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
				<span class="text-foreground/90">{String(property.value)}</span>
			</label>
		{:else if property.type !== 'list'}
			<Input
				type={property.type === 'number' ? 'number' : property.type === 'date' ? 'date' : 'text'}
				value={String(property.value)}
				oninput={handleValueChange}
				class="h-6 flex-[3] min-w-0 text-[14px] px-1.5{property.type !== 'date' ? ' !text-foreground/70' : ''}"
				placeholder="Empty"
			/>
		{:else}
			<!-- List: show item count as placeholder on main row -->
			<span class="flex-[3] min-w-0 text-foreground/50">
				{listItems.length === 0 ? 'Empty' : `${listItems.length} item${listItems.length !== 1 ? 's' : ''}`}
			</span>
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
	{#if property.type === 'list'}
		<div class="flex flex-col gap-1.5 pl-5">
			{#if listItems.length > 0}
				<div class="flex flex-col gap-1.5">
					{#each listItems as item, i (i)}
						{@const tagColor = property.key === 'tags' ? getTagColor(item, settingsStore.tagColors.colors) : undefined}
						<div class="flex items-center gap-2">
							<span class="size-1.5 rounded-full shrink-0" style:background={tagColor ?? 'var(--tab-text-inactive)'}></span>
							<span
								class="inline-flex items-center gap-1 rounded-md px-2 py-1 border"
								style="border-color: color-mix(in srgb, {tagColor ?? 'var(--tab-text-inactive)'} 30%, transparent); color: var(--tab-text-active)"
							>
								<Tag class="size-3 shrink-0" style="color: {tagColor ?? 'var(--tab-text-inactive)'}" />
								{item}
								<button
									class="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer ml-0.5"
									onclick={() => removeListItem(i)}
									title="Remove item"
								>
									<X class="size-2.5" />
								</button>
							</span>
						</div>
					{/each}
				</div>
			{/if}
			<div class="flex items-center gap-1">
				<Input
					bind:value={newListItem}
					placeholder="Add item..."
					class="h-6 text-[14px] px-1.5"
					onkeydown={handleListKeydown}
				/>
				<button
					class="p-0.5 rounded hover:bg-accent transition-colors cursor-pointer"
					onclick={addListItem}
					title="Add item"
				>
					<Plus class="size-3 text-muted-foreground" />
				</button>
			</div>
		</div>
	{/if}
</div>
