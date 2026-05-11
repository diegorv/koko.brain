// Tag cloud — every tag in the vault, sized by usage count.
// Demonstrates kb.ui.tagCloud. Pass either a string[] (it counts for you)
// or a Map<tag, count> (manual control).

const tagCounts = new Map();
for (const tag of kb.pages().flatMap(p => p.file.tags).array()) {
	tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
}

if (tagCounts.size === 0) {
	kb.paragraph("No tags in this vault yet.");
} else {
	kb.ui.tagCloud(tagCounts, {
		minFontSize: 12,
		maxFontSize: 30,
		color: "rgba(124,58,237,0.18)",
		showCount: true,
	});
}
