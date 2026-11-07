<script lang="ts">
	import { untrack } from 'svelte';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import CircleXIcon from '@lucide/svelte/icons/circle-x';
	import InfoIcon from '@lucide/svelte/icons/info';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	import { Button } from '#lib/components/ui/button/index.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { fuzzyMatch } from '#lib/utils/fuzzy-match.js';

	import { modDialogsStore, type ModAlertKind } from './mod-dialogs.store.svelte';

	const ALERT_ICONS = { info: InfoIcon, success: CircleCheckIcon, warning: TriangleAlertIcon, error: CircleXIcon };
	const ALERT_ICON_CLASSES: Record<ModAlertKind, string> = {
		info: 'text-primary',
		success: 'text-success',
		warning: 'text-warning',
		error: 'text-destructive',
	};

	/** The dialog shown; a derived, so a call queued behind it does not count as a change */
	const dialog = $derived(modDialogsStore.current);

	/** Text of the prompt's field */
	let text = $state('');
	/** Search text for the current pick dialog */
	let query = $state('');
	/** Filter the entire input before bounding the rendered list */
	const pickItems = $derived.by(() => {
		if (dialog?.kind !== 'pick') return [];
		if (!query.trim()) return dialog.items.slice(0, 100);
		return dialog.items
			.map((item) => ({ item, ...fuzzyMatch(query.trim(), `${item.title} ${item.description ?? ''}`) }))
			.filter((result) => result.match)
			.sort((a, b) => a.score - b.score)
			.slice(0, 100)
			.map(({ item }) => item);
	});
	/** The button or field that takes focus when a dialog opens */
	let initialFocus = $state<HTMLElement | null>(null);

	$effect(() => {
		const shown = dialog;
		if (shown?.kind === 'prompt') untrack(() => (text = shown.value));
		if (shown?.kind === 'pick') untrack(() => (query = ''));
	});

	function handleOpenChange(open: boolean) {
		if (!open && dialog) modDialogsStore.dismiss(dialog.id);
	}

	function focusInitial(e: Event) {
		if (!initialFocus) return;
		e.preventDefault();
		initialFocus.focus();
	}

	/** Blocks Esc and outside clicks: a loading dialog closes only with its task or Cancel */
	function keepOpen(e: Event) {
		e.preventDefault();
	}

	/** Enter confirms, unless it is on another button, which it clicks; Enter during IME composition never does */
	function handleConfirmKeydown(e: KeyboardEvent) {
		if (e.key !== 'Enter' || e.isComposing || !dialog) return;
		if (e.target instanceof HTMLButtonElement && e.target !== initialFocus) return;
		e.preventDefault();
		modDialogsStore.answer<'confirm'>(dialog.id, true);
	}

	/** Enter submits a single line; a multi-line field submits on Cmd+Enter. Never during IME composition */
	function handlePromptKeydown(e: KeyboardEvent, multiline: boolean) {
		if (e.key !== 'Enter' || e.isComposing || !dialog) return;
		if (multiline && !(e.metaKey || e.ctrlKey)) return;
		e.preventDefault();
		modDialogsStore.answer<'prompt'>(dialog.id, text);
	}
</script>

