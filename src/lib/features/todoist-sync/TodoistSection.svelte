<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import SettingItem from '#lib/core/settings/sections/SettingItem.svelte';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { clampSyncIntervalMinutes } from '#lib/core/settings/settings.logic.js';
	import type { TodoistSyncContext } from '#lib/core/settings/settings.types.js';
	import { error } from '#lib/utils/debug.js';
	import { classifyTodoistError, syncErrorMessage, type RootProjectChoice } from './sync-scope.logic';
	import { fetchRootProjectChoices } from './todoist-sync.service';

	/** Select value for "no root project"; Todoist ids are never a single dash. */
	const NO_ROOT = '-';

	const CONTEXT_OPTIONS: { value: TodoistSyncContext; label: string }[] = [
		{ value: 'work', label: 'Work' },
		{ value: 'personal', label: 'Personal' },
	];

	const todoist = $derived(settingsStore.todoist);

	/** Root choices from the last "Load projects"; null until loaded. */
	let rootChoices = $state<RootProjectChoice[] | null>(null);
	let loadingProjects = $state(false);
	let loadError = $state('');

	/** The trigger text: the saved root's path once loaded, else its id. */
	const rootLabel = $derived.by(() => {
		if (!todoist.syncRootProjectId) return 'None (sync off)';
		return rootChoices?.find((c) => c.id === todoist.syncRootProjectId)?.label ?? todoist.syncRootProjectId;
	});

	function handleTokenChange(value: string) {
		settingsStore.updateTodoist({ apiToken: value });
	}

	function handleDefaultLabelChange(value: string) {
		settingsStore.updateTodoist({ defaultLabel: value });
	}

	/** Stores the interval while the field holds a number; an empty field is left alone. */
	function handleIntervalChange(raw: string) {
		if (raw.trim() === '') return;
		const minutes = Number(raw);
		if (!Number.isFinite(minutes)) return;
		settingsStore.updateTodoist({ syncIntervalMinutes: clampSyncIntervalMinutes(minutes) });
	}

	async function loadProjects() {
		if (!todoist.apiToken) {
			loadError = 'Add your API token first.';
			return;
		}
		loadingProjects = true;
		loadError = '';
		try {
			rootChoices = await fetchRootProjectChoices();
		} catch (err) {
			error('TODOIST', 'loading projects failed:', err);
			loadError = syncErrorMessage(classifyTodoistError(err));
		} finally {
			loadingProjects = false;
		}
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Todoist</h2>

	<div data-setting="api-token">
		<SettingItem
			label="API token"
			description="Personal API token from Todoist Settings → Integrations → Developer. Stored in this vault's .kokobrain folder. Exclude .kokobrain from sync tools."
			layout="stacked"
		>
			<Input
				type="password"
				value={todoist.apiToken}
				oninput={(e) => handleTokenChange((e.currentTarget as HTMLInputElement).value)}
				placeholder="Paste your token here"
			/>
		</SettingItem>
	</div>

	<p class="px-4 text-meta text-muted-foreground">
		Get your token at
		<button
			class="text-primary hover:underline cursor-pointer"
			onclick={() => openUrl('https://todoist.com/prefs/integrations')}
		>
			todoist.com/prefs/integrations
		</button>
	</p>

	<SettingItem
		label="Default label"
		description="Added to every task created from the app. Todoist creates the label automatically if it doesn't exist. Leave empty for none."
	>
		<Input
			type="text"
			value={todoist.defaultLabel}
			oninput={(e) => handleDefaultLabelChange((e.currentTarget as HTMLInputElement).value)}
			placeholder="e.g. inbox"
		/>
	</SettingItem>

	<h3 class="section-label mt-6 mb-2">Sync</h3>

	<div data-setting="sync-enabled">
		<SettingItem label="Sync with Todoist" description="Keep the root project's tasks and this vault's notes in sync both ways">
			<Switch
				checked={todoist.syncEnabled}
				onCheckedChange={(syncEnabled) => settingsStore.updateTodoist({ syncEnabled })}
			/>
		</SettingItem>
	</div>

	<div data-setting="sync-root">
		<SettingItem
			label="Root project"
			description="This vault syncs this project and every project nested under it. With none chosen, the sync stays off."
		>
			<div class="flex items-center gap-2">
				<Button variant="outline" size="sm" data-load-projects disabled={loadingProjects} onclick={loadProjects}>
					{loadingProjects ? 'Loading...' : 'Load projects'}
				</Button>
				<Select.Root
					type="single"
					value={todoist.syncRootProjectId || NO_ROOT}
					onValueChange={(v) => settingsStore.updateTodoist({ syncRootProjectId: v === NO_ROOT ? '' : v })}
				>
					<Select.Trigger class="w-44" aria-label="Root project">
						<span data-slot="select-value">{rootLabel}</span>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value={NO_ROOT} label="None (sync off)" />
						{#each rootChoices ?? [] as choice (choice.id)}
							<Select.Item value={choice.id} label={choice.label} />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</SettingItem>
		{#if loadError}
			<p class="px-4 text-meta text-destructive" data-load-error>{loadError}</p>
		{/if}
	</div>

	<div data-setting="sync-include-inbox">
		<SettingItem label="Include Inbox" description="Also sync the Todoist Inbox. Turn it on in one vault only.">
			<Switch
				checked={todoist.syncIncludeInbox}
				onCheckedChange={(syncIncludeInbox) => settingsStore.updateTodoist({ syncIncludeInbox })}
			/>
		</SettingItem>
	</div>

	<div data-setting="sync-context">
		<SettingItem
			label="Vault context"
			description="A work vault sends new tasks with no context label, so the webhook adds Work. A personal vault sends them with the label personal."
		>
			<Select.Root
				type="single"
				value={todoist.syncContext}
				onValueChange={(v) => settingsStore.updateTodoist({ syncContext: v === 'personal' ? 'personal' : 'work' })}
			>
				<Select.Trigger class="w-44" aria-label="Vault context">
					<span data-slot="select-value">{CONTEXT_OPTIONS.find((o) => o.value === todoist.syncContext)?.label ?? 'Work'}</span>
				</Select.Trigger>
				<Select.Content>
					{#each CONTEXT_OPTIONS as opt (opt.value)}
						<Select.Item value={opt.value} label={opt.label} />
					{/each}
				</Select.Content>
			</Select.Root>
		</SettingItem>
	</div>

	<div data-setting="sync-folder">
		<SettingItem label="Sync folder" description="Folder for the project notes, one note per Todoist project">
			<Input
				type="text"
				value={todoist.syncFolder}
				oninput={(e) => settingsStore.updateTodoist({ syncFolder: (e.currentTarget as HTMLInputElement).value })}
				placeholder="Todoist"
			/>
		</SettingItem>
	</div>

	<div data-setting="sync-interval">
		<SettingItem label="Sync interval" description="Minutes between automatic syncs (at least 1)">
			<Input
				type="number"
				class="w-24"
				min={1}
				step={1}
				value={String(todoist.syncIntervalMinutes)}
				oninput={(e) => handleIntervalChange((e.currentTarget as HTMLInputElement).value)}
			/>
		</SettingItem>
	</div>
</div>
