<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { settingsPanelStore } from '#lib/core/settings/settings-panel.store.svelte.js';
	import { clampDayStartHour, clampEventDuration, normalizeEventTypeName, EVENT_CALENDAR_VIEW_MODES } from '#lib/core/settings/settings.logic.js';
	import type { EventCalendarViewMode } from '#lib/core/settings/settings.types.js';
	import SettingItem from '#lib/core/settings/sections/SettingItem.svelte';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
	import { openFileInEditor } from '#lib/core/editor/editor.service.js';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import { buildTypeNoteDir, typeNameTakenMessage, validateTypeName } from '#lib/features/type-definitions/type-definitions.logic.js';
	import { createTypeDefinition, refreshTypeDefinitions } from '#lib/features/type-definitions/type-definitions.service.js';
	import { error } from '#lib/utils/debug.js';
	import EventColorSwatches from './EventColorSwatches.svelte';
	import { resolveEventTypeName } from './event-calendar-event.logic';

	/** Labels of the week start options, keyed by `weekStartsOn` as a string. */
	const WEEK_START_OPTIONS = [
		{ value: '1', label: 'Monday' },
		{ value: '0', label: 'Sunday' },
	] as const;

	/** Labels of the time format options. */
	const TIME_FORMAT_OPTIONS = [
		{ value: '24h', label: '24-hour' },
		{ value: '12h', label: '12-hour' },
	] as const;

	/** Display label for a view mode (`week` -> `Week`). */
	function viewLabel(mode: string): string {
		return mode.charAt(0).toUpperCase() + mode.slice(1);
	}

	/** The value of the input an event fired on. */
	function inputValue(e: Event): string {
		return (e.currentTarget as HTMLInputElement).value;
	}

	let calendar = $derived(settingsStore.eventCalendar);

	/** The event type's metadata, resolved by name ignoring case, as `createEvent` does. */
	let eventType = $derived.by(() => {
		const map = typeDefinitionsStore.typeMetadataMap;
		return map.get(resolveEventTypeName([...map.keys()], calendar.eventTypeName));
	});

	/** Folder new events are created in; null without a vault. */
	let eventFolder = $derived(
		vaultStore.path ? buildTypeNoteDir(vaultStore.path, settingsStore.typesBaseFolder, eventType?.folder ?? null) : null,
	);

	/** True while "Open Event type" is creating the definition, so a second click cannot create a duplicate. */
	let creating = $state(false);

	/**
	 * Opens the event type definition, creating it first when the vault has
	 * none, then closes the settings panel so the opened note is visible.
	 * After a create it refreshes the type map before re-enabling the button:
	 * the throttled index refresh would otherwise leave `eventType` unset for
	 * seconds, and a second click would write a duplicate `Event 1.md`.
	 *
	 * An ordinary root note with the type's name would make the create dedupe
	 * to `Event 1.md`, a type that never matches the configured name, so every
	 * click would write another copy. The root is checked first (ignoring case,
	 * for case-insensitive disks) and the created file name is checked after,
	 * in case the tree was stale.
	 */
	async function openEventType() {
		if (eventType?.path) {
			openFileInEditor(eventType.path);
			settingsPanelStore.close();
			return;
		}
		if (creating) return;
		const name = calendar.eventTypeName;
		const invalid = validateTypeName(name, []);
		if (invalid) {
			toast.error(invalid);
			return;
		}
		const fileName = `${name}.md`;
		const taken = fsStore.fileTree.find((node) => !node.isDirectory && node.name.toLowerCase() === fileName.toLowerCase());
		if (taken) {
			toast.error(typeNameTakenMessage(taken.name, name));
			return;
		}
		creating = true;
		try {
			const path = await createTypeDefinition(name);
			// A null has already been reported by createTypeDefinition.
			if (!path) return;
			if (path.slice(path.lastIndexOf('/') + 1) !== fileName) {
				toast.error(typeNameTakenMessage(fileName, name));
				return;
			}
			settingsPanelStore.close();
			await refreshTypeDefinitions().catch((err) => error('EVENT-CALENDAR', 'Failed to refresh the type definitions:', err));
		} catch (err) {
			error('EVENT-CALENDAR', 'Failed to create the event type:', err);
			toast.error(`Could not create the "${name}" type`);
		} finally {
			creating = false;
		}
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Calendar</h2>

	<div data-setting="week-start">
		<SettingItem label="Week starts on" description="First day of the week in the week and month views">
			<Select.Root
				type="single"
				value={String(calendar.weekStartsOn)}
				onValueChange={(v) => settingsStore.updateEventCalendar({ weekStartsOn: v === '0' ? 0 : 1 })}
			>
				<Select.Trigger size="sm" class="w-44" aria-label="Week starts on">
					<span data-slot="select-value">{calendar.weekStartsOn === 0 ? 'Sunday' : 'Monday'}</span>
				</Select.Trigger>
				<Select.Content>
					{#each WEEK_START_OPTIONS as opt (opt.value)}
						<Select.Item value={opt.value} label={opt.label} />
					{/each}
				</Select.Content>
			</Select.Root>
		</SettingItem>
	</div>

	<div data-setting="time-format">
		<SettingItem label="Time format" description="Clock used for the time axis and event times">
			<Select.Root
				type="single"
				value={calendar.timeFormat}
				onValueChange={(v) => settingsStore.updateEventCalendar({ timeFormat: v === '12h' ? '12h' : '24h' })}
			>
				<Select.Trigger size="sm" class="w-44" aria-label="Time format">
					<span data-slot="select-value">{calendar.timeFormat === '12h' ? '12-hour' : '24-hour'}</span>
				</Select.Trigger>
				<Select.Content>
					{#each TIME_FORMAT_OPTIONS as opt (opt.value)}
						<Select.Item value={opt.value} label={opt.label} />
					{/each}
				</Select.Content>
			</Select.Root>
		</SettingItem>
	</div>

	<div data-setting="day-start">
		<SettingItem label="Day starts at" description="Hour the time grid scrolls to when it opens (0–12)">
			<Input
				type="number"
				class="w-24"
				min={0}
				max={12}
				value={String(calendar.dayStartHour)}
				onchange={(e) => {
					const val = clampDayStartHour(Number(inputValue(e)));
					settingsStore.updateEventCalendar({ dayStartHour: val });
					(e.currentTarget as HTMLInputElement).value = String(val);
				}}
			/>
		</SettingItem>
	</div>

	<div data-setting="weekends">
		<SettingItem label="Show weekends" description="Show Saturday and Sunday in the week and month views">
			<Switch
				checked={calendar.showWeekends}
				onCheckedChange={(v) => settingsStore.updateEventCalendar({ showWeekends: v })}
			/>
		</SettingItem>
	</div>

	<div data-setting="tasks">
		<SettingItem label="Show dated tasks" description="Show tasks with a due date (📅) on their day in every view">
			<Switch
				checked={calendar.showTasks}
				onCheckedChange={(v) => settingsStore.updateEventCalendar({ showTasks: v })}
			/>
		</SettingItem>
	</div>

	<div data-setting="default-view">
		<SettingItem label="Default view" description="View the Calendar tab opens in when the app starts">
			<Select.Root
				type="single"
				value={calendar.defaultView}
				onValueChange={(v) => {
					if ((EVENT_CALENDAR_VIEW_MODES as readonly string[]).includes(v)) {
						settingsStore.updateEventCalendar({ defaultView: v as EventCalendarViewMode });
					}
				}}
			>
				<Select.Trigger size="sm" class="w-44" aria-label="Default view">
					<span data-slot="select-value">{viewLabel(calendar.defaultView)}</span>
				</Select.Trigger>
				<Select.Content>
					{#each EVENT_CALENDAR_VIEW_MODES as mode (mode)}
						<Select.Item value={mode} label={viewLabel(mode)} />
					{/each}
				</Select.Content>
			</Select.Root>
		</SettingItem>
	</div>

	<div data-setting="duration">
		<SettingItem label="Default duration" description="Length of a new event in minutes (15–480, in steps of 15)">
			<Input
				type="number"
				class="w-24"
				min={15}
				max={480}
				step={15}
				value={String(calendar.defaultDurationMinutes)}
				onchange={(e) => {
					const val = clampEventDuration(Number(inputValue(e)));
					settingsStore.updateEventCalendar({ defaultDurationMinutes: val });
					(e.currentTarget as HTMLInputElement).value = String(val);
				}}
			/>
		</SettingItem>
	</div>

	<div data-setting="color">
		<SettingItem label="Default color" description="Color of a new event">
			<EventColorSwatches
				value={calendar.defaultColor}
				label="Default color"
				onchange={(color) => settingsStore.updateEventCalendar({ defaultColor: color })}
			/>
		</SettingItem>
	</div>

	<h3 class="mt-6 mb-2 text-sm font-medium text-muted-foreground">Event type</h3>

	<div data-setting="event-type">
		<SettingItem
			label="Event type"
			description="Notes of this type appear on the calendar. If you rename the type in the type sidebar, enter its new name here."
		>
			<Input
				class="w-44"
				value={calendar.eventTypeName}
				onchange={(e) => {
					const name = normalizeEventTypeName(inputValue(e));
					settingsStore.updateEventCalendar({ eventTypeName: name });
					(e.currentTarget as HTMLInputElement).value = name;
				}}
			/>
		</SettingItem>
	</div>

	{#if eventFolder !== null}
		<SettingItem label="New events go to" description="Set by the event type's folder and the Types base folder">
			<code class="truncate text-xs" title={eventFolder} data-event-folder>{eventFolder}</code>
		</SettingItem>
	{/if}

	<SettingItem label="Folder and template" description="Set the folder or template of new events in the event type">
		<Button variant="outline" size="sm" onclick={openEventType} disabled={creating} data-open-event-type>Open Event type</Button>
	</SettingItem>
</div>
