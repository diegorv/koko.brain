<script lang="ts">
	import { untrack } from 'svelte';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ImageIcon from '@lucide/svelte/icons/image';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import IconPicker from '#lib/features/file-icons/IconPicker.svelte';
	import IconRenderer from '#lib/features/file-icons/IconRenderer.svelte';
	import { getIconSync } from '#lib/features/file-icons/file-icons.icon-data.js';
	import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
	import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
	import {
		createEmptyExpressionRow,
		filterGroupsToFilter,
		getAllKnownProperties,
		parseFilterToGroups,
	} from '#lib/features/collection/toolbar/filter.logic.js';
	import FilterPanel from '#lib/features/collection/toolbar/FilterPanel.svelte';
	import type { FilterItem } from '#lib/features/collection/collection.types.js';
	import type { FilterGroup } from '#lib/features/collection/toolbar/toolbar.types.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import type { AutoMoveRule, RuleProperty } from './auto-move.types';
	import type { IconPackId } from '#lib/features/file-icons/file-icons.types.js';
	import { BLANK_VALUE_ERROR, countMatchingNotes, hasBlankValue, isRefusedKey, sanitizeRuleProperties } from './auto-move.logic';
	import AutoMoveRuleProperty from './AutoMoveRuleProperty.svelte';

	let {
		rule,
		isFirst,
		isLast,
		onupdate,
		onremove,
		onmoveup,
		onmovedown,
	}: {
		rule: AutoMoveRule;
		isFirst: boolean;
		isLast: boolean;
		onupdate: (id: string, updates: Partial<AutoMoveRule>) => void;
		onremove: (id: string) => void;
		onmoveup: (id: string) => void;
		onmovedown: (id: string) => void;
	} = $props();

	/** How long the filter must stay unchanged before its match count is recomputed */
	const COUNT_DELAY_MS = 300;

	/**
	 * The filter builder's groups as edited. They reach the rule only through
	 * `commitFilter`: a rule runs on every save, so a half-typed filter must
	 * never be live. Not re-read from the rule after a save: a one-row "any"
	 * group saves as a plain string and would come back as "all".
	 */
	let groups = $state.raw<FilterGroup[]>(untrack(() => toGroups(rule.expression)));
	/** The filter the builder shows, in the shape the rule stores; `''` (matches nothing) when it has no rows */
	let filterDraft = $derived<FilterItem>(filterGroupsToFilter(groups) ?? '');
	/** A visual row with no value, which `filterProblem` would also refuse */
	let blankValue = $derived(groups.some((g) => g.rows.some(hasBlankValue)));
	let availableProperties = $derived(getAllKnownProperties(collectionStore.propertyIndex));
	/** Set by an `input` event inside the builder, so the change it reports is saved on `change`, not per keystroke */
	let typing = false;
	let iconPickerOpen = $state(false);

	/** The filter the match count was last computed for, behind the typing by `COUNT_DELAY_MS` */
	let countedFilter = $state.raw<FilterItem>(untrack(() => filterDraft));
	$effect(() => {
		const value = filterDraft;
		const timer = setTimeout(() => (countedFilter = value), COUNT_DELAY_MS);
		return () => clearTimeout(timer);
	});
	let matchCount = $derived(countMatchingNotes(countedFilter, collectionStore.propertyIndex, vaultStore.path ?? ''));

	let properties = $derived(rule.properties ?? []);
	/** True when the rule neither moves nor sets anything, so it does nothing */
	let doesNothing = $derived(!rule.destination.trim() && sanitizeRuleProperties(rule.properties).length === 0);
	/** Known note properties for the key field; `file.*` fields are read-only and refused keys never written */
	let keySuggestions = $derived(
		properties.length > 0
			? getAllKnownProperties(collectionStore.propertyIndex).filter((key) => !key.startsWith('file.') && !isRefusedKey(key))
			: [],
	);
	let keyListId = $derived(`auto-move-keys-${rule.id}`);

	/** The builder groups for a stored filter; a blank string is an empty builder, not a blank raw row. */
	function toGroups(filter: FilterItem): FilterGroup[] {
		return typeof filter === 'string' && !filter.trim() ? [] : parseFilterToGroups(filter);
	}

	function handleFiltersChange(next: FilterGroup[]) {
		groups = next;
		if (typing) {
			typing = false;
			return;
		}
		commitFilter();
	}

	/**
	 * Appends a blank expression row to the first group, or to a new "all"
	 * group. It lives here, not in the shared FilterPanel, so views keep their
	 * builder as is. Nothing is saved until text is typed into the row.
	 */
	function addExpression() {
		const [first, ...rest] = groups;
		const row = createEmptyExpressionRow();
		groups = first ? [{ ...first, rows: [...first.rows, row] }, ...rest] : [{ conjunction: 'and', rows: [row] }];
	}

	/** Saves the builder's filter unless a row still has no value. */
	function commitFilter() {
		if (blankValue) return;
		if (JSON.stringify(filterDraft) !== JSON.stringify(rule.expression)) onupdate(rule.id, { expression: filterDraft });
	}

	function setProperties(next: RuleProperty[]) {
		onupdate(rule.id, { properties: next });
	}

	function addProperty() {
		setProperties([...properties, { key: '', value: '', mode: 'if-missing' }]);
	}

	function handleIconSelect(pack: IconPackId, name: string, color?: string, textColor?: string) {
		onupdate(rule.id, { icon: { iconPack: pack, iconName: name, color, textColor } });
	}

	function handleIconRemove() {
		onupdate(rule.id, { icon: undefined });
		iconPickerOpen = false;
	}

	/** Resolve the icon for rendering (sync lookup from cache) */
	function getResolvedIcon() {
		void fileIconsStore.packVersion;
		if (!rule.icon) return null;
		return getIconSync(rule.icon.iconPack, rule.icon.iconName) ?? null;
	}
