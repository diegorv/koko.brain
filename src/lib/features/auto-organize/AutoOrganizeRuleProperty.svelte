<script lang="ts">
	import XIcon from '@lucide/svelte/icons/x';
	import ImageIcon from '@lucide/svelte/icons/image';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import IconPicker from '#lib/features/file-icons/IconPicker.svelte';
	import IconRenderer from '#lib/features/file-icons/IconRenderer.svelte';
	import { getIconSync } from '#lib/features/file-icons/file-icons.icon-data.js';
	import { parseIconValuePermissive } from '#lib/features/file-icons/file-icons.logic.js';
	import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
	import type { IconPackId } from '#lib/features/file-icons/file-icons.types.js';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { isMarkdownFile } from '#lib/core/filesystem/fs.logic.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
	import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
	import { canonicalizeKey } from '#lib/utils/frontmatter-aliases.js';
	import type { RuleProperty } from './auto-organize.types';
	import {
		computeRuleValue,
		exprProblem,
		isBooleanOnlyKey,
		isRefusedKey,
		parseRuleItems,
		ruleRecordStats,
		ruleValueEditor,
	} from './auto-organize.logic';

	/** One property consequence of a rule: key, value editor, mode and remove. */
	let {
		property,
		listId,
		onchange,
		onremove,
	}: {
		/** The property as stored in the rule */
		property: RuleProperty;
		/** Id of the `<datalist>` holding the key suggestions */
		listId: string;
		/** Called with the edited property, on change or blur, never per keystroke */
		onchange: (property: RuleProperty) => void;
		/** Called when the row is removed */
		onremove: () => void;
	} = $props();

	const MODE_LABELS: Record<RuleProperty['mode'], string> = {
		'if-missing': 'if missing',
		always: 'always',
		remove: 'remove',
		add: 'add to list',
	};
	const TYPE_LABELS = { text: 'Text', boolean: 'Yes/no' } as const;
	const SOURCE_LABELS = { value: 'Value', expr: 'Expression' } as const;

	/** True when the row computes its value with an expression. */
	let isExpr = $derived(property.mode !== 'remove' && property.expr !== undefined);
	let editor = $derived(ruleValueEditor(property.key, property.value, property.mode));
	/** The text / yes-no chooser is only for keys that accept either. */
	let showTypeChooser = $derived(!isExpr && (editor === 'text' || editor === 'boolean') && !isBooleanOnlyKey(property.key));
	let pickerOpen = $state(false);
	/** Why the last expression or mode the user picked was not saved; cleared by the next save. */
	let exprError = $state<string | null>(null);
	/**
	 * The expression the field shows after a refusal, which `property.expr` does not hold.
	 * A key or mode change saves it in place of the stored one, so following the error's
	 * advice ("works only with if missing") keeps what the user typed.
	 */
	let refusedExpr = $state<string | null>(null);
	/** The expression a key or mode change carries over. */
	let draftExpr = $derived(isExpr ? (refusedExpr ?? property.expr) : undefined);

	/**
	 * The row with `value` fitted to `key` and `mode`, so the loader keeps it:
	 * a `remove` has no value, an `add` holds list items, and the other modes
	 * need a value their key's editor can show. A lifecycle key takes no `add`,
	 * so it becomes `if-missing`, which never overwrites an existing value.
	 * An expression row keeps its `expr`. `from` is the mode the row had.
	 */
	function fitted(
		key: string,
		value: RuleProperty['value'],
		mode: RuleProperty['mode'],
		from: RuleProperty['mode'],
		expr?: string,
	): RuleProperty {
		if (mode === 'remove') return { key, mode };
		if (mode === 'add' && isBooleanOnlyKey(key)) mode = 'if-missing';
		if (expr !== undefined) return { key, expr, mode };
		if (mode === 'add') {
			const items = typeof value === 'string' ? parseRuleItems(value) : Array.isArray(value) ? value : [];
			return { key, value: items, mode };
		}
		let next = value ?? '';
		// An empty or one-item list left by `add` goes back to text, so the field stays
		// editable and an empty list never clears the key on every matching note.
		// A list written for `if-missing` or `always` is the value itself, and stays.
		if (from === 'add' && Array.isArray(next) && next.length <= 1) next = next[0] ?? '';
		// A lifecycle key accepts only a boolean, and the loader drops any other value.
		if (isBooleanOnlyKey(key) && typeof next !== 'boolean') next = false;
		// `_icon` and the color keys take text; any other value would hide their picker.
		const textEditor = ruleValueEditor(key, '', mode);
		if ((textEditor === 'icon' || textEditor === 'color') && typeof next !== 'string') next = '';
		return { key, value: next, mode };
	}

	/** Saves `next` unless its expression is refused, which is shown instead. */
	function save(next: RuleProperty) {
		const problem = next.expr === undefined ? null : exprProblem(next.expr, next.mode);
		// A blank expression is a row just switched to one: saved, and ignored by the rules.
		if (problem !== null && next.expr!.trim() !== '') {
			exprError = problem;
			refusedExpr = next.expr!;
			return;
		}
		exprError = null;
		refusedExpr = null;
		onchange(next);
	}

	function commitKey(raw: string) {
		const key = raw.trim();
		if (key === property.key) return;
		save(fitted(key, property.value, property.mode, property.mode, draftExpr));
	}

	function setMode(mode: RuleProperty['mode']) {
		if (mode === property.mode) return;
		save(fitted(property.key, property.value, mode, property.mode, draftExpr));
	}

	/** Switches between a literal value and an expression; the other one is dropped. */
	function setSource(source: keyof typeof SOURCE_LABELS) {
		if ((source === 'expr') === isExpr) return;
		exprError = null;
		refusedExpr = null;
		if (source === 'expr') onchange(fitted(property.key, undefined, property.mode, property.mode, ''));
		else onchange(fitted(property.key, undefined, property.mode, property.mode));
	}

	function commitExpr(text: string) {
		if (text === property.expr) {
			// Typed back to what is stored: nothing to save, and no refused draft left.
			exprError = null;
			refusedExpr = null;
			return;
		}
		save({ key: property.key, expr: text, mode: property.mode });
	}

	/** The open note an expression row previews its result on: the active tab, when it is a Markdown note. */
	let previewNote = $derived.by(() => {
		const tab = editorStore.activeTab;
		return tab && isMarkdownFile(tab.path) ? tab : null;
	});

	/** "Result for <note>: ..." for the active note, as a save would compute it; null without a note or a valid expression. */
	let preview = $derived.by(() => {
		if (!isExpr || !previewNote || exprProblem(property.expr ?? '', property.mode) !== null) return null;
		const { path, content } = previewNote;
		const record = buildNoteRecord(path, content, ...ruleRecordStats(collectionStore.propertyIndex.get(path), content, Date.now()));
		const computed = computeRuleValue(property, { record, formulas: {}, vaultPath: vaultStore.path ?? '' });
		const shown = 'failure' in computed
			? 'no value'
			: Array.isArray(computed.value) ? computed.value.join(', ') : String(computed.value);
		return { text: `Result for ${record.basename}: ${shown}`, reason: 'failure' in computed ? computed.failure : undefined };
	});

	function setValue(value: RuleProperty['value']) {
		if (value === property.value) return;
		onchange({ ...property, value });
	}

	/** The `add` items as the field shows them. */
	let itemsText = $derived(
		Array.isArray(property.value) ? property.value.join(', ') : typeof property.value === 'string' ? property.value : '',
	);

	function setItems(text: string) {
		const items = parseRuleItems(text);
		if (items.join(', ') === itemsText) return;
		setValue(items);
	}

	/** The picked color for this row's key: the icon color for `_color`, the text color for `_title_color`. */
	function setColor(color?: string, textColor?: string) {
		setValue((canonicalizeKey(property.key) === '_color' ? color : textColor) ?? '');
	}

	function handlePickerSelect(pack: IconPackId, name: string, color?: string, textColor?: string) {
		if (editor === 'icon') setValue(`${pack}:${name}`);
		else setColor(color, textColor);
	}

	let iconRef = $derived(
		editor === 'icon' && typeof property.value === 'string' ? parseIconValuePermissive(property.value) : null,
	);

	/** The `_icon` value resolved for the button (sync lookup from cache) */
	function resolvedIcon() {
		void fileIconsStore.packVersion;
		return iconRef ? (getIconSync(iconRef.iconPack, iconRef.iconName) ?? null) : null;
	}
