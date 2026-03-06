// Yearly Sleep Quality Heatmap — GitHub-style calendar colored by sleep_quality
const dailies = kb.pages('#type/journal/daily');

if (dailies.length === 0) {
  kb.paragraph("*No daily notes found.*");
  return;
}

kb.ui.heatmapCalendar(
  dailies.map(p => {
    const dt = kb.tryDate(p.created);
    return {
      date: dt ? dt.toISODate() : '',
      intensity: kb.number(p.life_track_sleep_quality),
    };
  }).array(),
  {
    year: 2026,
    intensityScaleStart: 1,
    intensityScaleEnd: 5,
  }
);
