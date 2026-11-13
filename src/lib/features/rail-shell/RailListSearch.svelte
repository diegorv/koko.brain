<script lang="ts">
	import { untrack } from 'svelte';
	import X from '@lucide/svelte/icons/x';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import { Input } from '#lib/components/ui/input/index.js';

	/** Quiet period after the last keystroke before `onChange` fires. */
	const DEBOUNCE_MS = 180;

	interface Props {
		/** Query the list currently applies. The draft re-syncs when this changes. */
		value: string;
		/** True while the parent is still resolving results for the query. */
		loading: boolean;
		/** Called with the query once typing settles, or at once when the draft is cleared. */
		onChange: (value: string) => void;
		/** Called on Escape. The parent decides whether that hides the search row. */
		onClose: () => void;
	}

	let { value, loading, onChange, onClose }: Props = $props();

	let draft = $state(untrack(() => value));
	let debouncing = $state(false);
	let inputRef = $state<HTMLInputElement | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;

	// What this row last sent up. The parent echoing it back is not news, and taking it would overwrite newer typing.
	let lastEmitted = untrack(() => value);

	$effect(() => {
		const next = value;
		untrack(() => {
			if (next === lastEmitted) return;
			lastEmitted = next;
			clearTimer();
			draft = next;
		});
	});

	$effect(() => {
		inputRef?.focus();
	});

	// Stop a pending call from firing into a list that is already gone.
	$effect(() => () => clearTimeout(timer));

	function clearTimer() {
		clearTimeout(timer);
		timer = undefined;
		debouncing = false;
	}

	function emit(next: string) {
		lastEmitted = next;
		onChange(next);
	}

	function handleInput(next: string) {
		draft = next;
		clearTimer();
		if (next === '') {
			emit('');
			return;
		}
		debouncing = true;
		timer = setTimeout(() => {
			timer = undefined;
			debouncing = false;
			emit(draft);
		}, DEBOUNCE_MS);
	}

	function handleClear() {
		handleInput('');
		inputRef?.focus();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') onClose();
	}
</script>

<div data-note-list-search class="border-file-explorer-border flex items-center gap-1 border-b px-2 py-1.5">
	<div class="relative flex-1">
		<Input
			bind:ref={inputRef}
			type="text"
			class="h-7 pr-12 text-xs"
			placeholder="Search notes..."
			autocomplete="off"
			spellcheck="false"
			value={draft}
			oninput={(event) => handleInput((event.currentTarget as HTMLInputElement).value)}
			onkeydown={handleKeydown}
		/>
		{#if debouncing || loading}
			<span
				data-note-list-search-loading
				class="text-file-explorer-muted-fg pointer-events-none absolute top-1/2 -translate-y-1/2 {draft === '' ? 'right-2' : 'right-7'}"
				aria-hidden="true"
			>
				<LoaderCircle class="size-3.5 animate-spin" />
			</span>
		{/if}
		{#if draft !== ''}
			<button
				type="button"
				data-note-list-search-clear
				aria-label="Clear search"
				class="text-file-explorer-muted-fg hover:text-foreground absolute top-1/2 right-1.5 -translate-y-1/2"
				onmousedown={(event) => event.preventDefault()}
				onclick={handleClear}
			>
				<X class="size-3.5" />
			</button>
		{/if}
	</div>
</div>
