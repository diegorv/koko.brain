<script lang="ts">
	import { tick, untrack } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Archive from '@lucide/svelte/icons/archive';
	import Palette from '@lucide/svelte/icons/palette';
	import Tag from '@lucide/svelte/icons/tag';
	import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
	import type { KanbanItem } from './kanban.types';
	import { extractCardDate, setCardDate, removeCardDate, cardProximity, PROXIMITY_CLASSES, secondaryTextClass, extractCardWikilinks, extractCardColor, setCardColor, removeCardColor, stripCardMetadata, extractCardTags } from './kanban.logic';
	import { loadLinkedFileContent } from './kanban.service';
	import { formatNow } from '#lib/utils/date.js';
	import { COLOR_PRESET_BG, COLOR_PRESET_TEXT } from '#lib/utils/color-presets.js';
	import KanbanDatePicker from './KanbanDatePicker.svelte';
	import KanbanCardText from './KanbanCardText.svelte';
	import KanbanWikilinkSuggestions from './KanbanWikilinkSuggestions.svelte';
	import * as ContextMenu from '#lib/components/ui/context-menu/index.js';

	interface Props {
		item: KanbanItem;
		laneId: string;
		isEditing: boolean;
		tagColors?: Record<string, string>;
		onSetTagColor?: (tag: string, color: string) => void;
		onRemoveTagColor?: (tag: string) => void;
		/** Called with a tag (no `#`) when its chip is clicked */
		onTagClick?: (tag: string) => void;
		onToggle: () => void;
		onUpdate: (text: string) => void;
		onDelete: () => void;
		onArchive: () => void;
		/** The lanes "Move to" lists: every lane but the card's own */
		moveTargets?: { id: string; title: string }[];
		/** Called with the target lane id when a "Move to" entry is chosen */
		onMove?: (toLaneId: string) => void;
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
		onTagClick,
		onToggle,
		onUpdate,
		onDelete,
		onArchive,
		moveTargets = [],
		onMove,
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

		if (e.key === 'Enter') {
			// Card text is one line (kanban.logic toCardText): Shift+Enter inserts nothing.
			e.preventDefault();
			if (!e.shiftKey) {
				const boardRoot = findBoardRoot();
				commitEdit();
				focusAfterUnmount(boardRoot);
			}
		} else if (e.key === 'Escape') {
			const boardRoot = findBoardRoot();
			editText = item.text;
			onStopEdit();
			focusAfterUnmount(boardRoot);
		}
	}

	function findBoardRoot(): HTMLElement | null {
		return inputEl?.closest<HTMLElement>('[data-kanban-board]') ?? null;
	}

	/**
	 * Hands focus to the board root so its arrow keys keep working. It waits for
	 * the textarea to unmount: focusing earlier blurs it, and `onblur={commitEdit}`
	 * would run a second commit against the old `item`.
	 */
	async function focusAfterUnmount(boardRoot: HTMLElement | null) {
		await tick();
		boardRoot?.focus();
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
		// A multi-line paste is joined into one line, the same model updateItem enforces.
		const trimmed = editText.replace(/\r?\n/g, ' ').trim();
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

	// Grows the textarea to its content on open and on every edit. It measures
	// after tick(): on open, the effect above writes `editText` in the same flush,
	// before `bind:value` has put it into the textarea.
	$effect(() => {
		void editText;
		const el = inputEl;
		if (!el) return;
		tick().then(() => {
			el.style.height = 'auto';
			el.style.height = `${el.scrollHeight}px`;
		});
	});

	let cardDate = $derived(extractCardDate(item.text));
	let cardColor = $derived(extractCardColor(item.text));
	let displayText = $derived(stripCardMetadata(item.text));
	let cardTags = $derived(extractCardTags(displayText));
	let dateProximity = $derived(cardProximity(cardDate, formatNow('YYYY-MM-DD'), item.checked));

	const COLOR_NAMES = ['blue', 'green', 'red', 'orange', 'purple', 'yellow', 'gray'] as const;

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
		const wikilink = hasWikilink;
		const text = item.text;
		untrack(() => {
			if (wikilink) {
				loadLinkedFileContent(text).then((content) => {
					linkedContent = content;
				});
			} else {
				linkedContent = '';
			}
		});
	});
</script>

