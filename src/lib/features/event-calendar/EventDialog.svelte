<script lang="ts">
	import { untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { eventState } from './event-calendar-event.logic';
	import { draftFromEvent, draftToPatch, type EventFormDraft } from './event-calendar-form.logic';
	import { editEvent, toastEventError } from './event-calendar.service';
	import { eventCalendarStore } from './event-calendar.store.svelte';
	import { eventCalendarViewStore } from './event-calendar-view.store.svelte';
	import EventForm from './EventForm.svelte';

	interface Props {
		/** The Calendar view root: the focus target when the edited block is gone. */
		root: HTMLElement | undefined;
	}

	let { root }: Props = $props();

	/** Path of the event the dialog last edited; focus returns to its block on close. */
	let lastPath: string | null = null;

	let dialog = $derived(eventCalendarViewStore.dialog);
	let session = $derived(dialog?.session ?? null);
	let path = $derived(dialog?.payload.mode === 'edit' ? dialog.payload.path : null);
	let event = $derived(path ? eventCalendarStore.eventByPath(path) : undefined);
	let open = $derived(path !== null && event !== undefined);

	// Read once per session: a remap or an overlay during the save must not
	// reset the form or move the baseline the patch is computed against.
	let opened = $derived.by(() => {
		void session;
		return untrack(() => (event ? { draft: draftFromEvent(event), state: eventState(event) } : null));
	});

	$effect(() => {
		if (open && path) lastPath = path;
	});

	// The edited note left the calendar (deleted or retyped outside it): close
	// instead of leaving a form that can only fail.
	$effect(() => {
		if (path && !event) eventCalendarViewStore.closeDialog();
	});

	function handleOpenChange(next: boolean) {
		if (!next) eventCalendarViewStore.closeDialog();
	}

	/**
	 * Returns focus to the edited block, or to the root when the block is gone.
	 * The popover's Edit button that opened the dialog has unmounted, so bits-ui
	 * would leave focus on `<body>`.
	 */
	function handleCloseAutoFocus(e: Event) {
		e.preventDefault();
		const el = root;
		if (!el || !el.isConnected) return;
		const block = lastPath ? el.querySelector<HTMLElement>(`[data-event-path="${CSS.escape(lastPath)}"]`) : null;
		(block ?? el).focus();
	}

	/**
	 * Writes the changed fields through `editEvent`, then closes; an unchanged
	 * draft just closes. When the dialog was closed (or reopened for another
	 * event) during the write, the result no longer belongs to the open dialog:
	 * a success leaves it alone and a failure is reported in a toast, since the
	 * form that would show it inline is gone.
	 */
	async function save(draft: EventFormDraft) {
		if (!path || !opened) return;
		const target = path;
		const s = session;
		const patch = draftToPatch(draft, opened.state);
		if (Object.keys(patch).length > 0) {
			let newPath: string;
			try {
				newPath = await editEvent(target, patch);
			} catch (err) {
				if (eventCalendarViewStore.dialog?.session !== s) {
					toastEventError(err, target);
					return;
				}
				throw err;
			}
			if (eventCalendarViewStore.dialog?.session !== s) return;
			lastPath = newPath;
		}
		eventCalendarViewStore.closeDialog();
	}

	function openNote() {
		if (!path) return;
		const target = path;
		eventCalendarViewStore.closeDialog();
		openFileInEditor(target);
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="gap-5 p-5 sm:max-w-[440px]" onCloseAutoFocus={handleCloseAutoFocus} data-event-dialog>
		<Dialog.Header>
			<Dialog.Title>Edit event</Dialog.Title>
		</Dialog.Header>
		{#key session}
			{#if opened}
				<EventForm initial={opened.draft} onsubmit={save} oncancel={() => eventCalendarViewStore.closeDialog()}>
					{#snippet actions()}
						<Button type="button" variant="ghost" size="sm" onclick={openNote}>Open note</Button>
					{/snippet}
				</EventForm>
			{/if}
		{/key}
	</Dialog.Content>
</Dialog.Root>
