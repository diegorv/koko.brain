// Yearly Sleep Quality Heatmap — GitHub-style calendar colored by sleep_quality
const ref = kb.tryDate(kb.current()?.created) ?? kb.date();
const year = ref.year;

const dailies = kb.pages('#type/journal/daily')
  .whereDate('created', ref.startOf('year'), ref.endOf('year'));

if (dailies.length === 0) {
  kb.paragraph(`*No daily notes found for ${year}.*`);
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
    year,
    intensityScaleStart: 1,
    intensityScaleEnd: 5,
  }
);
