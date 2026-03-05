// Yearly Sleep Quality — Vertical calendar (months as columns, days as rows)
const dailies = dv.pages('#type/journal/daily');

if (dailies.length === 0) {
  dv.paragraph("*No daily notes found.*");
  return;
}

dv.ui.yearlyCalendar(
  dailies.map(p => {
    const dt = dv.tryDate(p.created);
    return {
      date: dt ? dt.toISODate() : '',
      intensity: dv.number(p.life_track_sleep_quality),
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
