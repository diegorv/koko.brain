<script lang="ts">
	import { flushSync } from 'svelte';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { tasksStore } from './tasks.store.svelte';
	import { setTaskExcludes, setTaskSources } from './tasks.service';
	import type { HeadingMatchMode } from './task-headings.logic';
	import { sourceSuggestions, type LifecycleState, type PropertyOp, type TaskExcludes, type TaskSource, type TaskSourceClause } from './task-query.logic';

	interface Props {
		/** The panel's element id, which the view's Edit button names in `aria-controls` */
		id: string;
	}

	let { id }: Props = $props();

	type ClauseKind = TaskSourceClause['kind'];

	/** The Add clause menu's kinds, in menu order, with each one's label (also its value field's name). */
	const CLAUSE_KINDS: { kind: ClauseKind; label: string }[] = [
		{ kind: 'folder', label: 'Folder' },
		{ kind: 'type', label: 'Type' },
		{ kind: 'noteTag', label: 'Note tag' },
		{ kind: 'heading', label: 'Heading' },
		{ kind: 'property', label: 'Property' },
		{ kind: 'lifecycle', label: 'Lifecycle' },
	];
	const KIND_LABEL = Object.fromEntries(CLAUSE_KINDS.map((k) => [k.kind, k.label])) as Record<ClauseKind, string>;

	/** The property clause's ops, in menu order, with the words its dropdown shows. */
	const PROPERTY_OPS: { op: PropertyOp; label: string }[] = [
		{ op: 'is', label: 'is' },
		{ op: 'isNot', label: 'is not' },
		{ op: 'contains', label: 'contains' },
		{ op: 'exists', label: 'exists' },
	];
	const OP_LABEL = Object.fromEntries(PROPERTY_OPS.map((o) => [o.op, o.label])) as Record<PropertyOp, string>;

	/** The lifecycle clause's states, in menu order, with the words its dropdown shows. */
	const LIFECYCLE_STATES: { state: LifecycleState; label: string }[] = [
		{ state: 'inbox', label: 'Inbox' },
		{ state: 'organized', label: 'Organized' },
		{ state: 'favorite', label: 'Favorite' },
		{ state: 'archived', label: 'Archived' },
	];
	const STATE_LABEL = Object.fromEntries(LIFECYCLE_STATES.map((s) => [s.state, s.label])) as Record<LifecycleState, string>;

	/** The four exclude switches, in display order. */
	const SWITCHES: { key: 'archived' | 'typeDefinitions' | 'templatesFolder' | 'systemFolder'; label: string }[] = [
		{ key: 'archived', label: 'Archived notes' },
		{ key: 'typeDefinitions', label: 'Type definitions' },
		{ key: 'templatesFolder', label: 'Templates folder' },
		{ key: 'systemFolder', label: 'System folder' },
	];

	/** The four exclude lists; `noun` names the input, its Add button and each entry's remove button. */
	const LISTS: { key: 'folders' | 'notes' | 'tags' | 'types'; label: string; noun: string; placeholder: string }[] = [
		{ key: 'folders', label: 'Folders', noun: 'excluded folder', placeholder: 'Archive/Old' },
		{ key: 'notes', label: 'Notes', noun: 'excluded note', placeholder: 'Inbox/Scratch.md' },
		{ key: 'tags', label: 'Note tags', noun: 'excluded note tag', placeholder: '#someday' },
		{ key: 'types', label: 'Types', noun: 'excluded type', placeholder: 'Meeting' },
	];

	let panelEl: HTMLElement | undefined;

	let sources = $derived(tasksStore.query.sources);
	/** The Excludes section edits the global excludes, which every list applies. */
	let exclude = $derived(tasksStore.globalExcludes);
	/** Read only while a suggestions menu is open, so the panel does not walk the rows on every change. */
	let suggestions = $derived(sourceSuggestions(tasksStore.rows));

	/** Text typed into each exclude list's input and not added yet. */
	let drafts = $state<Record<(typeof LISTS)[number]['key'], string>>({ folders: '', notes: '', tags: '', types: '' });

	/** A new clause of `kind` with an empty value, which is inactive until typed into; a lifecycle clause starts at `inbox`. */
	function emptyClause(kind: ClauseKind): TaskSourceClause {
		switch (kind) {
			case 'folder':
				return { kind, path: '' };
			case 'type':
				return { kind, type: '' };
			case 'noteTag':
				return { kind, tag: '' };
			case 'heading':
				return { kind, text: '', match: 'tag' };
			case 'property':
				return { kind, key: '', op: 'is', value: '' };
			case 'lifecycle':
				return { kind, state: 'inbox' };
		}
	}

	/** The value a clause's text field shows; a property clause's Value field (its Key field reads `key`); a lifecycle clause has none. */
	function clauseValue(clause: TaskSourceClause): string {
		switch (clause.kind) {
			case 'folder':
				return clause.path;
			case 'type':
				return clause.type;
			case 'noteTag':
				return clause.tag;
			case 'heading':
				return clause.text;
			case 'property':
				return clause.value ?? '';
			case 'lifecycle':
				return '';
		}
	}

	/** The suggestions for a clause's text field; a property clause's for its Value field, read under its trimmed key. */
	function valueSuggestions(clause: TaskSourceClause): string[] {
		switch (clause.kind) {
			case 'folder':
				return suggestions.folders;
			case 'type':
				return suggestions.types;
			case 'noteTag':
				return suggestions.tags;
			case 'heading':
				return suggestions.headingTags;
			case 'property':
				return suggestions.values.get(clause.key.trim()) ?? [];
			case 'lifecycle':
				return [];
		}
	}

	/** `clause` with its value set to `value`; a lifecycle clause, which has no text value, unchanged. */
	function withValue(clause: TaskSourceClause, value: string): TaskSourceClause {
		switch (clause.kind) {
			case 'folder':
				return { ...clause, path: value };
			case 'type':
				return { ...clause, type: value };
			case 'noteTag':
				return { ...clause, tag: value };
			case 'heading':
				return { ...clause, text: value };
			case 'property':
				return { ...clause, value };
			case 'lifecycle':
				return clause;
		}
	}

	/** Replaces card `ci` with what `change` returns for it. */
	function updateCard(ci: number, change: (card: TaskSource) => TaskSource) {
		setTaskSources(sources.map((card, i) => (i === ci ? change(card) : card)));
	}

	/** Replaces clause `li` of card `ci` with what `change` returns for it. */
	function updateClause(ci: number, li: number, change: (clause: TaskSourceClause) => TaskSourceClause) {
		updateCard(ci, (card) => ({ clauses: card.clauses.map((c, i) => (i === li ? change(c) : c)) }));
	}

	/** Sets a heading clause's match mode; other kinds have none. */
	function setMatch(ci: number, li: number, match: HeadingMatchMode) {
		updateClause(ci, li, (c) => (c.kind === 'heading' ? { ...c, match } : c));
	}

	/** Sets a folder, type or note tag clause's `negate`; heading, property and lifecycle clauses have none. */
	function setNegate(ci: number, li: number, negate: boolean) {
		updateClause(ci, li, (c) => (c.kind === 'heading' || c.kind === 'property' || c.kind === 'lifecycle' ? c : { ...c, negate }));
	}

	/** Sets a lifecycle clause's state; other kinds have none. */
	function setState(ci: number, li: number, state: LifecycleState) {
		updateClause(ci, li, (c) => (c.kind === 'lifecycle' ? { ...c, state } : c));
	}

	/** Sets a property clause's key or op. Switching to `exists` keeps the value, which it ignores. */
	function setProperty(ci: number, li: number, change: { key: string } | { op: PropertyOp }) {
		updateClause(ci, li, (c) => (c.kind === 'property' ? { ...c, ...change } : c));
	}

	/**
	 * After a removal that deletes the focused button: renders it, then focuses
	 * the first candidate `pick` finds in the panel. Focus left on `<body>`
	 * would be taken into the list by TasksView's order effect.
	 */
	function refocus(pick: (panel: HTMLElement) => (Element | null | undefined)[]) {
		flushSync();
		const target = panelEl && pick(panelEl).find((el) => el instanceof HTMLElement);
		(target as HTMLElement | undefined)?.focus();
	}

	function addCard() {
		setTaskSources([...sources, { clauses: [] }]);
	}

	function removeCard(ci: number) {
		setTaskSources(sources.filter((_, i) => i !== ci));
		// The card now at `ci` (the next one), else the previous card, else Add card.
		refocus((panel) => {
			const cards = panel.querySelectorAll('[data-task-source-card]');
			return [cards[ci], cards[ci - 1]].map((c) => c?.querySelector('[data-remove-card]')).concat(panel.querySelector('[data-add-card]'));
		});
	}

	function addClause(ci: number, kind: ClauseKind) {
		updateCard(ci, (card) => ({ clauses: [...card.clauses, emptyClause(kind)] }));
	}

	function removeClause(ci: number, li: number) {
		updateCard(ci, (card) => ({ clauses: card.clauses.filter((_, i) => i !== li) }));
		// The clause now at `li` (the next one), else the previous clause, else the card's Add clause.
		refocus((panel) => {
			const card = panel.querySelectorAll('[data-task-source-card]')[ci];
			const removes = card?.querySelectorAll('[data-remove-clause]');
			return [removes?.[li], removes?.[li - 1], card?.querySelector('[data-add-clause]')];
		});
	}

	function setExclude(partial: Partial<TaskExcludes>) {
		setTaskExcludes({ ...exclude, ...partial });
	}

	/** Adds the list's draft, trimmed, unless it is blank or already listed, and empties the input. */
	function addEntry(key: (typeof LISTS)[number]['key']) {
		const value = drafts[key].trim();
		drafts[key] = '';
		if (!value || exclude[key].includes(value)) return;
		setExclude({ [key]: [...exclude[key], value] });
	}

	function removeEntry(key: (typeof LISTS)[number]['key'], value: string) {
		const index = exclude[key].indexOf(value);
		setExclude({ [key]: exclude[key].filter((v) => v !== value) });
		// The next entry, else the previous one, else the list's input.
		refocus((panel) => {
			const list = panel.querySelector(`[data-exclude-list="${key}"]`);
			const removes = list?.querySelectorAll('[data-remove-entry]');
			return [removes?.[index], removes?.[index - 1], list?.querySelector('input')];
		});
	}