</script>

<div class="flex items-center gap-2" data-rule-property>
	<Input
		class="w-36 shrink-0"
		aria-label="Property key"
		list={listId}
		value={property.key}
		placeholder="Property"
		onchange={(e) => commitKey((e.currentTarget as HTMLInputElement).value)}
	/>

	{#if property.mode !== 'remove'}
		<Select.Root
			type="single"
			value={isExpr ? 'expr' : 'value'}
			onValueChange={(v) => setSource(v as keyof typeof SOURCE_LABELS)}
		>
			<Select.Trigger class="w-28 shrink-0" aria-label="Property source">
				<span data-slot="select-value">{SOURCE_LABELS[isExpr ? 'expr' : 'value']}</span>
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="value" label={SOURCE_LABELS.value} />
				<Select.Item value="expr" label={SOURCE_LABELS.expr} />
			</Select.Content>
		</Select.Root>
	{/if}

	{#if showTypeChooser}
		<Select.Root
			type="single"
			value={editor === 'boolean' ? 'boolean' : 'text'}
			onValueChange={(v) => v !== (editor === 'boolean' ? 'boolean' : 'text') && setValue(v === 'boolean' ? false : '')}
		>
			<Select.Trigger class="w-24 shrink-0" aria-label="Property type">
				<span data-slot="select-value">{TYPE_LABELS[editor === 'boolean' ? 'boolean' : 'text']}</span>
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="text" label={TYPE_LABELS.text} />
				<Select.Item value="boolean" label={TYPE_LABELS.boolean} />
			</Select.Content>
		</Select.Root>
	{/if}

	<div class="flex min-w-0 flex-1 items-center">
		{#if isExpr}
			<Input
				aria-label="Property expression"
				class="font-mono"
				value={property.expr}
				placeholder="Expression, e.g. file.basename"
				onchange={(e) => commitExpr((e.currentTarget as HTMLInputElement).value)}
			/>
		{:else if editor === 'boolean'}
			<Switch
				aria-label="Property value"
				checked={property.value === true}
				onCheckedChange={(checked) => setValue(checked)}
			/>
		{:else if editor === 'icon'}
			{@const icon = resolvedIcon()}
			<Button variant="outline" class="min-w-0" title="Pick icon" onclick={() => (pickerOpen = true)}>
				{#if icon}
					<IconRenderer {icon} class="size-3.5" />
				{:else}
					<ImageIcon class="size-3.5 text-muted-foreground" />
				{/if}
				<span class="truncate">{property.value || 'Pick icon'}</span>
			</Button>
		{:else if editor === 'color'}
			<Button variant="outline" class="min-w-0" title="Pick color" onclick={() => (pickerOpen = true)}>
				<span
					class="size-3.5 shrink-0 rounded-full border"
					style="background-color: {property.value || 'currentColor'}"
				></span>
				<span class="truncate">{property.value || 'Pick color'}</span>
			</Button>
		{:else if editor === 'json'}
			<Input
				aria-label="Property value"
				disabled
				value={JSON.stringify(property.value)}
				title="Numbers and lists are edited in .kokobrain/auto-organize-rules.json"
			/>
		{:else if editor === 'items'}
			<Input
				aria-label="Property value"
				value={itemsText}
				placeholder="Items, comma-separated"
				onchange={(e) => setItems((e.currentTarget as HTMLInputElement).value)}
			/>
		{:else if editor === 'none'}
			<!-- A remove has no value: the empty cell keeps the mode menu aligned with the other rows. -->
		{:else}
			<Input
				aria-label="Property value"
				value={String(property.value)}
				placeholder="Value"
				onchange={(e) => setValue((e.currentTarget as HTMLInputElement).value)}
			/>
		{/if}
	</div>

	<Select.Root
		type="single"
		value={property.mode}
		onValueChange={(v) => setMode(v as RuleProperty['mode'])}
	>
		<Select.Trigger class="w-28 shrink-0" aria-label="Property mode">
			<span data-slot="select-value">{MODE_LABELS[property.mode]}</span>
		</Select.Trigger>
		<Select.Content>
			<Select.Item value="if-missing" label={MODE_LABELS['if-missing']} />
			<Select.Item value="always" label={MODE_LABELS.always} />
			<Select.Item value="remove" label={MODE_LABELS.remove} />
			{#if !isBooleanOnlyKey(property.key)}
				<Select.Item value="add" label={MODE_LABELS.add} />
			{/if}
		</Select.Content>
	</Select.Root>

	<Button
		variant="ghost"
		size="icon"
		class="size-7 shrink-0 text-muted-foreground"
		title="Delete row"
		onclick={onremove}
	>
		<XIcon class="size-3.5" />
	</Button>
</div>

{#if exprError}
	<p class="text-meta text-destructive" data-expr-error>{exprError}</p>
{:else if preview}
	<p class="text-meta text-muted-foreground" data-expr-preview title={preview.reason}>{preview.text}</p>
{/if}

{#if isRefusedKey(property.key)}
	<p class="text-meta text-destructive" data-refused-key>
		A rule never sets or removes {property.key.trim()}: Todoist routes tasks by it.
	</p>
{/if}

{#if editor === 'icon' || editor === 'color'}
	<IconPicker
		bind:open={pickerOpen}
		currentPack={iconRef?.iconPack}
		currentName={iconRef?.iconName}
		currentColor={editor === 'color' && canonicalizeKey(property.key) === '_color' ? String(property.value) || undefined : undefined}
		currentTextColor={editor === 'color' && canonicalizeKey(property.key) === '_title_color' ? String(property.value) || undefined : undefined}
		onSelect={handlePickerSelect}
		onColorsChange={editor === 'color' ? setColor : undefined}
		onRemove={() => setValue('')}
		onClose={() => (pickerOpen = false)}
	/>
{/if}
