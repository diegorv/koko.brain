// Weekly Wellness Chart - Radar chart with daily wellness metrics for the week
const current = dv.current();
if (!current || !current.created) {
  dv.paragraph("*No created date found on this note.*");
  return;
}

const weekStart = dv.tryDate(current.created);
if (!weekStart) {
  dv.paragraph("*Invalid created date.*");
  return;
}

const fields = [
  { key: 'life_track_sleep_quality', label: 'Sleep' },
  { key: 'life_track_energy', label: 'Energy' },
  { key: 'life_track_mood', label: 'Mood' },
  { key: 'life_track_health_water', label: 'Water' },
  { key: 'life_track_health_meditation', label: 'Meditation' },
  { key: 'life_track_health_exercices', label: 'Exercise' },
];

const weekEnd = weekStart.plus({ days: 6 });
const days = dv.getDaysInRange(weekStart, weekEnd);
const daysArr = days.array();

const dayColors = [
  'rgba(66,153,225,1)',   // Mon
  'rgba(72,187,120,1)',   // Tue
  'rgba(237,137,54,1)',   // Wed
  'rgba(139,108,239,1)',  // Thu
  'rgba(237,100,166,1)',  // Fri
  'rgba(56,178,172,1)',   // Sat
  'rgba(245,196,66,1)',   // Sun
];
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Find daily notes in this week and map each day to its note (or null)
const dailyNotes = dv.pages('#type/journal/daily')
  .whereDate('created', weekStart, weekEnd);

const noteByDay = dailyNotes.byDate('created', daysArr);

// Build radar datasets — one line per day that has data
const datasets = noteByDay
  .map((nota, i) => {
    if (!nota) return null;
    const data = fields.map(f => dv.number(nota[f.key]));
    if (!data.some(v => v > 0)) return null;
    return { label: `${dayNames[i]} ${daysArr[i].toFormat('dd/MM')}`, data, color: dayColors[i] };
  })
  .filter(Boolean);

if (datasets.length === 0) {
  dv.paragraph("*No tracking data found for this week.*");
  return;
}

await dv.ui.chart('radar', {
  labels: fields.map(f => f.label),
  datasets,
  max: 5,
  stepSize: 1,
});

// Weekly averages table
dv.header(3, 'Weekly Averages');

const averages = fields.map(f => {
  const sum = noteByDay.reduce((acc, nota) => acc + dv.number(nota?.[f.key]), 0);
  return Math.round((sum / daysArr.length) * 10) / 10;
});

dv.table(
  ["Metric", "Avg", "Visual"],
  fields.map((f, i) => [f.label, averages[i].toFixed(1), dv.progressBar(averages[i], 5)])
);
