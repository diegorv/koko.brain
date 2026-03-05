const current = dv.current();
const created = dv.tryDate(current.created);
if (!created) {
	dv.paragraph("*No created date found on this note.*");
	return;
}

// Roll back to Monday of the same week
const startDate = created.startOf('week');
const endDate = startDate.plus({ days: 6 });

const resultado = dv.pages()
	.whereTag('type/meeting', 'type/capture-notes')
	.whereDate('created', startDate, endDate)
	.sort(p => {
		const dt = dv.tryDate(p.created);
		return dt ? dt.ts : 0;
	});

if (resultado.length === 0) {
	dv.paragraph("No meetings this week.");
} else {
	dv.ui.table(
		["Meeting", "Date", "Tags"],
		resultado.map(p => {
			const dt = dv.tryDate(p.created);
			const date = dt ? dt.toFormat("dd/MM HH:mm") : "—";
			const tags = p.file.tags?.length > 0 ? dv.ui.tags(p.file.tags) : "—";
			return [p.file.link, date, tags];
		}),
		{
			align: ["left", "center", "left"],
			striped: true,
		}
	);
}
