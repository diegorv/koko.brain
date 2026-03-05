<script lang="ts">
	import { Check, GripVertical, Pencil, Trash2, Archive, Palette } from 'lucide-svelte';
	import type { KanbanItem } from './kanban.types';
	import { extractCardDate, setCardDate, removeCardDate, getDateProximity, extractCardWikilinks, extractCardColor, setCardColor, removeCardColor, stripCardMetadata, type DateProximity } from './kanban.logic';
	import { loadLinkedFileContent } from './kanban.service';
	import { today } from '$lib/utils/date';
	import { COLOR_PRESET_BG, COLOR_PRESET_TEXT } from '$lib/utils/color-presets';
	import KanbanDatePicker from './KanbanDatePicker.svelte';
	import KanbanCardText from './KanbanCardText.svelte';
	import KanbanWikilinkSuggestions from './KanbanWikilinkSuggestions.svelte';
	import * as ContextMenu from '$lib/components/ui/context-menu';

	interface Props {
		item: KanbanItem;
		laneId: string;
		isEditing: boolean;
		tagColors?: Record<string, string>;
		onSetTagColor?: (tag: string, color: string) => void;
		onRemoveTagColor?: (tag: string) => void;
		onToggle: () => void;
		onUpdate: (text: string) => void;
		onDelete: () => void;
		onArchive: () => void;
		onStartEdit: () => void;
		onStopEdit: () => void;
		onWikilinkClick?: (target: string, heading?: string) => void;
		isFocused?: boolean;
		isDragging?: boolean;
		disableDrag?: boolean;
		onDragStart: (e: DragEvent) => void;
		onDragEnd: (e: DragEvent) => void;
	}

	let {
		item,
		laneId,
		isEditing,
		tagColors = {},
		onSetTagColor,
		onRemoveTagColor,
		onToggle,
		onUpdate,
		onDelete,
		onArchive,
		onWikilinkClick,
		isFocused = false,
		isDragging = false,
		disableDrag = false,
		onStartEdit,
		onStopEdit,
		onDragStart,
		onDragEnd,
	}: Props = $props();

	let editText = $state('');
	let inputEl: HTMLTextAreaElement | undefined = $state();
	let cursorPos = $state(0);
	let suggestionsRef: KanbanWikilinkSuggestions | undefined = $state();

	function handleKeydown(e: KeyboardEvent) {
		if (suggestionsRef?.handleKeydown(e)) return;

		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			commitEdit();
		} else if (e.key === 'Escape') {
			editText = item.text;
			onStopEdit();
		}
	}

	function handleWikilinkSelect(filename: string, from: number, to: number) {
		editText = editText.substring(0, from) + `[[${filename}]]` + editText.substring(to);
		const newCursorPos = from + filename.length + 4;
		cursorPos = newCursorPos;
		requestAnimationFrame(() => {
			inputEl?.setSelectionRange(newCursorPos, newCursorPos);
		});
	}

	function updateCursorPos() {
		cursorPos = inputEl?.selectionStart ?? 0;
	}

	function commitEdit() {
		const trimmed = editText.trim();
		if (trimmed && trimmed !== item.text) {
			onUpdate(trimmed);
		} else {
			editText = item.text;
		}
		onStopEdit();
	}

	$effect(() => {
		if (isEditing && inputEl) {
			editText = item.text;
			inputEl.focus();
			inputEl.select();
		}
	});

	let cardDate = $derived(extractCardDate(item.text));
	let cardColor = $derived(extractCardColor(item.text));
	let displayText = $derived(stripCardMetadata(item.text));
	let dateProximity = $derived(getDateProximity(cardDate, today()));

	const COLOR_NAMES = ['blue', 'green', 'red', 'orange', 'purple', 'yellow', 'gray'] as const;

	const PROXIMITY_BORDER: Record<DateProximity, string> = {
		overdue: 'border-l-4 border-l-red-500',
		today: 'border-l-4 border-l-yellow-500',
		tomorrow: 'border-l-4 border-l-orange-400',
		upcoming: 'border-l-4 border-l-blue-400',
		future: '',
		none: '',
	};

	function handleDateChange(newDate: string | null) {
		if (newDate) {
			onUpdate(setCardDate(item.text, newDate));
		} else {
			onUpdate(removeCardDate(item.text));
		}
	}

	function handleColorChange(color: string) {
		onUpdate(setCardColor(item.text, color));
	}

	function handleColorRemove() {
		onUpdate(removeCardColor(item.text));
	}

	// ── Linked file content preview ─────────────────────────────

	let hasWikilink = $derived(extractCardWikilinks(item.text).length > 0);
	let linkedContent = $state('');

	$effect(() => {
		if (hasWikilink) {
			loadLinkedFileContent(item.text).then((content) => {
				linkedContent = content;
			});
		} else {
			linkedContent = '';
		}
	});
