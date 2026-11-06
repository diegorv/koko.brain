<script lang="ts">
	import type { Component } from 'svelte';
	import Archive from '@lucide/svelte/icons/archive';
	import FileText from '@lucide/svelte/icons/file-text';
	import Folder from '@lucide/svelte/icons/folder';
	import Inbox from '@lucide/svelte/icons/inbox';
	import Layers from '@lucide/svelte/icons/layers';
	import Puzzle from '@lucide/svelte/icons/puzzle';
	import Search from '@lucide/svelte/icons/search';
	import Star from '@lucide/svelte/icons/star';
	import Sun from '@lucide/svelte/icons/sun';
	import Table from '@lucide/svelte/icons/table';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { getIconSync } from '#lib/features/file-icons/file-icons.icon-data.js';
	import { iconColorCss, parseIconValuePermissive } from '#lib/features/file-icons/file-icons.logic.js';
	import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
	import { resolveIconForPath } from '#lib/features/file-icons/icon-resolver.js';
	import IconRenderer from '#lib/features/file-icons/IconRenderer.svelte';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import { excludeSystemFolder } from '#lib/features/type-definitions/type-sidebar.logic.js';
	import { getInboxCount } from '#lib/features/type-definitions/inbox-workflow.logic.js';
	import { pinnedRailItems } from './lens.logic';
	import {
		parseRailHidden,
		parseRailInboxBadge,
		parseRailOrder,
		RAIL_ACTION_COLOR,
		RAIL_PIN_COLOR,
		RAIL_WIDTH,
		railItemColor,
		railItems,
		type RailItem,
	} from './rail-items.logic';
	import { railRegistryStore } from './rail-registry.store.svelte';
	import type { RailAction, RailPin } from './rail-shell.types';

	interface Props {
		/** Key of the highlighted rail item */
		activeItem: string;
		/**
		 * Called with the picked item's key, and with its pin for a pinned item (absent for every other item); the
		 * owner decides what the click does, a pin's `_open_in_editor` rule included. `restoreRailItem` in
		 * lens.logic.ts maps the key to its lens
		 */
		onSelect: (item: string, pin?: RailItem['pin']) => void;
	}

	let { activeItem, onSelect }: Props = $props();

	// Same input as the dock badge in AppShell, so both show the same number.
	let inboxCount = $derived.by(() => {
		void typeDefinitionsStore.entriesVersion;
		return getInboxCount(
			excludeSystemFolder(typeDefinitionsStore.entries, vaultStore.path, settingsStore.templates.systemFolder),
		);
	});

	/** The icons of the built-in items; a navigator and a pin bring their own. */
	const BUILT_IN_ICONS: Record<string, Component> = {
		search: Search,
		inbox: Inbox,
		today: Sun,
		favorites: Star,
		types: Layers,
		files: Folder,
		archive: Archive,
	};

	/**
	 * Every rail item; the navigators plugins registered and the `.view` files and type definitions with `_rail: true`
	 * included, less the items Settings > Layout hides, in its order.
	 */
	let items = $derived.by(() => {
		void typeDefinitionsStore.entriesVersion;
		return railItems(
			railRegistryStore.navigators,
			pinnedRailItems(typeDefinitionsStore.entries, typeDefinitionsStore.typeMetadataMap),
			parseRailHidden(settingsStore.layout.railHidden),
			parseRailOrder(settingsStore.layout.railOrder),
		);
	});
	let showsInboxBadge = $derived(parseRailInboxBadge(settingsStore.layout.railInboxBadge));
	let topItems = $derived(items.filter((i) => i.group === 'top'));
	/** The items that open a navigator, below the divider. */
	let navigatorItems = $derived(items.filter((i) => i.group === 'navigator'));
	let pinnedItems = $derived(items.flatMap((i) => (i.pin ? [i.pin] : [])));
	/** Pinned to the bottom of the rail, below the flexible gap. */
	let bottomItems = $derived(items.filter((i) => i.group === 'bottom'));

	/** One button of any group: an item, a pin or an action, flattened so one snippet draws them all. */
	interface Row {
		key: string;
		label: string;
		color: string;
		active: boolean;
		/** The count the pill shows; 0 shows none */
		count: number;
		item?: RailItem;
		pin?: RailPin;
		action?: RailAction;
		select: () => void;
	}

	function itemRow(item: RailItem): Row {
		return {
			key: item.key,
			label: item.label,
			color: railItemColor(item.key),
			active: item.key === activeItem,
			count: item.key === 'inbox' && showsInboxBadge ? inboxCount : 0,
			item,
			select: () => onSelect(item.key),
		};
	}

	function pinRow(pin: RailPin): Row {
		return {
			key: pin.key,
			label: pin.label,
			color: iconColorCss(resolveIconForPath(pin.path)?.color) ?? RAIL_PIN_COLOR,
			// A click on a view that opens in the editor does not pick it, so its pin also follows the active tab, like its Views row.
			active: pin.key === activeItem || (pin.opensInEditor && editorStore.activeTabPath === pin.path),
			count: 0,
			pin,
			select: () => onSelect(pin.key, pin),
		};
	}

	/** Runs on click; never picked, so it has no highlight and is not saved as the rail item. */
	function actionRow(action: RailAction): Row {
		return {
			key: action.key,
			label: action.label,
			color: RAIL_ACTION_COLOR,
			active: false,
			count: 0,
			action,
			select: () => action.run(),
		};
	}

	let topRows = $derived(topItems.map(itemRow));
	let navigatorRows = $derived(navigatorItems.map(itemRow));
	let pinRows = $derived(pinnedItems.map(pinRow));
	let actionRows = $derived(railRegistryStore.actions.map(actionRow));
	let bottomRows = $derived(bottomItems.map(itemRow));

	/**
	 * The icon an action's ref names, or undefined until its pack is loaded. Reading packVersion re-runs it when a
	 * pack arrives; whoever registers the action preloads the pack.
	 */
	function actionIcon(ref: string) {
		void fileIconsStore.packVersion;
		const parsed = parseIconValuePermissive(ref);
		return parsed ? getIconSync(parsed.iconPack, parsed.iconName) : undefined;
	}
