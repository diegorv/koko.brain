<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { fileOperationErrorMessage } from '#lib/core/filesystem/fs.logic.js';
	import { createView } from './type-definitions.service';
	import { validateViewName } from './type-definitions.logic';

	interface Props {
		/** Whether the dialog is open (bindable). A close request is ignored while a create is in flight. */
		open: boolean;
		/** Labels of the views the navigator lists; a name matching one is refused. */
		existingLabels: string[];
		/** Called with the created `.view` path after the dialog closed. */
		oncreated: (path: string) => void;
	}

	let { open = $bindable(), existingLabels, oncreated }: Props = $props();

	let name = $state('');
	/** The name check's message shows only once the user has typed, so a fresh dialog opens without a warning. */
	let typed = $state(false);
	let saving = $state(false);
	let submitError = $state<string | null>(null);
	let inputRef = $state<HTMLInputElement | null>(null);

	let nameError = $derived(validateViewName(name, existingLabels));

	/** Every close (Cancel, Escape, outside click, close button) goes through here; a closed dialog reopens blank. */
	function setOpen(next: boolean) {
		if (!next && saving) return;
		open = next;
		if (!next) {
			name = '';
			typed = false;
			submitError = null;
		}
	}

	async function submit() {
		if (nameError !== null || saving) return;
		const trimmed = name.trim();
		saving = true;
		submitError = null;
		let path: string;
		try {
			path = await createView(trimmed);
		} catch (err) {
			submitError = fileOperationErrorMessage('create', `${trimmed}.view`, err);
			return;
		} finally {
			saving = false;
		}
		setOpen(false);
		oncreated(path);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			void submit();
		}
	}
</script>

<Dialog.Root bind:open={() => open, setOpen}>
	<Dialog.Content
		class="sm:max-w-md"
		onOpenAutoFocus={(e) => {
			e.preventDefault();
			inputRef?.focus();
		}}
	>
		<Dialog.Header>
			<Dialog.Title>New view</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-1.5">
			<Input
				bind:ref={inputRef}
				bind:value={name}
				oninput={() => {
					typed = true;
					// A failed-create reason names the file of the old name.
					submitError = null;
				}}
				onkeydown={handleKeydown}
				placeholder="View name"
				aria-invalid={typed && nameError !== null ? true : undefined}
			/>
			{#if typed && nameError !== null}
				<span class="text-meta text-destructive" data-view-dialog-name-error>{nameError}</span>
			{/if}
			{#if submitError}
				<p class="text-meta text-destructive" role="alert">{submitError}</p>
			{/if}
		</div>
		<Dialog.Footer>
			<Button variant="outline" disabled={saving} onclick={() => setOpen(false)}>Cancel</Button>
			<Button disabled={nameError !== null || saving} onclick={submit}>Create</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