</script>

<div class="flex flex-col gap-2 rounded-lg border border-border bg-setting-item-bg p-3">
	<!-- Header row: name + enable toggle + move + delete -->
	<div class="flex items-center gap-2">
		<Input
			class="flex-1 font-medium"
			value={rule.name}
			placeholder="Rule name"
			oninput={(e) => onupdate(rule.id, { name: (e.currentTarget as HTMLInputElement).value })}
		/>
		<Switch
			checked={rule.enabled}
			onCheckedChange={(enabled) => onupdate(rule.id, { enabled })}
		/>
		<Button
			variant="ghost"
			size="icon"
			class="size-7"
			disabled={isFirst}
			onclick={() => onmoveup(rule.id)}
		>
			<ChevronUpIcon class="size-3.5" />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			class="size-7"
			disabled={isLast}
			onclick={() => onmovedown(rule.id)}
		>
			<ChevronDownIcon class="size-3.5" />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			class="size-7 text-destructive hover:text-destructive"
			onclick={() => onremove(rule.id)}
		>
			<TrashIcon class="size-3.5" />
		</Button>
	</div>

	<!-- Filter builder -->
	<div class="flex flex-col gap-1">
		<div class="flex items-start gap-2">
			<span class="w-24 shrink-0 text-meta text-muted-foreground">Filter</span>
			<!-- Value and raw-expression inputs report every keystroke; they save when left. -->
			<div class="min-w-0 flex-1" data-rule-filter oninputcapture={() => (typing = true)} onchange={commitFilter}>
				<FilterPanel
					showGlobal={false}
					globalFilters={[]}
					viewFilters={groups}
					{availableProperties}
					propertyIndex={collectionStore.propertyIndex}
					onGlobalFiltersChange={() => {}}
					onViewFiltersChange={handleFiltersChange}
				/>
			</div>
		</div>
		<Button
			variant="ghost"
			size="sm"
			class="ml-[6.5rem] h-7 w-fit gap-1 px-2 text-muted-foreground"
			onclick={addExpression}
		>
			<PlusIcon class="size-3" />
			Add expression
		</Button>
		{#if blankValue}
			<p class="ml-[6.5rem] text-meta text-destructive" data-rule-filter-error>{BLANK_VALUE_ERROR}</p>
		{:else if matchCount !== null && countedFilter === filterDraft}
			<p class="ml-[6.5rem] text-meta text-muted-foreground" data-match-count>
				Matches {matchCount} {matchCount === 1 ? 'note' : 'notes'} now
			</p>
		{/if}
	</div>

	<!-- Then: the rule's consequences -->
	<span class="text-meta font-medium text-muted-foreground">Then</span>

	<!-- Destination folder + icon row -->
	<div class="flex items-center gap-2">
		<span class="w-24 shrink-0 text-meta text-muted-foreground">Move to folder</span>
		<Input
			class="flex-1"
			value={rule.destination}
			placeholder="Empty: do not move"
			oninput={(e) => onupdate(rule.id, { destination: (e.currentTarget as HTMLInputElement).value })}
		/>
		<Button
			variant="outline"
			size="icon"
			class="size-7 shrink-0"
			title={rule.icon ? `Icon: ${rule.icon.iconPack}:${rule.icon.iconName}` : 'Set file icon'}
			onclick={() => iconPickerOpen = true}
		>
			{@const resolvedIcon = getResolvedIcon()}
			{#if resolvedIcon}
				<IconRenderer icon={resolvedIcon} class="size-3.5" color={rule.icon?.color} />
			{:else}
				<ImageIcon class="size-3.5 text-muted-foreground" />
			{/if}
		</Button>
	</div>

	<div class="flex items-start gap-2">
		<span class="w-24 shrink-0 pt-2 text-meta text-muted-foreground">Set properties</span>
		<div class="flex min-w-0 flex-1 flex-col gap-2">
			{#each properties as property, i (i)}
				<AutoMoveRuleProperty
					{property}
					listId={keyListId}
					onchange={(next) => setProperties(properties.map((p, j) => (j === i ? next : p)))}
					onremove={() => setProperties(properties.filter((_, j) => j !== i))}
				/>
			{/each}
			<Button variant="outline" size="sm" class="self-start" onclick={addProperty}>
				<PlusIcon class="size-3.5" />
				Add property
			</Button>
		</div>
	</div>

	{#if doesNothing}
		<p class="text-meta text-destructive" data-rule-hint>
			This rule does nothing: set a folder to move to or a property to set.
		</p>
	{/if}

	<datalist id={keyListId}>
		{#each keySuggestions as key (key)}
			<option value={key}></option>
		{/each}
	</datalist>
</div>

<IconPicker
	bind:open={iconPickerOpen}
	currentPack={rule.icon?.iconPack}
	currentName={rule.icon?.iconName}
	currentColor={rule.icon?.color}
	currentTextColor={rule.icon?.textColor}
	onSelect={handleIconSelect}
	onRemove={handleIconRemove}
	onClose={() => iconPickerOpen = false}
/>
