// Tag Count Table — lists all tags sorted by occurrence count
const counts = kb.pages()
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
