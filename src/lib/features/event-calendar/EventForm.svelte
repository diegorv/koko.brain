<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { timeInputValue } from './event-calendar-dates.logic';
	import {
		applyEndChange,
		applyStartChange,
		toggleAllDay,
		validateDraft,
		type EventFormDraft,
	} from './event-calendar-form.logic';
	import { eventErrorMessage } from './event-calendar.service';
	import EventColorSwatches from './EventColorSwatches.svelte';

	interface Props {
		/** Draft the form starts from; read once, so remount the form for a new draft. */
		initial: EventFormDraft;
		/** Saves the draft; a rejection keeps the form open with the error inline. */
		onsubmit: (draft: EventFormDraft) => Promise<void>;
		/** Called by the Cancel button. */
		oncancel: () => void;
		/** Extra footer actions, left of Cancel and Save. */
		actions?: Snippet;
	}

	let { initial, onsubmit, oncancel, actions }: Props = $props();

	const id = $props.id();

	let draft = $state<EventFormDraft>(untrack(() => ({ ...initial })));
	let saving = $state(false);
	let submitError = $state<string | null>(null);

	let errors = $derived(validateDraft(draft));
	let valid = $derived(Object.keys(errors).length === 0);
	let locked = $derived(draft.timingLocked);

	/** The value of the input an `input` event came from. */
	function inputValue(e: Event): string {
		return (e.currentTarget as HTMLInputElement).value;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!valid || saving) return;
		saving = true;
		submitError = null;
		try {
			await onsubmit($state.snapshot(draft));
		} catch (err) {
			submitError = eventErrorMessage(err);
		} finally {
			saving = false;
		}
	}
</script>

<form class="grid gap-4" onsubmit={handleSubmit} novalidate data-event-form>
	<div class="grid gap-1.5">
		<label for="{id}-title" class="text-sm font-medium">Title</label>
		<Input
			id="{id}-title"
			value={draft.title}
			oninput={(e) => (draft.title = inputValue(e))}
			aria-invalid={errors.title ? true : undefined}
			aria-describedby={errors.title ? `${id}-title-error` : undefined}
			data-field="title"
		/>
		{#if errors.title}
			<p id="{id}-title-error" class="text-xs text-destructive" data-error="title">{errors.title}</p>
		{/if}
	</div>

	{#if locked}
		<p class="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground" data-timing-locked>
			This event spans several days. Change its date and time in the note.
		</p>
	{/if}

	<div class="grid gap-1.5">
		<label for="{id}-date" class="text-sm font-medium">Date</label>
		<Input
			id="{id}-date"
			type="date"
			value={draft.date}
			disabled={locked}
			oninput={(e) => (draft.date = inputValue(e))}
			aria-invalid={errors.date ? true : undefined}
			aria-describedby={errors.date ? `${id}-date-error` : undefined}
			data-field="date"
		/>
		{#if errors.date}
			<p id="{id}-date-error" class="text-xs text-destructive" data-error="date">{errors.date}</p>
		{/if}
	</div>

	<div class="flex items-center gap-2">
		<Switch
			id="{id}-all-day"
			checked={draft.allDay}
			disabled={locked}
			onCheckedChange={(checked) => (draft = toggleAllDay(draft, checked))}
			data-field="all-day"
		/>
		<label for="{id}-all-day" class="text-sm font-medium">All day</label>
	</div>

	{#if !draft.allDay}
		<div class="grid gap-1.5">
			<div class="grid grid-cols-2 gap-3">
				<div class="grid gap-1.5">
					<label for="{id}-start" class="text-sm font-medium">Start</label>
					<Input
						id="{id}-start"
						type="time"
						step={900}
						value={timeInputValue(draft.start)}
						disabled={locked}
						oninput={(e) => (draft = applyStartChange(draft, inputValue(e)))}
						aria-invalid={errors.time ? true : undefined}
						data-field="start"
					/>
				</div>
				<div class="grid gap-1.5">
					<label for="{id}-end" class="text-sm font-medium">End</label>
					<Input
						id="{id}-end"
						type="time"
						step={900}
						value={timeInputValue(draft.end)}
						disabled={locked}
						oninput={(e) => (draft = applyEndChange(draft, inputValue(e)))}
						aria-invalid={errors.time ? true : undefined}
						aria-describedby={errors.time ? `${id}-time-error` : undefined}
						data-field="end"
					/>
				</div>
			</div>
			{#if errors.time}
				<p id="{id}-time-error" class="text-xs text-destructive" data-error="time">{errors.time}</p>
			{/if}
		</div>
	{/if}

	<div class="grid gap-1.5">
		<label for="{id}-location" class="text-sm font-medium">Location</label>
		<Input
			id="{id}-location"
			value={draft.location}
			oninput={(e) => (draft.location = inputValue(e))}
			data-field="location"
		/>
	</div>

	<div class="grid gap-1.5">
		<span class="text-sm font-medium">Color</span>
		<EventColorSwatches value={draft.color} onchange={(color) => (draft.color = color)} />
	</div>

	{#if submitError}
		<p class="text-sm text-destructive" role="alert" data-form-error>{submitError}</p>
	{/if}

	<div class="flex items-center gap-2">
		{@render actions?.()}
		<div class="ml-auto flex items-center gap-2">
			<Button type="button" variant="outline" size="sm" onclick={oncancel}>Cancel</Button>
			<Button type="submit" size="sm" disabled={!valid || saving} data-save>Save</Button>
		</div>
	</div>
</form>
