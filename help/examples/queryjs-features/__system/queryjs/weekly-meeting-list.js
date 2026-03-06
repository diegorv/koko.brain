const current = kb.current();
const created = kb.tryDate(current.created);
if (!created) {
	kb.paragraph("*No created date found on this note.*");
	return;
}

// Roll back to Monday of the same week
const startDate = created.startOf('week');
const endDate = startDate.plus({ days: 6 });

const resultado = kb.pages()
	.whereTag('type/meeting', 'type/capture-notes')
	.whereDate('created', startDate, endDate)
	.sort(p => {
		const dt = kb.tryDate(p.created);
		return dt ? dt.ts : 0;
	});

if (resultado.length === 0) {
	kb.paragraph("No meetings this week.");
} else {
	kb.ui.table(
		["Meeting", "Date", "Tags"],
		resultado.map(p => {
			const dt = kb.tryDate(p.created);
			const date = dt ? dt.toFormat("dd/MM HH:mm") : "—";
			const tags = p.file.tags?.length > 0 ? kb.ui.tags(p.file.tags) : "—";
			return [p.file.link, date, tags];
		}),
		{
			align: ["left", "center", "left"],
			striped: true,
		}
	);
}