</script>

{#snippet picker(label: string, options: () => string[], choose: (value: string) => void)}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="ghost" size="icon-sm" class="size-7 shrink-0 text-muted-foreground" aria-label={label}>
					<ChevronDown class="size-3.5" aria-hidden="true" />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="start" class="max-h-64 w-56">
			{#each options() as option (option)}
				<DropdownMenu.Item onSelect={() => choose(option)}>{option}</DropdownMenu.Item>
			{:else}
				<DropdownMenu.Item disabled>No suggestions</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/snippet}

<div bind:this={panelEl} {id} data-task-sources-panel role="region" aria-label="Sources and excludes" class="mb-3 space-y-4 rounded-md border border-border bg-muted/30 p-3">
	<section data-task-sources aria-label="Sources" class="space-y-2">
		<div>
			<h3 class="text-meta font-medium text-foreground">Sources</h3>
			<p class="text-meta text-muted-foreground">A task is listed when every clause of one card matches.</p>
		</div>
		{#each sources as card, ci (ci)}
			<div data-task-source-card role="group" aria-label="Card {ci + 1}" class="space-y-2 rounded-md border border-border bg-background p-2">
				{#each card.clauses as clause, li (li)}
					<div class="flex flex-wrap items-center gap-2">
						<span class="w-16 shrink-0 text-meta text-muted-foreground">{KIND_LABEL[clause.kind]}</span>
						{#if clause.kind === 'property'}
							<Input
								type="text"
								class="h-7 w-28 min-w-0 flex-1 text-meta md:text-meta"
								placeholder="status"
								value={clause.key}
								aria-label="Property key"
								oninput={(e) => setProperty(ci, li, { key: (e.currentTarget as HTMLInputElement).value })}
							/>
							{@render picker('Key suggestions', () => suggestions.keys, (key) => setProperty(ci, li, { key }))}
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button {...props} variant="ghost" size="sm" class="h-7 px-2 text-meta" aria-label="Operator: {OP_LABEL[clause.op]}">
											{OP_LABEL[clause.op]}
											<ChevronDown class="size-3" aria-hidden="true" />
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="start" class="w-32">
									<DropdownMenu.RadioGroup value={clause.op} onValueChange={(value) => setProperty(ci, li, { op: value as PropertyOp })}>
										{#each PROPERTY_OPS as option (option.op)}
											<DropdownMenu.RadioItem value={option.op}>{option.label}</DropdownMenu.RadioItem>
										{/each}
									</DropdownMenu.RadioGroup>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
							{#if clause.op !== 'exists'}
								<Input
									type="text"
									class="h-7 w-28 min-w-0 flex-1 text-meta md:text-meta"
									placeholder="active"
									value={clauseValue(clause)}
									aria-label="Property value"
									oninput={(e) => updateClause(ci, li, (c) => withValue(c, (e.currentTarget as HTMLInputElement).value))}
								/>
								{@render picker('Suggestions', () => valueSuggestions(clause), (value) => updateClause(ci, li, (c) => withValue(c, value)))}
							{/if}
						{:else if clause.kind === 'lifecycle'}
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button {...props} variant="ghost" size="sm" class="h-7 px-2 text-meta" aria-label="State: {STATE_LABEL[clause.state]}">
											{STATE_LABEL[clause.state]}
											<ChevronDown class="size-3" aria-hidden="true" />
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="start" class="w-32">
									<DropdownMenu.RadioGroup value={clause.state} onValueChange={(value) => setState(ci, li, value as LifecycleState)}>
										{#each LIFECYCLE_STATES as option (option.state)}
											<DropdownMenu.RadioItem value={option.state}>{option.label}</DropdownMenu.RadioItem>
										{/each}
									</DropdownMenu.RadioGroup>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						{:else}
							<Input
								type="text"
								class="h-7 w-40 min-w-0 flex-1 text-meta md:text-meta"
								value={clauseValue(clause)}
								aria-label={KIND_LABEL[clause.kind]}
								oninput={(e) => updateClause(ci, li, (c) => withValue(c, (e.currentTarget as HTMLInputElement).value))}
							/>
							{@render picker('Suggestions', () => valueSuggestions(clause), (value) => updateClause(ci, li, (c) => withValue(c, value)))}
						{/if}
						{#if clause.kind === 'heading'}
							<div role="group" aria-label="Heading match" class="flex items-center gap-1">
								<Button
									size="sm"
									variant={clause.match === 'tag' ? 'secondary' : 'ghost'}
									class="h-7 px-2 text-meta"
									aria-pressed={clause.match === 'tag'}
									onclick={() => setMatch(ci, li, 'tag')}
								>
									Tag
								</Button>
								<Button
									size="sm"
									variant={clause.match === 'substring' ? 'secondary' : 'ghost'}
									class="h-7 px-2 text-meta"
									aria-pressed={clause.match === 'substring'}
									onclick={() => setMatch(ci, li, 'substring')}
								>
									Contains
								</Button>
							</div>
						{:else if clause.kind !== 'property' && clause.kind !== 'lifecycle'}
							<span class="flex items-center gap-1.5 text-meta text-muted-foreground">
								<Switch
									aria-label="Not"
									checked={clause.negate ?? false}
									onCheckedChange={(checked) => setNegate(ci, li, checked)}
								/>
								<span aria-hidden="true">Not</span>
							</span>
						{/if}
						<Button
							variant="ghost"
							size="icon-sm"
							class="size-7 text-muted-foreground"
							aria-label="Remove clause"
							data-remove-clause
							onclick={() => removeClause(ci, li)}
						>
							<X class="size-3.5" />
						</Button>
					</div>
				{:else}
					<p class="text-meta text-muted-foreground">No clause: this card matches every note.</p>
				{/each}
				<div class="flex items-center gap-2">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button {...props} variant="ghost" size="sm" class="h-7 px-2 text-meta" data-add-clause>
									<Plus class="size-3.5" />
									Add clause
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="start" class="w-40">
							{#each CLAUSE_KINDS as option (option.kind)}
								<DropdownMenu.Item onSelect={() => addClause(ci, option.kind)}>{option.label}</DropdownMenu.Item>
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
					<Button variant="ghost" size="sm" class="h-7 px-2 text-meta text-muted-foreground" data-remove-card onclick={() => removeCard(ci)}>
						Remove card
					</Button>
				</div>
			</div>
		{/each}
		<Button variant="outline" size="sm" class="h-7 px-2 text-meta" data-add-card onclick={addCard}>
			<Plus class="size-3.5" />
			Add card
		</Button>
	</section>

	<section data-task-excludes aria-label="Excludes" class="space-y-2">
		<div>
			<h3 class="text-meta font-medium text-foreground">Excludes</h3>
			<p class="text-meta text-muted-foreground">Never listed, whatever the sources say.</p>
		</div>
		<div class="flex flex-wrap gap-x-4 gap-y-2">
			{#each SWITCHES as item (item.key)}
				<span class="flex items-center gap-1.5 text-meta text-foreground">
					<Switch
						aria-label={item.label}
						checked={exclude[item.key]}
						onCheckedChange={(checked) => setExclude({ [item.key]: checked })}
					/>
					<span aria-hidden="true">{item.label}</span>
				</span>
			{/each}
		</div>
		<div class="grid gap-3 @min-[560px]:grid-cols-2">
			{#each LISTS as list (list.key)}
				<div class="space-y-1" data-exclude-list={list.key}>
					<span class="text-meta text-muted-foreground">{list.label}</span>
					<div class="flex items-center gap-1">
						<Input
							type="text"
							class="h-7 min-w-0 flex-1 text-meta md:text-meta"
							placeholder={list.placeholder}
							aria-label={list.noun.charAt(0).toUpperCase() + list.noun.slice(1)}
							bind:value={drafts[list.key]}
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									addEntry(list.key);
								}
							}}
						/>
						<Button variant="ghost" size="sm" class="h-7 px-2 text-meta" aria-label="Add {list.noun}" onclick={() => addEntry(list.key)}>
							Add
						</Button>
					</div>
					{#if exclude[list.key].length > 0}
						<ul class="flex flex-wrap gap-1">
							{#each exclude[list.key] as value (value)}
								<li class="flex items-center gap-1 rounded-sm bg-muted px-1.5 text-meta text-foreground">
									<span>{value}</span>
									<Button
										variant="ghost"
										size="icon-sm"
										class="size-5 text-muted-foreground"
										aria-label="Remove {list.noun} {value}"
										data-remove-entry
										onclick={() => removeEntry(list.key, value)}
									>
										<X class="size-3" />
									</Button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		</div>
	</section>
</div>
