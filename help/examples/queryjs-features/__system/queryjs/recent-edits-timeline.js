// Recent edits — chronological feed grouped by day.
// Demonstrates kb.ui.timeline. Uses the file mtime to date each entry and
// kb.tryDate to skip entries without a parseable timestamp.

const recent = kb.pages()
	.sort(p => -kb.number(p.file.mtime))   // newest first
	.slice(0, 20)
	.map(p => {
		const dt = kb.tryDate(p.file.mtime);
		if (!dt) return null;
		return {
			date: dt.toFormat("yyyy-MM-dd"),
			title: p.file.basename,
			subtitle: p.file.folder || '(root)',
			dotColor: p.file.tags.includes('important')
				? 'rgba(239,68,68,0.9)'
				: undefined,
		};
	})
	.array()
	.filter(Boolean);

if (recent.length === 0) {
	kb.paragraph("No recently edited notes.");
} else {
	kb.ui.timeline(recent);
}
