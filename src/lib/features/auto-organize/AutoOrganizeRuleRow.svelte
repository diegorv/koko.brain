<script lang="ts">
	import { untrack } from 'svelte';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
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
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { ruleActionsStore } from '#lib/core/rule-actions/rule-actions.store.svelte.js';
	import type { AutoOrganizeRule, RuleCreateNote, RuleProperty, RuleRename } from './auto-organize.types';
	import type { IconPackId } from '#lib/features/file-icons/file-icons.types.js';
	import {
		BLANK_VALUE_ERROR,
		countMatchingNotes,
		countNotesToCreate,
		hasBlankValue,
		isRefusedKey,
		isValidCreatePath,
		isValidTemplatePath,
		renameProblem,
		sanitizeCreateNote,
		sanitizeRename,
		sanitizeRuleProperties,
		sanitizeRunAction,
	} from './auto-organize.logic';
	import { autoOrganizeStore } from './auto-organize.store.svelte';
	import AutoOrganizeRuleProperty from './AutoOrganizeRuleProperty.svelte';

	let {
		rule,
		isFirst,
		isLast,
		onupdate,
		onremove,
		onmoveup,
		onmovedown,
	}: {
		rule: AutoOrganizeRule;
		isFirst: boolean;
		isLast: boolean;
		onupdate: (id: string, updates: Partial<AutoOrganizeRule>) => void;
		onremove: (id: string) => void;
		onmoveup: (id: string) => void;
		onmovedown: (id: string) => void;
	} = $props();

	/** How long the filter must stay unchanged before its match count is recomputed */
	const COUNT_DELAY_MS = 300;
	/**
	 * The mod action Select's value for "no action". `sanitizeRunAction` trims
	 * every saved id, so none starts with a space, even a hand-edited one.
	 */
	const NO_ACTION = ' none';

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

	/** The rule's `createNote` as a run uses it; undefined when it has none or its path is invalid */
	let validCreate = $derived(sanitizeCreateNote(rule.createNote));
	/** How many notes the counted filter would create now; null without a valid `createNote` or a valid filter */
	let createCount = $derived(
		validCreate
			? countNotesToCreate(countedFilter, validCreate, collectionStore.propertyIndex, vaultStore.path ?? '', {
					protectedFolders: [settingsStore.templates.systemFolder, settingsStore.templates.folder],
					excludedFolders: autoOrganizeStore.excludedFolders,
				})
			: null,
	);

	let properties = $derived(rule.properties ?? []);
	let createProperties = $derived(rule.createNote?.properties ?? []);
	/** The rule's mod action id as a run reads it; undefined when it has none */
	let actionId = $derived(sanitizeRunAction(rule.runAction)?.id);
	/** True when the rule neither renames, moves, sets, creates nor runs anything, so it does nothing */
	let doesNothing = $derived(
		!rule.destination.trim() &&
			sanitizeRuleProperties(rule.properties).length === 0 &&
			validCreate === undefined &&
			sanitizeRename(rule.rename) === undefined &&
			actionId === undefined,
	);
	/** True when the saved action is not registered: no loaded mod lists it in `ruleActions` */
	let actionMissing = $derived(actionId !== undefined && !ruleActionsStore.list.some((a) => a.id === actionId));
	/** The mod action choices: none, every registered rule action, and a saved one that is not loaded */
	let actionOptions = $derived([
		{ value: NO_ACTION, label: 'None' },
		...ruleActionsStore.list.map((a) => ({ value: a.id, label: a.label })),
		...(actionMissing ? [{ value: actionId!, label: `${actionId} (not loaded)` }] : []),
	]);
	let actionValue = $derived(actionId ?? NO_ACTION);
	/** Known note properties for the key field; `file.*` fields are read-only and refused keys never written */
	let keySuggestions = $derived(
		properties.length > 0 || createProperties.length > 0
			? getAllKnownProperties(collectionStore.propertyIndex).filter((key) => !key.startsWith('file.') && !isRefusedKey(key))
			: [],
	);
	let keyListId = $derived(`auto-organize-keys-${rule.id}`);

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

	/**
	 * Set when the typed path or template is refused and kept unsaved: a run
	 * ignores a `createNote` with an invalid path or template, with its
	 * template, properties and "Open it".
	 */
	let pathRefused = $state(false);
	let templateRefused = $state(false);
	/** True when the path field shows a path a run would refuse */
	let pathInvalid = $derived(pathRefused || (rule.createNote !== undefined && !isValidCreatePath(rule.createNote.path)));
	/** True when the template field shows a template a run would refuse */
	let templateInvalid = $derived(
		templateRefused || (rule.createNote?.template !== undefined && !isValidTemplatePath(rule.createNote.template)),
	);

	/** Saves the create-note path; a blank path removes the consequence. An invalid path is not saved. */
	function commitCreatePath(raw: string) {
		const path = raw.trim();
		pathRefused = path !== '' && !isValidCreatePath(path);
		if (pathRefused || path === (rule.createNote?.path ?? '')) return;
		onupdate(rule.id, { createNote: path ? { ...rule.createNote, path } : undefined });
	}

	function updateCreateNote(changes: Partial<RuleCreateNote>) {
		if (rule.createNote) onupdate(rule.id, { createNote: { ...rule.createNote, ...changes } });
	}

	function commitCreateTemplate(raw: string) {
		const template = raw.trim();
		templateRefused = !isValidTemplatePath(template);
		if (templateRefused || template === (rule.createNote?.template ?? '')) return;
		updateCreateNote({ template: template || undefined });
	}

	function setCreateProperties(next: RuleProperty[]) {
		updateCreateNote({ properties: next });
	}

	const RENAME_SOURCES = { name: 'Name', expr: 'Expression' } as const;
	/** Whether the rename field holds a name template or an expression */
	let renameSource = $state<keyof typeof RENAME_SOURCES>(untrack(() => (rule.rename?.expr !== undefined ? 'expr' : 'name')));
	/** The kind of the stored rename; a choice made on a blank field holds until the stored kind changes */
	let storedRenameSource = $derived<keyof typeof RENAME_SOURCES>(rule.rename?.expr !== undefined ? 'expr' : 'name');
	/** The rename field's text since the last save, which the rule does not hold yet; null when it shows the rule's */
	let renameDraft = $state<string | null>(null);
	$effect(() => {
		const stored = storedRenameSource;
		if (untrack(() => renameDraft) === null) renameSource = stored;
	});
	/** Why the last typed rename was not saved; cleared by the next save */
	let renameRefusal = $state<string | null>(null);
	/** The refusal, else why a run ignores the stored rename */
	let renameError = $derived(renameRefusal ?? (rule.rename !== undefined ? renameProblem(rule.rename) : null));

	/** Saves the rename field's text as `source`; blank removes the rename, a refused one is shown and not saved. */
	function commitRename(raw: string, source: keyof typeof RENAME_SOURCES) {
		const text = raw.trim();
		if (text === '') {
			renameRefusal = null;
			renameDraft = null;
			if (rule.rename !== undefined) onupdate(rule.id, { rename: undefined });
			return;
		}
		const next: RuleRename = source === 'expr' ? { expr: text } : { name: text };
		renameRefusal = renameProblem(next);
		if (renameRefusal !== null) return;
		renameDraft = null;
		if (JSON.stringify(next) !== JSON.stringify(rule.rename)) onupdate(rule.id, { rename: next });
	}

	function setRenameSource(source: keyof typeof RENAME_SOURCES) {
		if (source === renameSource) return;
		renameSource = source;
		commitRename(renameDraft ?? rule.rename?.name ?? rule.rename?.expr ?? '', source);
	}

	/** Saves the picked mod action; `NO_ACTION` removes it */
	function setRunAction(value: string) {
		if (value === actionValue) return;
		onupdate(rule.id, { runAction: value === NO_ACTION ? undefined : { id: value } });
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
			<div class="ml-[6.5rem] flex flex-wrap gap-x-3 text-meta text-muted-foreground">
				<p data-match-count>Matches {matchCount} {matchCount === 1 ? 'note' : 'notes'} now</p>
				{#if createCount !== null}
					<p data-create-count>Would create {createCount} {createCount === 1 ? 'note' : 'notes'} now</p>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Then: the rule's consequences -->
	<span class="text-meta font-medium text-muted-foreground">Then</span>

	<div class="flex items-start gap-2">
		<span class="w-24 shrink-0 pt-2 text-meta text-muted-foreground">Rename</span>
		<div class="flex min-w-0 flex-1 flex-col gap-1">
			<div class="flex items-center gap-2">
				<Select.Root
					type="single"
					value={renameSource}
					onValueChange={(v) => setRenameSource(v as keyof typeof RENAME_SOURCES)}
				>
					<Select.Trigger class="w-28 shrink-0" aria-label="Rename source">
						<span data-slot="select-value">{RENAME_SOURCES[renameSource]}</span>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="name" label={RENAME_SOURCES.name} />
						<Select.Item value="expr" label={RENAME_SOURCES.expr} />
					</Select.Content>
				</Select.Root>
				<Input
					class="flex-1"
					aria-label="Rename to"
					value={rule.rename?.name ?? rule.rename?.expr ?? ''}
					placeholder={renameSource === 'expr' ? 'Empty: do not rename, e.g. title' : 'Empty: do not rename, e.g. {year}-{month} Meeting'}
					oninput={(e) => (renameDraft = (e.currentTarget as HTMLInputElement).value)}
					onchange={(e) => commitRename((e.currentTarget as HTMLInputElement).value, renameSource)}
				/>
			</div>
			{#if renameError !== null}
				<p class="text-meta text-destructive" data-rename-error>{renameError}</p>
			{/if}
		</div>
	</div>

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
				<AutoOrganizeRuleProperty
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

	<div class="flex items-start gap-2">
		<span class="w-24 shrink-0 pt-2 text-meta text-muted-foreground">Create note</span>
		<div class="flex min-w-0 flex-1 flex-col gap-2">
			<Input
				aria-label="Create note path"
				value={rule.createNote?.path ?? ''}
				placeholder={'Empty: do not create, e.g. {folder}/{basename} follow-up.md'}
				onchange={(e) => commitCreatePath((e.currentTarget as HTMLInputElement).value)}
			/>
			{#if pathInvalid}
				<p class="text-meta text-destructive" data-create-error>
					The path must end in .md and must not start with /. It is not saved.
				</p>
			{/if}
			{#if rule.createNote}
				<Input
					aria-label="Create note template"
					value={rule.createNote.template ?? ''}
					placeholder="Template note, e.g. _system/templates/Follow-up.md (empty: no template)"
					onchange={(e) => commitCreateTemplate((e.currentTarget as HTMLInputElement).value)}
				/>
				{#if templateInvalid}
					<p class="text-meta text-destructive" data-create-template-error>
						The template must be inside the vault: no .. and not starting with /. It is not saved.
					</p>
				{/if}
				{#each createProperties as property, i (i)}
					<AutoOrganizeRuleProperty
						{property}
						listId={keyListId}
						allowRemove={false}
						onchange={(next) => setCreateProperties(createProperties.map((p, j) => (j === i ? next : p)))}
						onremove={() => setCreateProperties(createProperties.filter((_, j) => j !== i))}
					/>
				{/each}
				<Button
					variant="outline"
					size="sm"
					class="self-start"
					onclick={() => setCreateProperties([...createProperties, { key: '', value: '', mode: 'if-missing' }])}
				>
					<PlusIcon class="size-3.5" />
					Add note property
				</Button>
				<label class="flex items-center gap-2 text-meta">
					<Switch
						aria-label="Open it"
						checked={rule.createNote.open === true}
						onCheckedChange={(open) => updateCreateNote({ open: open || undefined })}
					/>
					Open it
				</label>
			{/if}
		</div>
	</div>

	<div class="flex items-start gap-2">
		<span class="w-24 shrink-0 pt-2 text-meta text-muted-foreground">Run mod action</span>
		<div class="flex min-w-0 flex-1 flex-col gap-1">
			<Select.Root type="single" value={actionValue} onValueChange={setRunAction}>
				<Select.Trigger class="w-full" aria-label="Mod action">
					<span data-slot="select-value">{actionOptions.find((o) => o.value === actionValue)?.label}</span>
				</Select.Trigger>
				<Select.Content>
					{#each actionOptions as option (option.value)}
						<Select.Item value={option.value} label={option.label} />
					{/each}
				</Select.Content>
			</Select.Root>
			{#if actionMissing}
				<p class="text-meta text-destructive" data-run-action-missing>
					No loaded mod lists this action in its ruleActions, so the rule skips it.
				</p>
			{/if}
		</div>
	</div>

	{#if doesNothing}
		<p class="text-meta text-destructive" data-rule-hint>
			This rule does nothing: set a new name, a folder to move to, a property to set, a note to create or a mod action to run.
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
