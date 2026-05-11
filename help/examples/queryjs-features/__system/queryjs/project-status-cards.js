// Status board — one card per project, colored by status.
// Demonstrates kb.ui.statusCards with a custom color map and subtitles
// pulled from tags.

const projects = kb.pages('#project')
	.sort(p => p.status || 'zz-unknown');

if (projects.length === 0) {
	kb.paragraph("No notes tagged #project yet.");
} else {
	kb.ui.statusCards(
		projects.map(p => ({
			title: p.file.basename,
			status: p.status ?? 'unknown',
			subtitle: p.file.tags.filter(t => t !== 'project').join(' · ') || '—',
		})).array(),
		{
			colors: {
				active:    { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.6)' },
				blocked:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.6)' },
				review:    { bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.6)' },
				done:      { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.6)' },
				unknown:   { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.4)' },
			},
		},
	);
}