<ContextMenu.Root>
	<ContextMenu.Trigger>
		{#snippet children()}
			<div
				class="group flex items-start gap-1.5 rounded-md border border-border bg-background p-2 text-sm shadow-sm transition-colors hover:border-primary/30 {PROXIMITY_CLASSES[dateProximity].border} {isDragging ? 'opacity-50' : ''} {isFocused ? 'ring-2 ring-primary' : ''}"
				style={cardColor ? `background-image: linear-gradient(${COLOR_PRESET_BG[cardColor]}, ${COLOR_PRESET_BG[cardColor]})` : ''}
				draggable={!disableDrag}
				ondragstart={disableDrag ? undefined : onDragStart}
				ondragend={disableDrag ? undefined : onDragEnd}
				data-item-id={item.id}
				data-lane-id={laneId}
				role="listitem"
			>
				<button
					class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-xs border transition-colors
						{item.checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground hover:border-primary'}"
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
							class="min-h-[1.25rem] w-full resize-none overflow-hidden border-none bg-transparent p-0 text-sm leading-5 outline-none"
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
						<div class="flex items-start gap-1">
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<span
								class="min-w-0 flex-1 leading-5 cursor-pointer select-none {item.checked ? `${secondaryTextClass(cardColor)} line-through` : ''}"
								ondblclick={onStartEdit}
							>
								<KanbanCardText text={displayText} {tagColors} {onWikilinkClick} {onTagClick} />
							</span>
							{#if !cardDate}
								<!-- Outside the dblclick span. The popover content is inline, so the wrapper stays opaque while it is open; WebKit does not focus a clicked button, so focus-within alone would not hold it. -->
								<div class="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 has-[[data-state=open]]:opacity-100">
									<KanbanDatePicker date={cardDate} proximity={dateProximity} onDateChange={handleDateChange} />
								</div>
							{/if}
						</div>
						{#if cardDate}
							<div class="flex flex-wrap items-center gap-1">
								<KanbanDatePicker date={cardDate} proximity={dateProximity} onDateChange={handleDateChange} />
							</div>
						{/if}
						{#if linkedContent}
							<div class="line-clamp-3 border-t border-border/50 pt-1 text-xs leading-relaxed {secondaryTextClass(cardColor)} whitespace-pre-wrap break-words">
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
			<Pencil class="size-4" />
			Edit
		</ContextMenu.Item>
		<ContextMenu.Item onclick={onArchive}>
			<Archive class="size-4" />
			Archive
		</ContextMenu.Item>
		<ContextMenu.Sub>
			<ContextMenu.SubTrigger disabled={moveTargets.length === 0}>
				<ArrowRightLeft class="size-4" />
				Move to
			</ContextMenu.SubTrigger>
			<ContextMenu.SubContent>
				{#each moveTargets as lane (lane.id)}
					<ContextMenu.Item onclick={() => onMove?.(lane.id)}>
						{lane.title}
					</ContextMenu.Item>
				{/each}
			</ContextMenu.SubContent>
		</ContextMenu.Sub>
		<ContextMenu.Sub>
			<ContextMenu.SubTrigger>
				<Palette class="size-4" />
				Card color
			</ContextMenu.SubTrigger>
			<ContextMenu.SubContent>
				<div class="flex gap-1.5 p-2">
					{#each COLOR_NAMES as color}
						<button
							class="size-5 rounded-full border border-input ring-offset-1 transition-opacity hover:opacity-80 {cardColor === color ? 'ring-2 ring-foreground' : ''}"
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
						Remove color
					</ContextMenu.Item>
				{/if}
			</ContextMenu.SubContent>
		</ContextMenu.Sub>
		{#if cardTags.length > 0 && onSetTagColor}
			<ContextMenu.Sub>
				<ContextMenu.SubTrigger>
					<Tag class="size-4" />
					Tag color
				</ContextMenu.SubTrigger>
				<ContextMenu.SubContent>
					{#each cardTags as tag, i (tag)}
						{#if i > 0}
							<ContextMenu.Separator />
						{/if}
						<ContextMenu.Label>#{tag}</ContextMenu.Label>
						<div class="flex gap-1.5 px-2 pb-2">
							{#each COLOR_NAMES as color}
								<button
									class="size-5 rounded-full border border-input ring-offset-1 transition-opacity hover:opacity-80 {tagColors[tag] === color ? 'ring-2 ring-foreground' : ''}"
									style="background: {COLOR_PRESET_TEXT[color]}"
									onclick={() => onSetTagColor(tag, color)}
									title={color}
									type="button"
								></button>
							{/each}
						</div>
						{#if tagColors[tag] && tagColors[tag] !== 'gray'}
							<ContextMenu.Item onclick={() => onRemoveTagColor?.(tag)}>
								Reset to default
							</ContextMenu.Item>
						{/if}
					{/each}
				</ContextMenu.SubContent>
			</ContextMenu.Sub>
		{/if}
		<ContextMenu.Item variant="destructive" onclick={onDelete}>
			<Trash2 class="size-4" />
			Delete
		</ContextMenu.Item>
	</ContextMenu.Content>
</ContextMenu.Root>
