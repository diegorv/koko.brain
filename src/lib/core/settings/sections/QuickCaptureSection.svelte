<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { settingsStore } from '../settings.store.svelte';
	import SettingItem from './SettingItem.svelte';

	function inputValue(e: Event): string {
		return (e.currentTarget as HTMLInputElement).value;
	}

	type Kind = 'note' | 'clip' | 'link' | 'shot' | 'file';

	const KIND_LABELS: Record<Kind, string> = {
		note: 'Note (composer)',
		clip: 'Clip (clipboard text)',
		link: 'Link (clipboard URL)',
		shot: 'Shot (clipboard image)',
		file: 'File (clipboard files)',
	};

	const KIND_DESCRIPTIONS: Record<Kind, string> = {
		note: 'Template used when the composer popover saves a free-form note.',
		clip: 'Template used when the clipboard shortcut detects plain text.',
		link: 'Template used when the clipboard shortcut detects a URL.',
		shot: 'Template used when the clipboard holds an image.',
		file: 'Template used when the clipboard holds one or more file paths.',
	};
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Quick Capture</h2>

	<p class="text-muted-foreground mb-2 text-sm">
		Composer popover (Ctrl+Alt+Cmd+Space) and clipboard shortcut (Ctrl+Alt+Cmd+C) share these
		settings. Each capture kind can use its own template; leave a template path empty to write
		the rendered body with no template.
	</p>

	<SettingItem
		label="Folder format"
		description="dayjs format for the subfolder path under the vault (e.g. YYYY/MM-MMM)"
	>
		<Input
			value={settingsStore.quickCapture.folderFormat}
			oninput={(e) => {
				settingsStore.updateQuickCapture({ folderFormat: inputValue(e) });
			}}
		/>
	</SettingItem>

	<SettingItem
		label="Filename format"
		description="dayjs format for the filename (use [] for literal text, e.g. [capture-note-]YYYY-MM-DD)"
	>
		<Input
			value={settingsStore.quickCapture.filenameFormat}
			oninput={(e) => {
				settingsStore.updateQuickCapture({ filenameFormat: inputValue(e) });
			}}
		/>
	</SettingItem>

	<h3 class="mt-6 mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
		Templates by kind
	</h3>

	{#each Object.keys(KIND_LABELS) as kind (kind)}
		{@const k = kind as Kind}
		<SettingItem label={KIND_LABELS[k]} description={KIND_DESCRIPTIONS[k]}>
			<Input
				value={settingsStore.quickCapture.templates[k]}
				oninput={(e) => {
					settingsStore.updateQuickCapture({
						templates: { ...settingsStore.quickCapture.templates, [k]: inputValue(e) },
					});
				}}
			/>
		</SettingItem>
	{/each}

	<h3 class="mt-6 mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
		Dock badge
	</h3>

	<SettingItem
		label="Show inbox count on dock"
		description="Display the number of inbox notes (unorganized, not archived) as a red badge on the macOS dock icon."
	>
		<Switch
			checked={settingsStore.dockBadgeInboxCount}
			onCheckedChange={(v) => {
				settingsStore.setSettings({ ...settingsStore.settings, dockBadgeInboxCount: v });
			}}
		/>
	</SettingItem>
</div>
