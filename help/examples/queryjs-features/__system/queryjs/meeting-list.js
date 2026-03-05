const current = dv.current();
const dataAtual = dv.tryDate(current.created);
if (!dataAtual) {
	dv.paragraph("*No created date found on this note.*");
	return;
}

const inlinks = current.file.inlinks;
const linkNames = inlinks.map(l => l.path.split("/").pop().replace(".md", ""));

const resultado = dv.pages()
	.where(p => linkNames.some(name => name === p.file.name || p.file.path.includes(name)))
	.whereTag('type/meeting')
	.whereDate('created', dataAtual, dataAtual)
	.sort(p => {
		const dt = dv.tryDate(p.created);
		return dt ? dt.ts : 0;
	});

if (resultado.length === 0) {
	dv.paragraph("No meetings for today.");
} else {
	dv.ui.table(
		["Meeting", "Last Update", "Tags"],
		resultado.map(p => {
			const dt = dv.tryDate(p.created);
			const time = dt ? dt.toFormat("HH:mm") : "—";
			const tags = p.file.tags?.length > 0 ? dv.ui.tags(p.file.tags) : "—";
			return [p.file.link, time, tags];
		}),
		{
			align: ["left", "center", "left"],
			striped: true,
		}
	);
}
