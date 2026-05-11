// Project progress table using kb.ui.progressBar inside table cells.
// `progressBar` returns a *string* (unicode bar), so it composes with
// kb.ui.table and the regular kb.table render path.

const projects = kb.pages('#project')
	.sort(p => -kb.number(p.progress));

if (projects.length === 0) {
	kb.paragraph("No notes tagged #project.");
} else {
	kb.ui.table(
		["Project", "Status", "Progress"],
		projects.map(p => {
			const value = Math.max(0, Math.min(100, kb.number(p.progress)));
			return [
				p.file.link,
				p.status ?? '—',
				kb.ui.progressBar(value, 100, { width: 18, showValue: true }),
			];
		}),
		{
			align: ['left', 'left', 'left'],
			striped: true,
		},
	);
}
