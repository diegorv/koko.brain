const current = kb.current();
const dataAtual = kb.tryDate(current.created);
if (!dataAtual) {
	kb.paragraph("*No created date found on this note.*");
	return;
}

const inlinks = current.file.inlinks;
const linkSet = new Set(
	inlinks.map(l => l.path.split("/").pop().replace(".md", ""))
);

const resultado = kb.pages()
	.whereTag('type/meeting')
	.whereDate('created', dataAtual, dataAtual)
	.where(p => linkSet.has(p.file.basename))
	.sort(p => {
		const dt = kb.tryDate(p.created);
		return dt ? dt.ts : 0;
	});

if (resultado.length === 0) {
	kb.paragraph("No meetings for today.");
} else {
	kb.ui.table(
		["Meeting", "Last Update", "Tags"],
		resultado.map(p => {
			const dt = kb.tryDate(p.created);
			const time = dt ? dt.toFormat("HH:mm") : "—";
			const tags = p.file.tags?.length > 0 ? kb.ui.tags(p.file.tags) : "—";
			return [p.file.link, time, tags];
		}),
		{
			align: ["left", "center", "left"],
			striped: true,
		}
	);
}
