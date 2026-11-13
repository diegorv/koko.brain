<script lang="ts">
	import { Input } from '#lib/components/ui/input/index.js';
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

	<p class="mb-4 text-sm text-muted-foreground">
		Composer popover (Ctrl+Alt+Cmd+Space) and clipboard shortcut (Ctrl+Alt+Cmd+C) share these
		settings. Each capture kind can use its own template; leave a template path empty to write
		the rendered body with no template.
	</p>

	<SettingItem
		label="Folder format"
		description="Date pattern for the subfolder inside the notes folder, e.g. YYYY/MM-MMM"
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
		description="Date pattern for the filename. Text in [ ] is kept as is, e.g. [capture-note-]YYYY-MM-DD"
	>
		<Input
			value={settingsStore.quickCapture.filenameFormat}
			oninput={(e) => {
				settingsStore.updateQuickCapture({ filenameFormat: inputValue(e) });
			}}
		/>
	</SettingItem>

	<h3 class="section-label mt-6 mb-2">
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
</div>
