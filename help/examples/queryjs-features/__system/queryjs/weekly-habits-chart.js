// Weekly Habits Chart - Radar chart with daily Body & Mind habits for the week
const current = kb.current();
if (!current || !current.created) {
  kb.paragraph("*No created date found on this note.*");
  return;
}

const weekStart = kb.tryDate(current.created);
if (!weekStart) {
  kb.paragraph("*Invalid created date.*");
  return;
}

const fields = [
  { key: 'life_track_health_water', label: 'Water' },
  { key: 'life_track_health_meditation', label: 'Meditation' },
  { key: 'life_track_health_exercices', label: 'Exercise' },
  { key: 'life_track_agenda_review', label: 'Agenda Review' },
];

const weekEnd = weekStart.plus({ days: 6 });
const days = kb.getDaysInRange(weekStart, weekEnd);
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
const dailyNotes = kb.pages('#type/journal/daily')
  .whereDate('created', weekStart, weekEnd);

const noteByDay = dailyNotes.byDate('created', daysArr);

// Build radar datasets — one line per day that has data
const datasets = noteByDay
  .map((nota, i) => {
    if (!nota) return null;
    const data = fields.map(f => kb.number(nota[f.key]));
    if (!data.some(v => v > 0)) return null;
    return { label: `${dayNames[i]} ${daysArr[i].toFormat('dd/MM')}`, data, color: dayColors[i] };
  })
  .filter(Boolean);

if (datasets.length === 0) {
  kb.paragraph("*No habits data found for this week.*");
  return;
}

await kb.ui.chart('radar', {
  labels: fields.map(f => f.label),
  datasets,
  max: 5,
  stepSize: 1,
});

// Weekly averages table
kb.header(3, 'Weekly Averages');

const averages = fields.map(f => {
  const sum = noteByDay.reduce((acc, nota) => acc + kb.number(nota?.[f.key]), 0);
  return Math.round((sum / daysArr.length) * 10) / 10;
});

kb.table(
  ["Habit", "Avg", "Visual"],
  fields.map((f, i) => [f.label, averages[i].toFixed(1), kb.progressBar(averages[i], 5)])
);
