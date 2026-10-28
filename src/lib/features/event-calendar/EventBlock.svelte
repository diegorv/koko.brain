<script lang="ts">
	import { formatTime, formatTimeRange, type TimeFormat } from './event-calendar-dates.logic';
	import { eventColorStyle, type PendingEventNote } from './event-calendar-event.logic';
	import { minutesToPx } from './event-calendar-layout.logic';
	import { eventCalendarViewStore } from './event-calendar-view.store.svelte';

	interface Props {
		/** The merged event the block shows. */
		event: PendingEventNote;
		/** Zero-based column within its overlap cluster. */
		column: number;
		/** Column count of its overlap cluster. */
		columns: number;
		/** Clock format of the time text. */
		timeFormat: TimeFormat;
	}

	let { event, column, columns, timeFormat }: Props = $props();

	/** Under this height the block shows one truncated row. */
	const COMPACT_PX = 44;
	/** From this height the title may take two lines. */
	const TWO_LINE_TITLE_PX = 60;
	/** From this height the snippet's first line shows as a third line. */
	const SNIPPET_PX = 56;
	/** Shortest drawn block, in px. */
	const MIN_BLOCK_PX = 14;
	/** Line height of the narrow title-only variant, in px. */
	const NARROW_LINE_PX = 13;
	/** Highest overlap column that still raises the z-index: keeps blocks under the now-line (z-20) and the sticky axis (z-30). */
	const MAX_Z_COLUMN = 9;

	let height = $derived(minutesToPx(event.end - event.start) - 2);
	let time = $derived(formatTimeRange(event.start, event.end, timeFormat));
	let snippetLine = $derived(event.snippet.split('\n')[0]?.trim() ?? '');
	let selected = $derived(eventCalendarViewStore.selectedEventPath === event.path);
	let label = $derived(`${event.title}, ${time}${snippetLine ? `, ${snippetLine}` : ''}`);
	let style = $derived(
		[
			eventColorStyle(event.color),
			`top: ${minutesToPx(event.start) + 1}px`,
			`height: ${Math.max(height, MIN_BLOCK_PX)}px`,
			`left: calc((100% - 5px) * ${column / columns} + 2px)`,
			`width: calc((100% - 5px) / ${columns} - ${columns > 1 ? 2 : 0}px)`,
			`z-index: ${10 + Math.min(column, MAX_Z_COLUMN)}`,
			`--lines: ${Math.max(1, Math.floor((height - 6) / NARROW_LINE_PX))}`,
		].join('; '),
	);

	/** Opens the details popover anchored at the block. */
	function openPopover(el: HTMLElement) {
		eventCalendarViewStore.openPopover(event.path, el.getBoundingClientRect());
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key !== 'Enter' && e.key !== ' ') return;
		e.preventDefault();
		openPopover(e.currentTarget as HTMLElement);
	}
</script>

<div
	role="button"
	tabindex="0"
	class="@container absolute cursor-pointer overflow-hidden rounded-md font-medium outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring
		{event.pending ? 'border border-dashed border-current' : ''}
		{selected ? 'ring-2 ring-primary/70' : ''}"
	{style}
	aria-label={label}
	data-event-path={event.path}
	data-pending={event.pending || undefined}
	data-readonly={event.readOnly || undefined}
	onclick={(e) => openPopover(e.currentTarget)}
	onkeydown={handleKeydown}
>
	{#if height < COMPACT_PX}
		<div class="flex h-full w-full items-center px-2 @max-[84px]:px-1">
			<p class="min-w-0 flex-1 truncate text-xs @max-[84px]:text-[11px]" data-event-title>
				{event.title}
				{#if height < 28}
					<span class="ml-1 @max-[84px]:hidden" data-event-time>{formatTime(event.start, timeFormat)}</span>
				{/if}
			</p>
		</div>
	{:else}
		<div class="flex h-full w-full flex-col gap-0.5 p-2 @max-[84px]:p-1">
			<div class="contents @max-[84px]:hidden">
				<p
					class="w-full shrink-0 overflow-hidden text-xs leading-4 break-words {height >= TWO_LINE_TITLE_PX
						? 'line-clamp-2'
						: 'truncate'}"
					data-event-title
				>
					{event.title}
				</p>
				<p class="w-full shrink-0 truncate text-[11px]" data-event-time>{time}</p>
				{#if snippetLine && height >= SNIPPET_PX}
					<p class="w-full shrink-0 truncate text-[11px]" data-event-snippet>{snippetLine}</p>
				{/if}
			</div>
			<p class="hidden text-[11px] leading-[13px] wrap-anywhere @max-[84px]:line-clamp-(--lines)" data-event-narrow-title>
				{event.title}
			</p>
		</div>
	{/if}
</div>