{#if dialog}
	{#key dialog.id}
		<Dialog.Root open onOpenChange={handleOpenChange}>
			<Dialog.Content
				class="gap-4 sm:max-w-md"
				showCloseButton={dialog.kind !== 'loading'}
				onOpenAutoFocus={focusInitial}
				onEscapeKeydown={dialog.kind === 'loading' ? keepOpen : undefined}
				onInteractOutside={dialog.kind === 'loading' ? keepOpen : undefined}
				onkeydown={dialog.kind === 'confirm' ? handleConfirmKeydown : undefined}
				data-mod-dialog={dialog.kind}
			>
				<Dialog.Header>
					<p class="text-xs text-muted-foreground" data-mod-dialog-caption>{dialog.modName}</p>
					{#if dialog.kind === 'alert'}
						{@const Icon = ALERT_ICONS[dialog.alertKind]}
						<div class="flex items-center gap-2">
							<Icon class="size-5 shrink-0 {ALERT_ICON_CLASSES[dialog.alertKind]}" data-mod-alert-kind={dialog.alertKind} />
							<Dialog.Title>{dialog.title}</Dialog.Title>
						</div>
					{:else if dialog.kind === 'loading'}
						<div class="flex items-center gap-2">
							<LoaderCircleIcon class="size-5 shrink-0 animate-spin text-muted-foreground" />
							<Dialog.Title>{dialog.label}</Dialog.Title>
						</div>
					{:else}
						<Dialog.Title>{dialog.title}</Dialog.Title>
					{/if}
					{#if 'message' in dialog && dialog.message}
						<Dialog.Description class="whitespace-pre-wrap">{dialog.message}</Dialog.Description>
					{/if}
				</Dialog.Header>

				{#if dialog.kind === 'alert'}
					{@const id = dialog.id}
					<Dialog.Footer>
						<Button bind:ref={initialFocus} onclick={() => modDialogsStore.answer<'alert'>(id, undefined)} data-mod-dialog-ok>OK</Button>
					</Dialog.Footer>
				{:else if dialog.kind === 'confirm'}
					{@const id = dialog.id}
					<Dialog.Footer>
						<Button variant="outline" onclick={() => modDialogsStore.dismiss(id)} data-mod-dialog-cancel>{dialog.cancelLabel}</Button>
						<Button
							variant={dialog.destructive ? 'destructive' : 'default'}
							bind:ref={initialFocus}
							onclick={() => modDialogsStore.answer<'confirm'>(id, true)}
							data-mod-dialog-confirm
						>
							{dialog.confirmLabel}
						</Button>
					</Dialog.Footer>
				{:else if dialog.kind === 'prompt'}
					{@const id = dialog.id}
					{@const multiline = dialog.multiline}
					<div class="flex flex-col gap-1.5">
						{#if dialog.label}
							<label class="text-sm font-medium" for="mod-dialog-field-{id}">{dialog.label}</label>
						{/if}
						{#if multiline}
							<textarea
								id="mod-dialog-field-{id}"
								class="border-input bg-input-bg text-foreground/80 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 min-h-24 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
								placeholder={dialog.placeholder ?? ''}
								bind:value={text}
								bind:this={initialFocus}
								onkeydown={(e) => handlePromptKeydown(e, true)}
								data-mod-dialog-field
							></textarea>
						{:else}
							<Input
								id="mod-dialog-field-{id}"
								placeholder={dialog.placeholder ?? ''}
								bind:value={text}
								bind:ref={initialFocus}
								onkeydown={(e) => handlePromptKeydown(e, false)}
								data-mod-dialog-field
							/>
						{/if}
					</div>
					<Dialog.Footer>
						<Button variant="outline" onclick={() => modDialogsStore.dismiss(id)} data-mod-dialog-cancel>Cancel</Button>
						<Button onclick={() => modDialogsStore.answer<'prompt'>(id, text)} data-mod-dialog-confirm>OK</Button>
					</Dialog.Footer>
				{:else if dialog.kind === 'pick'}
					{@const id = dialog.id}
					<Command.Root shouldFilter={false}>
						<Command.Input
							placeholder={dialog.placeholder ?? 'Search items...'}
							aria-label={dialog.title}
							bind:value={query}
							bind:ref={initialFocus}
							data-mod-dialog-field
						/>
						<Command.List>
							{#each pickItems as item (item.id)}
								<Command.Item value={item.id} onSelect={() => modDialogsStore.answer<'pick'>(id, item.id)}>
									<div class="flex flex-col gap-0.5">
										<span>{item.title}</span>
										{#if item.description}
											<span class="text-xs text-muted-foreground">{item.description}</span>
										{/if}
									</div>
								</Command.Item>
							{:else}
								<Command.Empty>No items found.</Command.Empty>
							{/each}
						</Command.List>
					</Command.Root>
					<Dialog.Footer>
						<Button variant="outline" onclick={() => modDialogsStore.dismiss(id)} data-mod-dialog-cancel>Cancel</Button>
					</Dialog.Footer>
				{:else if dialog.cancellable}
					{@const id = dialog.id}
					<Dialog.Footer>
						<Button variant="outline" bind:ref={initialFocus} onclick={() => modDialogsStore.dismiss(id)} data-mod-dialog-cancel>Cancel</Button>
					</Dialog.Footer>
				{/if}
			</Dialog.Content>
		</Dialog.Root>
	{/key}
{/if}
