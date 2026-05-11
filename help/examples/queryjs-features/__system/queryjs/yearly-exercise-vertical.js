// Yearly Exercise — Vertical calendar with emoji on intense workout days
const ref = kb.tryDate(kb.current()?.created) ?? kb.date();
const year = ref.year;

const dailies = kb.pages('#type/journal/daily')
  .whereDate('created', ref.startOf('year'), ref.endOf('year'));

if (dailies.length === 0) {
  kb.paragraph(`*No daily notes found for ${year}.*`);
  return;
}

kb.ui.yearlyCalendar(
  dailies.map(p => {
    const dt = kb.tryDate(p.created);
    const val = kb.number(p.life_track_health_exercices);
    return {
      date: dt ? dt.toISODate() : '',
      intensity: val,
      color: 'red',
      content: val >= 4 ? '💪' : '',
    };
  }).array(),
  {
    year,
    colors: {
      red: ['#ff9e82', '#ff7b55', '#ff4d1a', '#e73400', '#bd2a00'],
    },
    intensityScaleStart: 1,
    intensityScaleEnd: 5,
  }
);
