// Yearly Wellness Heatmap — average of all life_track metrics per day
const dailies = dv.pages('#type/journal/daily');

if (dailies.length === 0) {
  dv.paragraph("*No daily notes found.*");
  return;
}

const fields = [
  'life_track_sleep_quality',
  'life_track_energy',
  'life_track_mood',
  'life_track_health_water',
  'life_track_health_meditation',
  'life_track_health_exercices',
];

dv.ui.heatmapCalendar(
  dailies.map(p => {
    const dt = dv.tryDate(p.created);
    const values = fields.map(f => dv.number(p[f]));
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return {
      date: dt ? dt.toISODate() : '',
      intensity: Math.round(avg * 10) / 10,
      color: avg >= 4 ? 'green' : avg >= 2.5 ? 'yellow' : 'red',
    };
  }).array(),
  {
    year: 2026,
    colors: {
      green: ['#c6e48b', '#7bc96f', '#49af5d', '#2e8840', '#196127'],
      yellow: ['#fff3bf', '#ffe066', '#ffd43b', '#fab005', '#e67700'],
      red: ['#ff9e82', '#ff7b55', '#ff4d1a', '#e73400', '#bd2a00'],
    },
    intensityScaleStart: 1,
    intensityScaleEnd: 5,
  }
);
