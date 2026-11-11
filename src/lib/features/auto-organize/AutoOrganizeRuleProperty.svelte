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
	import { canonicalizeKey } from '#lib/utils/frontmatter-aliases.js';
	import type { RuleProperty } from './auto-organize.types';
	import { isBooleanOnlyKey, isRefusedKey, parseRuleItems, ruleValueEditor } from './auto-organize.logic';

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

	let editor = $derived(ruleValueEditor(property.key, property.value, property.mode));
	/** The text / yes-no chooser is only for keys that accept either. */
	let showTypeChooser = $derived((editor === 'text' || editor === 'boolean') && !isBooleanOnlyKey(property.key));
	let pickerOpen = $state(false);

	/**
	 * The row with `value` fitted to `key` and `mode`, so the loader keeps it:
	 * a `remove` has no value, an `add` holds list items, and the other modes
	 * need a value their key's editor can show. A lifecycle key takes no `add`,
	 * so it becomes `if-missing`, which never overwrites an existing value.
	 */
	function fitted(key: string, value: RuleProperty['value'], mode: RuleProperty['mode']): RuleProperty {
		if (mode === 'remove') return { key, mode };
		if (mode === 'add' && isBooleanOnlyKey(key)) mode = 'if-missing';
		if (mode === 'add') {
			const items = typeof value === 'string' ? parseRuleItems(value) : Array.isArray(value) ? value : [];
			return { key, value: items, mode };
		}
		let next = value ?? '';
		// An empty or one-item list left by `add` goes back to text, so the field stays
		// editable and an empty list never clears the key on every matching note.
		if (Array.isArray(next) && next.length <= 1) next = next[0] ?? '';
		// A lifecycle key accepts only a boolean, and the loader drops any other value.
		if (isBooleanOnlyKey(key) && typeof next !== 'boolean') next = false;
		// `_icon` and the color keys take text; any other value would hide their picker.
		const textEditor = ruleValueEditor(key, '', mode);
		if ((textEditor === 'icon' || textEditor === 'color') && typeof next !== 'string') next = '';
		return { key, value: next, mode };
	}

	function commitKey(raw: string) {
		const key = raw.trim();
		if (key === property.key) return;
		onchange(fitted(key, property.value, property.mode));
	}

	function setMode(mode: RuleProperty['mode']) {
		if (mode === property.mode) return;
		onchange(fitted(property.key, property.value, mode));
	}

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
		{#if editor === 'boolean'}
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
