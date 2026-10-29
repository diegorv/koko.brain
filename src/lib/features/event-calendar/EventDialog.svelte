<script lang="ts">
	import { untrack } from 'svelte';
	import Copy from '@lucide/svelte/icons/copy';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { openFileInEditor } from '#lib/core/editor/editor.service.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { eventState } from './event-calendar-event.logic';
	import { draftForCreate, draftFromEvent, draftToPatch, type EventFormDraft } from './event-calendar-form.logic';
	import {
		createEvent,
		deleteEventFromUi,
		duplicateEventFromUi,
		editEvent,
		eventErrorMessage,
		toastEventError,
	} from './event-calendar.service';
	import { eventCalendarStore } from './event-calendar.store.svelte';
	import { eventCalendarViewStore } from './event-calendar-view.store.svelte';
	import EventForm from './EventForm.svelte';

	interface Props {
		/** The Calendar view root: the focus target when the edited block is gone. */
		root: HTMLElement | undefined;
	}

	let { root }: Props = $props();

	/** Path of the event the dialog last edited or created; focus returns to its block on close. */
	let lastPath: string | null = null;
	/** Set by Duplicate: the copy's block takes focus once it renders, so the close only parks it on the root. */
	let focusCopy = false;
	/** The create form's "Open note after creating" checkbox. */
	let openAfterCreate = $state(false);
	/**
	 * Session whose edit save is in flight. An index refresh during a rename can
	 * drop the old path before the write remaps the dialog to the new one.
	 */
	let savingSession = $state<number | null>(null);

	let dialog = $derived(eventCalendarViewStore.dialog);
	let session = $derived(dialog?.session ?? null);
	let creating = $derived(dialog?.payload.mode === 'create');
	let path = $derived(dialog?.payload.mode === 'edit' ? dialog.payload.path : null);
	let event = $derived(path ? eventCalendarStore.eventByPath(path) : undefined);
	let saving = $derived(session !== null && savingSession === session);
	let open = $derived(creating || (path !== null && (event !== undefined || saving)));

	// Read once per session: a remap or an overlay during the save must not
	// reset the form or move the baseline the patch is computed against.
	let opened = $derived.by(() => {
		void session;
		return untrack(() => {
			const payload = dialog?.payload;
			if (payload?.mode === 'create') {
				return { draft: draftForCreate(payload, settingsStore.eventCalendar), state: null };
			}
			return event ? { draft: draftFromEvent(event), state: eventState(event) } : null;
		});
	});

	$effect(() => {
		if (open && path) lastPath = path;
	});

	// Every open starts with the checkbox off; a create has no block to return
	// focus to until it saves.
	$effect(() => {
		void session;
		openAfterCreate = false;
		if (untrack(() => creating)) lastPath = null;
	});

	// The edited note left the calendar (deleted or retyped outside it): close
	// instead of leaving a form that can only fail. Not during its own save,
	// which settles the dialog itself.
	$effect(() => {
		if (path && !event && !saving) eventCalendarViewStore.closeDialog();
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
		const copying = focusCopy;
		focusCopy = false;
		const el = root;
		if (!el || !el.isConnected) return;
		if (copying) {
			if (!el.contains(document.activeElement)) el.focus();
			return;
		}
		const block = lastPath ? el.querySelector<HTMLElement>(`[data-event-path="${CSS.escape(lastPath)}"]`) : null;
		(block ?? el).focus();
	}

	/**
	 * Writes the changed fields through `editEvent`, then closes; an unchanged
	 * draft just closes. The dialog stays open while the write is in flight,
	 * even when the old path of a rename leaves the snapshot before the remap,
	 * so the result still reaches it. When the dialog was closed (or reopened
	 * for another event) during the write, the result no longer belongs to the
	 * open dialog: a success leaves it alone and a failure is reported in a
	 * toast, since the form that would show it inline is gone.
	 */
	async function save(draft: EventFormDraft) {
		if (!path || !opened?.state) return;
		const target = path;
		const s = session;
		const patch = draftToPatch(draft, opened.state);
		if (Object.keys(patch).length > 0) {
			let newPath: string;
			savingSession = s;
			try {
				newPath = await editEvent(target, patch);
			} catch (err) {
				if (eventCalendarViewStore.dialog?.session !== s) {
					toastEventError(err, target);
					return;
				}
				throw err;
			} finally {
				if (savingSession === s) savingSession = null;
			}
			if (eventCalendarViewStore.dialog?.session !== s) return;
			lastPath = newPath;
		}
		eventCalendarViewStore.closeDialog();
	}

	/**
	 * Creates the event through `createEvent`, then closes, and opens the note
	 * when the checkbox asks for it. A failure stays inline; when the dialog
	 * was closed (or reopened) during the write, it is toasted instead.
	 */
	async function create(draft: EventFormDraft) {
		const s = session;
		const openAfter = openAfterCreate;
		const { timingLocked: _, ...fields } = draft;
		let newPath: string;
		try {
			newPath = await createEvent({ ...fields, title: draft.title.trim() });
		} catch (err) {
			if (eventCalendarViewStore.dialog?.session !== s) {
				toast.error(eventErrorMessage(err));
				return;
			}
			throw err;
		}
		if (eventCalendarViewStore.dialog?.session !== s) return;
		lastPath = newPath;
		eventCalendarViewStore.closeDialog();
		if (openAfter) openFileInEditor(newPath);
	}

	/** Footer Delete: closes the dialog (focus goes to the root, the block is going away) and deletes. */
	function remove() {
		if (!path) return;
		const target = path;
		lastPath = null;
		eventCalendarViewStore.closeDialog();
		void deleteEventFromUi(target, root);
	}

	/** Footer Duplicate: closes the dialog and duplicates; focus moves to the copy once it renders. */
	function duplicate() {
		if (!path) return;
		const target = path;
		focusCopy = true;
		eventCalendarViewStore.closeDialog();
		void duplicateEventFromUi(target, root);
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
			<Dialog.Title>{creating ? 'New event' : 'Edit event'}</Dialog.Title>
		</Dialog.Header>
		{#key session}
			{#if opened}
				{#if creating}
					<EventForm initial={opened.draft} withNotes onsubmit={create} oncancel={() => eventCalendarViewStore.closeDialog()}>
						{#snippet actions()}
							<label class="flex items-center gap-2 text-sm">
								<input type="checkbox" class="size-4 accent-primary" bind:checked={openAfterCreate} data-field="open-after-create" />
								Open note after creating
							</label>
						{/snippet}
					</EventForm>
				{:else}
					<EventForm initial={opened.draft} onsubmit={save} oncancel={() => eventCalendarViewStore.closeDialog()}>
						{#snippet actions()}
							<Button type="button" variant="ghost" size="icon" aria-label="Delete event" title="Delete" onclick={remove} data-delete>
								<Trash2 class="text-destructive" />
							</Button>
							<Button type="button" variant="ghost" size="icon" aria-label="Duplicate event" title="Duplicate" onclick={duplicate} data-duplicate>
								<Copy />
							</Button>
							<Button type="button" variant="ghost" size="sm" onclick={openNote}>Open note</Button>
						{/snippet}
					</EventForm>
				{/if}
			{/if}
		{/key}
	</Dialog.Content>
</Dialog.Root>
