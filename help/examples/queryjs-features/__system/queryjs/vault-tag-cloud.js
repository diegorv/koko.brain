// Tag cloud — every tag in this note's folder, sized by usage count.
// Demonstrates kb.ui.tagCloud. Pass either a string[] (it counts for you)
// or a Record<tag, count> (manual control).

const tagCounts = new Map();
for (const tag of kb.pages(`"${kb.current().file.folder}"`).flatMap(p => p.file.tags).array()) {
	tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
}

if (tagCounts.size === 0) {
	kb.paragraph("No tags in this folder yet.");
} else {
	kb.ui.tagCloud(Object.fromEntries(tagCounts), {
		minFontSize: 12,
		maxFontSize: 30,
		color: "rgba(124,58,237,0.18)",
		showCount: true,
	});
}
