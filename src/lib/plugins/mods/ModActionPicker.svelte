<script lang="ts">
	import { untrack } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import { modPickerStore, type ModPickerAction } from './mod-picker.store.svelte';
	import { closesWhenDone } from './mods.logic';
	import { modsRunsStore, type ModRunStatus } from './mods-runs.store.svelte';

	const STATUS_LABELS: Record<ModRunStatus, string> = {
		running: 'Running',
		done: 'Done',
		failed: 'Failed',
		cancelled: 'Cancelled',
	};

	/** Text of the input step's field */
	let text = $state('');

	// The text step opens from the list (pick) or straight from a single-action button (the host),
	// so the field is cleared whenever the step's action changes, not in one of those paths.
	$effect.pre(() => {
		void modPickerStore.inputAction;
		untrack(() => (text = ''));
	});

	/** The run the run view shows; null on the action list or the input step */
	const run = $derived(modPickerStore.runKey === null ? null : modsRunsStore.runFor(modPickerStore.runKey));
	/** Kept apart from `run`, which is a new object on every log line, so focus moves only when the status does */
	const runStatus = $derived(run?.status ?? null);
	const lineCount = $derived(run?.lines.length ?? 0);

	let stopButton = $state<HTMLElement | null>(null);
	let closeButton = $state<HTMLElement | null>(null);
	let logBox = $state<HTMLElement | null>(null);
	/** Whether the log box follows new lines; false once the user scrolls up */
	let followLog = true;

	// The picker's Command.Input, which held focus, is gone once the run view shows.
	$effect(() => {
		if (runStatus === null) return;
		(runStatus === 'running' ? stopButton : closeButton)?.focus();
	});

	$effect(() => {
		void lineCount;
		if (logBox && followLog) logBox.scrollTop = logBox.scrollHeight;
	});

	// A quick action (open a note, show a dialog, a toast) leaves nothing to read: no "Done" window left behind.
	$effect(() => {
		if (run && closesWhenDone(run)) untrack(() => modPickerStore.close());
	});

	function handleLogScroll() {
		if (!logBox) return;
		followLog = logBox.scrollHeight - logBox.scrollTop - logBox.clientHeight < 8;
	}

	/**
	 * The run view sits inside the Command root, whose keydown handler prevents the default
	 * of Enter, Home, End and the arrows; keeping those keys from it lets Enter click Stop and
	 * Close. Escape still reaches the dialog, which closes on it.
	 */
	function handleRunKeydown(e: KeyboardEvent) {
		if (e.key !== 'Escape') e.stopPropagation();
	}

	function handleOpenChange(open: boolean) {
		if (!open) modPickerStore.close();
	}

	/** Shows the input step for an action with `input`; otherwise runs it with `''`, which switches to its run view */
	function pick(action: ModPickerAction) {
		if (action.input) {
			modPickerStore.askInput(action);
			return;
		}
		void action.run('');
	}

	/** Enter runs the action with the text, which switches to its run view; Escape is the dialog's own close */
	function handleKeydown(e: KeyboardEvent) {
		const action = modPickerStore.inputAction;
		// Enter during IME composition confirms the composed characters, not the field.
		if (e.key !== 'Enter' || e.isComposing || !action) return;
		e.preventDefault();
		void action.run(text);
	}

	/** Width of the progress bar, 0 to 100 */
	function percent(done: number, total: number): number {
		return total > 0 ? Math.min(100, Math.max(0, (done / total) * 100)) : 0;
	}
</script>

<Command.Dialog
	open={modPickerStore.isOpen}
	onOpenChange={handleOpenChange}
	title={run?.title ?? modPickerStore.inputAction?.title ?? modPickerStore.title}
	description={run ? 'Progress and log of the action' : modPickerStore.inputAction ? 'Type the text and press Enter' : 'Pick an action to run'}
>
	{#if run}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="flex flex-col gap-3 p-4" data-mod-run={run.status} onkeydown={handleRunKeydown}>
			<!-- pr-6 keeps the status clear of the dialog's close button in the top-right corner. -->
			<div class="flex items-center justify-between gap-2 pr-6">
				<span class="truncate font-medium">{run.title}</span>
				<span class="text-xs text-muted-foreground" data-mod-run-status>{STATUS_LABELS[run.status]}</span>
			</div>
			{#if run.progress}
				<div
					class="h-1.5 w-full overflow-hidden rounded-full bg-muted"
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={run.progress.total}
					aria-valuenow={run.progress.done}
				>
					<div class="h-full bg-primary transition-[width]" style:width="{percent(run.progress.done, run.progress.total)}%"></div>
				</div>
				{#if run.progress.label}
					<span class="text-xs text-muted-foreground" data-mod-run-progress-label>{run.progress.label}</span>
				{/if}
			{/if}
			{#if modsRunsStore.isReloadPending(run.modId)}
				<span class="text-xs text-muted-foreground" data-mod-reload-pending>Reload pending</span>
			{/if}
			{#if run.lines.length > 0}
				<div class="max-h-64 overflow-y-auto rounded-md bg-muted/50 p-2 font-mono text-xs whitespace-pre-wrap" data-mod-run-log bind:this={logBox} onscroll={handleLogScroll}>
					{#each run.lines as line, i (i)}
						<div>{line}</div>
					{/each}
				</div>
			{/if}
			{#if run.status === 'failed' && run.error}
				<p class="text-sm text-destructive" data-mod-run-error>{run.error.message}</p>
				{#if run.error.stack}
					<details class="text-xs">
						<summary class="cursor-default text-muted-foreground">Details</summary>
						<pre class="mt-1 max-h-48 overflow-auto whitespace-pre-wrap">{run.error.stack}</pre>
					</details>
				{/if}
			{/if}
			<div class="flex justify-end gap-2">
				{#if run.status === 'running'}
					<Button variant="destructive" size="sm" bind:ref={stopButton} onclick={() => run.stop()} data-mod-run-stop>Stop</Button>
				{/if}
				<Button variant="outline" size="sm" bind:ref={closeButton} onclick={() => modPickerStore.close()} data-mod-run-close>Close</Button>
			</div>
		</div>
	{:else if modPickerStore.inputAction}
		<!-- svelte-ignore a11y_autofocus -->
		<div class="flex items-center border-b px-3">
			<input
				class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
				placeholder={modPickerStore.inputAction.input?.placeholder ?? ''}
				bind:value={text}
				onkeydown={handleKeydown}
				data-mod-input
				autofocus
			/>
		</div>
		<div class="p-4 text-center text-sm text-muted-foreground">
			Press <kbd class="rounded-xs border px-1.5 py-0.5 text-xs">Enter</kbd> to run, <kbd class="rounded-xs border px-1.5 py-0.5 text-xs">Esc</kbd> to cancel
		</div>
	{:else}
		<Command.Input placeholder="Pick an action..." />
		<Command.List>
			<Command.Empty>No actions.</Command.Empty>
			{#each modPickerStore.actions as action (action.id)}
				<Command.Item
					value={action.id}
					keywords={action.description ? [action.title, action.description] : [action.title]}
					onSelect={() => pick(action)}
					data-mod-action={action.id}
				>
					<div class="flex min-w-0 flex-col">
						<span>{action.title}</span>
						{#if action.description}
							<span class="text-xs text-muted-foreground">{action.description}</span>
						{/if}
					</div>
				</Command.Item>
			{/each}
		</Command.List>
	{/if}
</Command.Dialog>
