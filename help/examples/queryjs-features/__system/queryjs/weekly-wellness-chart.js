// Weekly Wellness Chart — daily wellness metrics (radar + averages)
await kb.view('_system/queryjs/_shared-weekly-radar', {
  fields: [
    { key: 'life_track_sleep_quality', label: 'Sleep' },
    { key: 'life_track_energy', label: 'Energy' },
    { key: 'life_track_mood', label: 'Mood' },
    { key: 'life_track_health_water', label: 'Water' },
    { key: 'life_track_health_meditation', label: 'Meditation' },
    { key: 'life_track_health_exercices', label: 'Exercise' },
  ],
  header: 'Weekly Averages',
  headerRow: 'Metric',
  emptyMessage: "*No tracking data found for this week.*",
});
