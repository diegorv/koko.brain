// Weekly Habits Chart — daily Body & Mind habits (radar + averages)
await kb.view('_system/queryjs/_shared-weekly-radar', {
  fields: [
    { key: 'life_track_health_water', label: 'Water' },
    { key: 'life_track_health_meditation', label: 'Meditation' },
    { key: 'life_track_health_exercices', label: 'Exercise' },
    { key: 'life_track_agenda_review', label: 'Agenda Review' },
  ],
  header: 'Weekly Averages',
  headerRow: 'Habit',
  emptyMessage: "*No habits data found for this week.*",
});
