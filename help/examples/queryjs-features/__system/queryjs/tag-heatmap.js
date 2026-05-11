// Tag intensity heatmap — color-scaled grid of every tag in the vault
// sized by note count. Demonstrates kb.ui.heatmap (the non-calendar
// variant). Use the calendar versions (kb.ui.heatmapCalendar /
// yearlyCalendar) when the axis is dates; use this one for arbitrary
// categorical data.

const counts = new Map();
for (const tag of kb.pages().flatMap(p => p.file.tags).array()) {
	counts.set(tag, (counts.get(tag) ?? 0) + 1);
}

const items = Array.from(counts.entries())
	.map(([tag, count]) => ({ tag, count }))
	.sort((a, b) => b.count - a.count)
	.slice(0, 24);

if (items.length === 0) {
	kb.paragraph("No tags to plot.");
} else {
	kb.ui.heatmap(items, {
		value: (it) => it.count,
		label: (it) => it.tag,
		tooltip: (it) => `${it.tag}: ${it.count} note${it.count === 1 ? '' : 's'}`,
		cellSize: 80,
		showLegend: true,
	});
}
