<script lang="ts">
	import { tick } from 'svelte';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import { Popover, PopoverPortal, PopoverTrigger, PopoverContent } from '#lib/components/ui/popover/index.js';
	import {
		BUILT_IN_SORT_OPTIONS,
		defaultSortDirection,
		propertySortOption,
		sortOptionLabel,
	} from './list-sort.logic';
	import type { ListSortConfig, ListSortDirection, ListSortOption } from './list-toolbar.types';

	interface Props {
		/** The order the list shows, or null for the lens's native order */
		config: ListSortConfig | null;
		/** Sort columns beyond the first, shown as `+N` on the trigger */
		extraCount: number;
		/** Frontmatter keys offered as property sorts */
		properties: string[];
		/** Called with the picked order; the menu has already closed */
		onSelect: (config: ListSortConfig) => void;
		/** When set, a last item opens the multi-column sort editor */
		onMultipleSort?: () => void;
		/** When set, a customized sort offers a last item back to the lens's own order */
		onReset?: () => void;
		/** True when the list has a sort of its own rather than its default, which colors the trigger */
		customized?: boolean;
	}

	let { config, extraCount, properties, onSelect, onMultipleSort, onReset, customized = false }: Props = $props();

	let open = $state(false);
	let menuEl: HTMLElement | undefined = $state();
	/** Where focus last was in this open of the panel. Plain: no markup depends on it. */
	let lastFocused: HTMLElement | null = null;

	$effect(() => {
		if (!open) lastFocused = null;
	});

	const builtInOptions: ListSortOption[] = BUILT_IN_SORT_OPTIONS.map((o) => o.value);
	// `status` is a built-in row. An active property no listed note has still needs a row, or it shows no active mark.
	const propertyOptions = $derived.by(() => {
		const options = properties.filter((key) => key !== 'status').map((key) => propertySortOption(key));
		if (config?.option.startsWith('property:') && !options.includes(config.option)) options.push(config.option);
		return options;
	});

	const triggerTitle = $derived(config ? `Sort: ${sortOptionLabel(config.option)}` : 'Sort');

	function pick(option: ListSortOption, direction?: ListSortDirection) {
		const isActive = config?.option === option;
		const picked: ListSortConfig = {
			option,
			direction: direction ?? (isActive && config ? config.direction : defaultSortDirection(option)),
		};
		open = false;
		// Focus starts on the active row, so open + Enter lands here: it must not save a sort or drop extra columns.
		// An arrow is the deliberate way to save a list's default or collapse a multi-column sort.
		if (isActive && direction === undefined) return;
		if (customized && isActive && picked.direction === config?.direction && extraCount === 0) return;
		onSelect(picked);
	}

	function rows(): HTMLElement[] {
		return Array.from(menuEl?.querySelectorAll<HTMLElement>('[role="menuitemradio"], [role="menuitem"]') ?? []);
	}

	function focusActiveRow() {
		const all = rows();
		const active = all.find((el) => el.getAttribute('aria-checked') === 'true');
		(active ?? all[0])?.focus();
	}

	function handleMenuKeydown(event: KeyboardEvent) {
		const all = rows();
		const current = all.indexOf(document.activeElement as HTMLElement);

		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			const step = event.key === 'ArrowDown' ? 1 : -1;
			const next = current < 0 ? 0 : (current + step + all.length) % all.length;
			all[next]?.focus();
		} else if (event.key === 'Home' || event.key === 'End') {
			event.preventDefault();
			(event.key === 'Home' ? all[0] : all[all.length - 1])?.focus();
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			const option = all[current]?.dataset.sortOption as ListSortOption | undefined;
			if (!option) return;
			event.preventDefault();
			pick(option, event.key === 'ArrowLeft' ? 'asc' : 'desc');
		} else if (event.key === 'Enter' || event.key === ' ') {
			const row = all[current];
			if (!row) return;
			event.preventDefault();
			row.click();
		}
	}

</script>