</script>

<div class="relative flex shrink-0" style:width="{RAIL_WIDTH.default}px">
	<nav
		aria-label="Rail"
		class="flex w-full min-w-0 flex-col gap-0.5 overflow-x-hidden overflow-y-auto bg-background [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
		data-rail
		data-rail-form="labeled"
	>
		<!--
			Room for the macOS traffic lights (titleBarStyle Overlay), and a handle to drag the window. Continues the
			neighbouring headers, so the rail's edge starts below the lights; sticky so the rows never pass under them.
		-->
		<div class="sticky top-0 z-10 h-10 w-full shrink-0 bg-tab-bar" style="box-shadow: inset 0 -1px 0 var(--divider)" data-rail-strip data-tauri-drag-region></div>
		<div class="h-1.5 shrink-0"></div>
		{@render sectionTitle('Workspace')}
		{#each topRows as row (row.key)}
			{@render railRow(row)}
		{/each}
		{#if navigatorRows.length > 0}
			<div class="mx-2 my-2 h-px shrink-0 bg-file-explorer-fg/25" data-rail-divider></div>
			{@render sectionTitle('Browse')}
			{#each navigatorRows as row (row.key)}
				{@render railRow(row)}
			{/each}
		{/if}
		{#if pinRows.length > 0}
			<div class="mx-2 my-2 h-px shrink-0 bg-file-explorer-fg/25" data-rail-pinned-divider></div>
			<div class="flex shrink-0 flex-col gap-0.5" data-rail-pinned>
				{@render sectionTitle('Pinned')}
				{#each pinRows as row (row.key)}
					{@render railRow(row)}
				{/each}
			</div>
		{/if}
		{#if actionRows.length > 0}
			<div class="mx-2 my-2 h-px shrink-0 bg-file-explorer-fg/25" data-rail-actions-divider></div>
			<div class="flex shrink-0 flex-col gap-0.5" data-rail-actions>
				{@render sectionTitle('Actions')}
				{#each actionRows as row (row.key)}
					{@render railRow(row)}
				{/each}
			</div>
		{/if}
		<div class="mt-auto flex shrink-0 flex-col gap-0.5 py-2" data-rail-bottom>
			{#each bottomRows as row (row.key)}
				{@render railRow(row)}
			{/each}
		</div>
	</nav>
	<!-- Outside the nav, which scrolls. -->
	<div class="pointer-events-none absolute top-10 right-0 bottom-0 w-px bg-file-explorer-border" data-rail-edge></div>
</div>

{#snippet sectionTitle(text: string)}
	<div class="section-label shrink-0 px-4 pb-0.5" data-rail-section-title={text}>{text}</div>
{/snippet}

{#snippet icon(row: Row, sizeClass: string)}
	{@const resolved = row.pin ? resolveIconForPath(row.pin.path) : null}
	{@const Icon = row.item?.navigator?.icon ?? (row.item ? BUILT_IN_ICONS[row.item.key] : null)}
	{@const actionSvg = row.action ? actionIcon(row.action.icon) : undefined}
	{#if row.action}
		{#if actionSvg}
			<IconRenderer icon={actionSvg} class={sizeClass} />
		{:else}
			<Puzzle class={sizeClass} />
		{/if}
	{:else if Icon}
		<Icon class={sizeClass} />
	{:else if resolved?.icon}
		<IconRenderer icon={resolved.icon} class={sizeClass} color={resolved.color} />
	{:else if row.pin?.kind === 'view'}
		<Table class={sizeClass} />
	{:else}
		<FileText class={sizeClass} />
	{/if}
{/snippet}

{#snippet railRow(row: Row)}
	{@const busy = row.action?.busy?.() ?? false}
	<button
		class="relative mx-2 flex h-7 shrink-0 cursor-default items-center gap-2 rounded-md px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset {row.active ? 'text-file-explorer-fg' : 'text-file-explorer-fg/85 hover:bg-file-explorer-accent/60'}"
		style:--rail-c={row.color}
		style:background-color={row.active ? 'color-mix(in oklch, var(--rail-c) 18%, transparent)' : undefined}
		title={row.label}
		aria-label={row.label}
		aria-current={row.active ? 'page' : undefined}
		aria-busy={busy || undefined}
		data-rail-item={row.key}
		onclick={row.select}
	>
		<span class="shrink-0" style:color="var(--rail-c)">{@render icon(row, 'size-4')}</span>
		<span class="min-w-0 flex-1 truncate text-left text-rail {row.active ? 'font-medium' : ''}" data-rail-title>{row.label}</span>
		{#if row.count > 0}
			<span class="rounded-full px-1.5 text-label tabular-nums text-white" style:background-color="var(--rail-c)" data-rail-badge>{row.count}</span>
		{/if}
		{#if busy}
			<span class="absolute top-1 right-1 size-1.5 animate-pulse rounded-full bg-file-explorer-primary" aria-hidden="true" data-rail-busy></span>
		{/if}
	</button>
{/snippet}
