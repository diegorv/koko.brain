// Yearly Sleep Quality Heatmap — GitHub-style calendar colored by sleep_quality
const dailies = dv.pages('#type/journal/daily');

if (dailies.length === 0) {
  dv.paragraph("*No daily notes found.*");
  return;
}

dv.ui.heatmapCalendar(
  dailies.map(p => {
    const dt = dv.tryDate(p.created);
    return {
      date: dt ? dt.toISODate() : '',
      intensity: dv.number(p.life_track_sleep_quality),
    };
  }).array(),
  {
    year: 2026,
    intensityScaleStart: 1,
    intensityScaleEnd: 5,
  }
);