</script>

<ContextMenu.Root>
	<ContextMenu.Trigger>
		{#snippet children()}
			<div
				class="group flex items-start gap-1.5 rounded-lg border border-border bg-background p-2 text-sm shadow-sm transition-colors hover:border-primary/30 {PROXIMITY_BORDER[dateProximity]} {isDragging ? 'opacity-50' : ''} {isFocused ? 'ring-2 ring-primary' : ''}"
				style={cardColor ? `background: ${COLOR_PRESET_BG[cardColor]}` : ''}
				draggable={!disableDrag}
				ondragstart={disableDrag ? undefined : onDragStart}
				ondragend={disableDrag ? undefined : onDragEnd}
				data-item-id={item.id}
				data-lane-id={laneId}
				role="listitem"
			>
				<button
					class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors
						{item.checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 hover:border-primary'}"
					onclick={onToggle}
					aria-label={item.checked ? 'Uncheck' : 'Check'}
				>
					{#if item.checked}
						<Check class="size-3" />
					{/if}
				</button>

				{#if isEditing}
					<div class="relative flex-1">
						<textarea
							bind:this={inputEl}
							bind:value={editText}
							onkeydown={handleKeydown}
							oninput={updateCursorPos}
							onclick={updateCursorPos}
							onblur={commitEdit}
							class="min-h-[1.25rem] w-full resize-none border-none bg-transparent p-0 text-sm leading-5 outline-none"
							rows="1"
						></textarea>
						<KanbanWikilinkSuggestions
							bind:this={suggestionsRef}
							text={editText}
							{cursorPos}
							onSelect={handleWikilinkSelect}
						/>
					</div>
				{:else}
					<div class="flex flex-1 flex-col gap-1">
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<span
							class="leading-5 cursor-pointer select-none {item.checked ? 'text-muted-foreground line-through' : ''}"
							ondblclick={onStartEdit}
						>
							<KanbanCardText text={displayText} {tagColors} {onWikilinkClick} {onSetTagColor} {onRemoveTagColor} />
						</span>
						<div class="flex flex-wrap items-center gap-1">
							<KanbanDatePicker date={cardDate} proximity={dateProximity} onDateChange={handleDateChange} />
						</div>
						{#if linkedContent}
							<div class="max-h-32 overflow-y-auto border-t border-border/50 pt-1 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
								{linkedContent}
							</div>
						{/if}
					</div>
				{/if}

				{#if !disableDrag}
					<div class="mt-0.5 shrink-0 cursor-grab opacity-0 group-hover:opacity-60 active:cursor-grabbing">
						<GripVertical class="size-3.5 text-muted-foreground" />
					</div>
				{/if}
			</div>
		{/snippet}
	</ContextMenu.Trigger>
	<ContextMenu.Content class="w-40">
		<ContextMenu.Item onclick={onStartEdit}>
			<Pencil class="mr-2 size-4" />
			Edit
		</ContextMenu.Item>
		<ContextMenu.Item onclick={onArchive}>
			<Archive class="mr-2 size-4" />
			Archive
		</ContextMenu.Item>
		<ContextMenu.Sub>
			<ContextMenu.SubTrigger>
				<Palette class="mr-2 size-4" />
				Card Color
			</ContextMenu.SubTrigger>
			<ContextMenu.SubContent>
				<div class="flex gap-1.5 p-2">
					{#each COLOR_NAMES as color}
						<button
							class="size-5 rounded-full ring-offset-1 transition-transform hover:scale-110 {cardColor === color ? 'ring-2 ring-foreground' : ''}"
							style="background: {COLOR_PRESET_TEXT[color]}"
							onclick={() => handleColorChange(color)}
							title={color}
							type="button"
						></button>
					{/each}
				</div>
				{#if cardColor}
					<ContextMenu.Separator />
					<ContextMenu.Item onclick={handleColorRemove}>
						Remove Color
					</ContextMenu.Item>
				{/if}
			</ContextMenu.SubContent>
		</ContextMenu.Sub>
		<ContextMenu.Separator />
		<ContextMenu.Item onclick={onDelete} class="text-destructive">
			<Trash2 class="mr-2 size-4" />
			Delete
		</ContextMenu.Item>
	</ContextMenu.Content>
</ContextMenu.Root>
