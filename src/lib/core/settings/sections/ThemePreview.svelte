<script lang="ts">
	import type { ThemeColors } from '../theme.types';

	/** Mini app preview of a theme: tab bar, sidebar and editor drawn with its colors. */
	let { colors }: { /** Colors of the theme to draw */ colors: ThemeColors } = $props();

	const ui = $derived(colors.ui);
	const syntax = $derived(colors.syntax);
</script>

<div
	class="w-36 h-20 rounded-md overflow-hidden border border-border shrink-0 flex flex-col"
	style="background-color: {ui.background}"
>
	<!-- Tab bar -->
	<div class="flex items-center gap-1 px-1.5" style="background-color: {ui.tabBar}; height: 14px;">
		<span class="rounded-t-sm px-1" style="background-color: {ui.card}; font-size: 5px; color: {ui.foreground}; line-height: 10px;">file.md</span>
		<span class="rounded-t-sm px-1 opacity-50" style="font-size: 5px; color: {ui.foreground}; line-height: 10px;">other.md</span>
	</div>
	<!-- Content area -->
	<div class="flex flex-1 min-h-0">
		<!-- Sidebar -->
		<div class="flex flex-col gap-0.5 px-1 py-1" style="width: 36px; background-color: {ui.background}; border-right: 1px solid {ui.divider};">
			<span style="height: 3px; width: 70%; border-radius: 1px; background-color: {ui.foreground}; opacity: 0.4;"></span>
			<span style="height: 3px; width: 55%; border-radius: 1px; background-color: {ui.foreground}; opacity: 0.3;"></span>
			<span style="height: 3px; width: 80%; border-radius: 1px; background-color: {ui.primary}; opacity: 0.6;"></span>
			<span style="height: 3px; width: 50%; border-radius: 1px; background-color: {ui.foreground}; opacity: 0.3;"></span>
		</div>
		<!-- Editor -->
		<div class="flex flex-col gap-1 px-2 py-1.5 flex-1 min-w-0" style="background-color: {ui.card};">
			<span style="height: 4px; width: 60%; border-radius: 1px; background-color: {syntax.heading1};"></span>
			<span style="height: 3px; width: 85%; border-radius: 1px; background-color: {ui.foreground}; opacity: 0.3;"></span>
			<span style="height: 3px; width: 70%; border-radius: 1px; background-color: {ui.foreground}; opacity: 0.25;"></span>
			<span style="height: 4px; width: 45%; border-radius: 1px; background-color: {syntax.heading2};"></span>
			<span style="height: 3px; width: 75%; border-radius: 1px; background-color: {ui.foreground}; opacity: 0.3;"></span>
		</div>
	</div>
</div>
