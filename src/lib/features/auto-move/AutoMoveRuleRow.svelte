<script lang="ts">
	import { untrack } from 'svelte';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import CircleXIcon from '@lucide/svelte/icons/circle-x';
	import ImageIcon from '@lucide/svelte/icons/image';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import IconPicker from '#lib/features/file-icons/IconPicker.svelte';
	import IconRenderer from '#lib/features/file-icons/IconRenderer.svelte';
	import { getIconSync } from '#lib/features/file-icons/file-icons.icon-data.js';
	import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
	import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
	import { getAllKnownProperties } from '#lib/features/collection/toolbar/filter.logic.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import type { AutoMoveRule, RuleProperty } from './auto-move.types';
	import type { IconPackId } from '#lib/features/file-icons/file-icons.types.js';
	import { countMatchingNotes, isRefusedKey, sanitizeRuleProperties, validateExpression } from './auto-move.logic';
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
	 * The filter as typed. It reaches the rule only on change or blur: a rule
	 * runs on every save, so a half-typed filter must never be live.
	 */
	let filterDraft = $derived(rule.expression);
	let expressionError = $derived(validateExpression(filterDraft));
	let iconPickerOpen = $state(false);

	/** The filter the match count was last computed for, behind the typing by `COUNT_DELAY_MS` */
	let countedFilter = $state(untrack(() => rule.expression));
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

	function commitExpression() {
		if (filterDraft !== rule.expression) onupdate(rule.id, { expression: filterDraft });
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

	<!-- Expression input -->
	<div class="flex flex-col gap-1">
		<div class="flex items-center gap-2">
			<span class="w-24 shrink-0 text-meta text-muted-foreground">Expression</span>
			<div class="relative flex-1">
				<Input
					class="pr-7 font-mono {expressionError && filterDraft.trim() ? 'border-destructive' : ''}"
					aria-label="Filter"
					value={filterDraft}
					placeholder="file.hasTag('archive') && status == 'done'"
					oninput={(e) => (filterDraft = (e.currentTarget as HTMLInputElement).value)}
					onchange={commitExpression}
				/>
				{#if filterDraft.trim()}
					<div class="absolute right-2 top-1/2 -translate-y-1/2">
						{#if expressionError}
							<CircleXIcon class="size-3.5 text-destructive" />
						{:else}
							<CircleCheckIcon class="size-3.5 text-green-500" />
						{/if}
					</div>
				{/if}
			</div>
		</div>
		{#if expressionError && filterDraft.trim()}
			<p class="ml-[6.5rem] text-meta text-destructive">{expressionError}</p>
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
