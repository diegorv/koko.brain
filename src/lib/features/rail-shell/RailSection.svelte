<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import SettingItem from '#lib/core/settings/sections/SettingItem.svelte';
	import { SEARCH_RAIL_ITEM, TODAY_RAIL_ITEM } from './lens.logic';
	import {
		moveRailItem,
		parseRailHidden,
		parseRailInboxBadge,
		parseRailOrder,
		railItems,
		type RailItem,
		type RailItemGroup,
	} from './rail-items.logic';
	import { railRegistryStore } from './rail-registry.store.svelte';

	/** The rail's groups as the page lists them; pins order by their own `_order`, so they are not listed. */
	const GROUPS: { group: RailItemGroup; label: string }[] = [
		{ group: 'top', label: 'Top' },
		{ group: 'navigator', label: 'Navigators' },
		{ group: 'bottom', label: 'Bottom' },
	];

	/** Descriptions of the items the page does not let the user hide */
	const FIXED_DESCRIPTIONS: Record<string, string> = {
		[SEARCH_RAIL_ITEM]: 'Always shown, first on the rail',
		[TODAY_RAIL_ITEM]: 'Always shown; the rail falls back to Today',
	};

	let hidden = $derived(parseRailHidden(settingsStore.layout.railHidden));
	/** Every built-in and registered navigator item, hidden ones included, in the saved order */
	let items = $derived(railItems(railRegistryStore.navigators, [], [], parseRailOrder(settingsStore.layout.railOrder)));

	function setVisible(key: string, visible: boolean) {
		settingsStore.updateLayout({ railHidden: visible ? hidden.filter((k) => k !== key) : [...hidden, key] });
	}

	function move(key: string, delta: -1 | 1) {
		const order = moveRailItem(items, key, delta);
		if (order) settingsStore.updateLayout({ railOrder: order });
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Rail</h2>

	{#each GROUPS as { group, label } (group)}
		<h3 class="section-label mt-6 mb-2">{label}</h3>
		{#each items.filter((i) => i.group === group) as item (item.key)}
			{@render row(item)}
		{/each}
	{/each}

	<h3 class="section-label mt-6 mb-2">Inbox badge</h3>

	<SettingItem
		label="Show Inbox count on the rail"
		description="Display the number of inbox notes on the rail's Inbox button. The dock badge has its own switch under Quick Capture."
	>
		<Switch
			aria-label="Show Inbox count on the rail"
			checked={parseRailInboxBadge(settingsStore.layout.railInboxBadge)}
			onCheckedChange={(v) => settingsStore.updateLayout({ railInboxBadge: v })}
		/>
	</SettingItem>
</div>

{#snippet row(item: RailItem)}
	<div data-rail-setting={item.key}>
		<SettingItem label={item.label} description={FIXED_DESCRIPTIONS[item.key]}>
			<div class="flex items-center gap-1">
				{#if item.key !== SEARCH_RAIL_ITEM}
					<Button
						variant="ghost"
						size="icon"
						class="size-7"
						aria-label="Move {item.label} up"
						disabled={moveRailItem(items, item.key, -1) === null}
						onclick={() => move(item.key, -1)}
					>
						<ChevronUpIcon class="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						class="size-7"
						aria-label="Move {item.label} down"
						disabled={moveRailItem(items, item.key, 1) === null}
						onclick={() => move(item.key, 1)}
					>
						<ChevronDownIcon class="size-3.5" />
					</Button>
				{/if}
				{#if item.key !== SEARCH_RAIL_ITEM && item.key !== TODAY_RAIL_ITEM}
					<Switch
						class="ml-2"
						aria-label="Show {item.label}"
						checked={!hidden.includes(item.key)}
						onCheckedChange={(v) => setVisible(item.key, v)}
					/>
				{/if}
			</div>
		</SettingItem>
	</div>
{/snippet}
