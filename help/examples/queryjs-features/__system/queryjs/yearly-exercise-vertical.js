// Yearly Exercise — Vertical calendar with emoji on intense workout days
const dailies = dv.pages('#type/journal/daily');

if (dailies.length === 0) {
  dv.paragraph("*No daily notes found.*");
  return;
}

dv.ui.yearlyCalendar(
  dailies.map(p => {
    const dt = dv.tryDate(p.created);
    const val = dv.number(p.life_track_health_exercices);
    return {
      date: dt ? dt.toISODate() : '',
      intensity: val,
      color: 'red',
      content: val >= 4 ? '💪' : '',
    };
  }).array(),
  {
    year: 2026,
    colors: {
      red: ['#ff9e82', '#ff7b55', '#ff4d1a', '#e73400', '#bd2a00'],
    },
    intensityScaleStart: 1,
    intensityScaleEnd: 5,
  }
);
