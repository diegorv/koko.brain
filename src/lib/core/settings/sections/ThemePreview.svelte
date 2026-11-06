<script lang="ts">
	import { isDarkColor } from '#lib/utils/color.js';
	import type { ThemeColors } from '../theme.types';

	/**
	 * Mini app preview of a theme: tab bar, rail, note list and editor, as in the Inbox,
	 * drawn with its colors. The previewed theme is usually not the active one, so
	 * its root re-derives the column tones from its own colors (`.column-tones` in
	 * app.css). The dark test matches `applyMode` in theme.service.ts.
	 */
	let { colors }: { /** Colors of the theme to draw */ colors: ThemeColors } = $props();

	const ui = $derived(colors.ui);
	const syntax = $derived(colors.syntax);
	const dark = $derived(isDarkColor(ui.editorBg) !== false);
</script>

<div
	class="column-tones w-36 h-20 rounded-md overflow-hidden border border-border shrink-0 flex flex-col"
	class:column-tones-dark={dark}
	style="background-color: {ui.background}; --file-explorer-bg: {ui.fileExplorerBg}; --file-explorer-fg: {ui.fileExplorerFg}; --file-explorer-muted-fg: {ui.fileExplorerMutedFg}; --editor-bg: {ui.editorBg};"
	data-theme-preview
>
	<!-- Tab bar -->
	<div class="flex items-center gap-1 px-1.5" style="background-color: {ui.tabBar}; height: 14px;">
		<span class="rounded-t-sm px-1" style="background-color: {ui.editorBg}; font-size: 5px; color: {ui.editorFg}; line-height: 10px;">file.md</span>
		<span class="rounded-t-sm px-1 opacity-50" style="font-size: 5px; color: {ui.tabTextInactive}; line-height: 10px;">other.md</span>
	</div>
	<!-- Content area -->
	<div class="flex flex-1 min-h-0">
		<!-- Rail -->
		<div class="bg-rail-bg flex flex-col gap-0.5 px-1 py-1 shrink-0" style="width: 28px; border-right: 1px solid {ui.fileExplorerBorder};" data-theme-preview-column="rail">
			<span style="height: 3px; width: 80%; border-radius: 1px; background-color: {ui.fileExplorerFg}; opacity: 0.4;"></span>
			<span style="height: 3px; width: 60%; border-radius: 1px; background-color: {ui.fileExplorerFg}; opacity: 0.3;"></span>
			<span style="height: 3px; width: 70%; border-radius: 1px; background-color: {ui.fileExplorerFg}; opacity: 0.3;"></span>
		</div>
		<!-- Note list -->
		<div class="bg-list-bg flex flex-col gap-0.5 px-1 py-1 shrink-0" style="width: 40px; border-right: 1px solid {ui.divider};" data-theme-preview-column="list">
			<span style="height: 3px; width: 85%; border-radius: 1px; background-color: {ui.fileExplorerFg}; opacity: 0.4;"></span>
			<span style="height: 3px; width: 60%; border-radius: 1px; background-color: {ui.fileExplorerPrimary}; opacity: 0.6;"></span>
			<span style="height: 3px; width: 75%; border-radius: 1px; background-color: {ui.fileExplorerFg}; opacity: 0.4;"></span>
			<span style="height: 3px; width: 50%; border-radius: 1px; background-color: {ui.fileExplorerFg}; opacity: 0.25;"></span>
		</div>
		<!-- Editor -->
		<div class="flex flex-col gap-1 px-1.5 py-1.5 flex-1 min-w-0" style="background-color: {ui.editorBg};" data-theme-preview-editor>
			<span style="height: 4px; width: 60%; border-radius: 1px; background-color: {syntax.heading1};"></span>
			<span style="height: 3px; width: 85%; border-radius: 1px; background-color: {ui.editorFg}; opacity: 0.3;"></span>
			<span style="height: 3px; width: 70%; border-radius: 1px; background-color: {ui.editorFg}; opacity: 0.25;"></span>
			<span style="height: 4px; width: 45%; border-radius: 1px; background-color: {syntax.heading2};"></span>
			<span style="height: 3px; width: 75%; border-radius: 1px; background-color: {ui.editorFg}; opacity: 0.3;"></span>
		</div>
	</div>
</div>
