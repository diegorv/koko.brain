// Yearly Sleep Quality — Vertical calendar (months as columns, days as rows)
const dailies = kb.pages('#type/journal/daily');

if (dailies.length === 0) {
  kb.paragraph("*No daily notes found.*");
  return;
}

kb.ui.yearlyCalendar(
  dailies.map(p => {
    const dt = kb.tryDate(p.created);
    return {
      date: dt ? dt.toISODate() : '',
      intensity: kb.number(p.life_track_sleep_quality),
    };
  }).array(),
  {
    year: 2026,
    colors: {
      default: ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a'],
    },
    intensityScaleStart: 1,
    intensityScaleEnd: 5,
  }
);