<Popover bind:open>
	<PopoverTrigger
		class="flex min-w-0 max-w-full cursor-default items-center gap-1 rounded-md p-1 text-meta transition-colors hover:bg-file-explorer-accent hover:text-tab-text-active {customized
			? 'text-tab-text-active'
			: 'text-tab-text-inactive'}"
		title={triggerTitle}
		aria-label={triggerTitle}
		data-note-list-sort
	>
		{#if config}
			{#if config.direction === 'asc'}
				<ArrowUp class="size-3.5 shrink-0" />
			{:else}
				<ArrowDown class="size-3.5 shrink-0" />
			{/if}
			<span class="hidden truncate @[16.5rem]:inline">{sortOptionLabel(config.option)}</span>
		{:else}
			<ArrowUpDown class="size-3.5 shrink-0" />
			<span class="hidden truncate @[16.5rem]:inline">Default</span>
		{/if}
		{#if extraCount > 0}
			<span class="shrink-0">+{extraCount}</span>
		{/if}
	</PopoverTrigger>
	<!-- The list pane clips its overflow, and the rows paint over anything inline in its header. -->
	<PopoverPortal>
		<PopoverContent
			align="end"
			class="w-56 p-1"
			onOpenAutoFocus={(event) => {
				// The default focuses the panel, which sits outside the menu's key handler. bits-ui can run this
				// more than once per open, so a later run restores where focus got to instead of the active row.
				event.preventDefault();
				void tick().then(() => (lastFocused?.isConnected ? lastFocused.focus() : focusActiveRow()));
			}}
			onfocusin={(event) => {
				lastFocused = event.target as HTMLElement;
			}}
		>
			<div role="menu" tabindex="-1" bind:this={menuEl} onkeydown={handleMenuKeydown} class="flex flex-col">
				{#each builtInOptions as option (option)}
					{@render sortRow(option)}
				{/each}
				{#if propertyOptions.length > 0}
					<div role="separator" data-sort-separator class="my-1 h-px bg-file-explorer-border"></div>
					{#each propertyOptions as option (option)}
						{@render sortRow(option)}
					{/each}
				{/if}
				{#if onMultipleSort}
					<div role="separator" data-sort-separator class="my-1 h-px bg-file-explorer-border"></div>
					<button
						type="button"
						role="menuitem"
						class="flex w-full cursor-default items-center rounded-sm px-2 py-1 text-left text-meta hover:bg-file-explorer-accent"
						data-sort-multiple
						onclick={() => {
							open = false;
							onMultipleSort?.();
						}}
					>
						Multiple sort...
					</button>
				{/if}
				{#if onReset && customized}
					{#if !onMultipleSort}
						<div role="separator" data-sort-separator class="my-1 h-px bg-file-explorer-border"></div>
					{/if}
					<button
						type="button"
						role="menuitem"
						class="flex w-full cursor-default items-center rounded-sm px-2 py-1 text-left text-meta hover:bg-file-explorer-accent"
						data-sort-reset
						onclick={() => {
							open = false;
							onReset?.();
						}}
					>
						Reset to default
					</button>
				{/if}
			</div>
		</PopoverContent>
	</PopoverPortal>
</Popover>

{#snippet sortRow(option: ListSortOption)}
	{@const active = config?.option === option}
	<div role="none" class="flex items-center gap-0.5">
		<button
			type="button"
			role="menuitemradio"
			aria-checked={active ? 'true' : 'false'}
			tabindex="-1"
			class="flex min-w-0 flex-1 cursor-default items-center rounded-sm px-2 py-1 text-left text-meta hover:bg-file-explorer-accent {active
				? 'text-tab-text-active'
				: ''}"
			data-sort-option={option}
			onclick={() => pick(option)}
		>
			<span class="truncate">{sortOptionLabel(option)}</span>
		</button>
		<button
			type="button"
			tabindex="-1"
			aria-label="{sortOptionLabel(option)} ascending"
			aria-pressed={active && config?.direction === 'asc'}
			class="flex shrink-0 cursor-default items-center rounded-sm p-1 hover:bg-file-explorer-accent {active && config?.direction === 'asc'
				? 'text-tab-text-active'
				: 'text-tab-text-inactive'}"
			data-sort-dir="asc"
			onclick={() => pick(option, 'asc')}
		>
			<ArrowUp class="size-3" />
		</button>
		<button
			type="button"
			tabindex="-1"
			aria-label="{sortOptionLabel(option)} descending"
			aria-pressed={active && config?.direction === 'desc'}
			class="flex shrink-0 cursor-default items-center rounded-sm p-1 hover:bg-file-explorer-accent {active && config?.direction === 'desc'
				? 'text-tab-text-active'
				: 'text-tab-text-inactive'}"
			data-sort-dir="desc"
			onclick={() => pick(option, 'desc')}
		>
			<ArrowDown class="size-3" />
		</button>
	</div>
{/snippet}
