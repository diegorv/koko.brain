// Tag Count Table — lists the tags in this note's folder sorted by occurrence count
const counts = kb.pages(`"${kb.current().file.folder}"`)
	.flatMap(p => p.file.tags)
	.countBy();

const sorted = Object.entries(counts)
	.sort((a, b) => b[1] - a[1])
	.slice(0, 200);

if (sorted.length === 0) {
	kb.paragraph("No tags found.");
} else {
	kb.table(
		["Tag", "Count"],
		sorted.map(([tag, count]) => ["#" + tag, count])
	);
}
