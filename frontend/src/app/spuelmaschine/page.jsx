'use client';

import { useState, useEffect, useCallback } from 'react';
import NavigationButtons from '@/components/NavigationButtons';
import { DateTime } from 'luxon';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';

const API_URL = 'http://localhost:3006/api/v1/dishwasher';
const KIDS = (process.env.NEXT_PUBLIC_DISHWASHER_KIDS ?? 'Kind1,Kind2')
  .split(',')
  .map(name => name.trim())
  .filter(Boolean);
const TODAY = DateTime.now().toISODate();

function getTodayLabel() {
  return DateTime.now().setLocale('de').toFormat('EEEE, d. MMMM yyyy');
}

function countEntries(entries, name) {
  return entries.filter(e => e.name === name).length;
}

function hasDoneToday(entries, name) {
  return entries.some(e => e.name === name && e.date === TODAY);
}

// Older entries only have a date, so fall back to the start of that day
function entryMillis(entry) {
  return DateTime.fromISO(entry.timestamp ?? entry.date).toMillis();
}

// Returns -Infinity if the person has never emptied the dishwasher
function lastDoneMillis(entries, name) {
  return Math.max(...entries.filter(e => e.name === name).map(entryMillis));
}

export default function Spuelmaschine() {
  const [entries, setEntries] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(API_URL);
      const json = await res.json();
      setEntries(json.entries ?? []);
    } catch {
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(newEntries) {
    setSaving(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: newEntries }),
      });
    } finally {
      setSaving(false);
    }
  }

  function handleCheck(name, checked) {
    if (checked) {
      const newEntries = [
        ...entries,
        { name, date: TODAY, timestamp: DateTime.now().toISO() },
      ];
      setEntries(newEntries);
      save(newEntries);
    } else {
      // Remove the today entry for this person
      const newEntries = entries.filter(e => !(e.name === name && e.date === TODAY));
      setEntries(newEntries);
      save(newEntries);
    }
  }

  if (entries === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <CircularProgress />
      </div>
    );
  }

  const counts = Object.fromEntries(
    KIDS.map(name => [name, countEntries(entries, name)])
  );

  // Fewest turns is next; on a tie the one whose last turn is longest ago
  const minCount = Math.min(...KIDS.map(name => counts[name]));
  const lastDone = Object.fromEntries(
    KIDS.map(name => [name, lastDoneMillis(entries, name)])
  );
  const candidates = KIDS.filter(k => counts[k] === minCount).sort(
    (a, b) => (lastDone[a] === lastDone[b] ? 0 : lastDone[a] - lastDone[b])
  );
  const undecided =
    candidates.length === KIDS.length &&
    candidates.length > 1 &&
    lastDone[candidates[0]] === lastDone[candidates[1]];
  const isDran = undecided ? null : candidates[0];

  return (
    <div className="flex min-h-screen flex-col justify-between divide-y divide-solid divide-slate-300 border border-solid border-slate-300 bg-black font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-grow flex-col items-center justify-center gap-8 bg-black px-6 py-8">
        <h1 className="text-3xl font-bold text-white">Spülmaschine ausräumen</h1>
        <p className="text-slate-400">{getTodayLabel()}</p>

        {isDran && (
          <div className="rounded-xl border border-yellow-400 bg-yellow-900/30 px-8 py-4 text-center">
            <span className="text-xl text-yellow-300">
              <span className="font-bold">{isDran}</span> ist dran!
            </span>
          </div>
        )}
        {!isDran && (
          <div className="rounded-xl border border-green-400 bg-green-900/30 px-8 py-4 text-center">
            <span className="text-xl text-green-300">Alle gleich auf!</span>
          </div>
        )}

        <div className="flex w-full max-w-md flex-col gap-6">
          {KIDS.map(name => {
            const doneToday = hasDoneToday(entries, name);
            return (
              <div
                key={name}
                className="flex items-center justify-between rounded-xl border border-slate-600 bg-slate-900 px-6 py-5"
              >
                <div className="flex flex-col">
                  <span className="text-2xl font-semibold text-white">{name}</span>
                  <span className="text-sm text-slate-400">
                    {counts[name]}× ausgeräumt insgesamt
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Checkbox
                    checked={doneToday}
                    onChange={e => handleCheck(name, e.target.checked)}
                    sx={{
                      color: 'rgb(148 163 184)',
                      '&.Mui-checked': { color: 'rgb(34 197 94)' },
                      transform: 'scale(1.8)',
                    }}
                  />
                  <span className="text-xs text-slate-500">heute</span>
                </div>
              </div>
            );
          })}
        </div>

        {saving && (
          <div className="text-sm text-slate-500">Speichern…</div>
        )}

        <div className="mt-4 w-full max-w-md">
          <h2 className="mb-3 text-lg font-semibold text-slate-300">Verlauf</h2>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-4">
            {entries.length === 0 && (
              <p className="text-center text-slate-500">Noch keine Einträge</p>
            )}
            {[...entries]
              .sort((a, b) => entryMillis(b) - entryMillis(a))
              .map((e, i) => (
                <div
                  key={i}
                  className="flex justify-between border-b border-slate-700 py-2 last:border-0"
                >
                  <span className="text-white">{e.name}</span>
                  <span className="text-slate-400">
                    {e.timestamp
                      ? DateTime.fromISO(e.timestamp)
                          .setLocale('de')
                          .toFormat("d. MMM yyyy, HH:mm 'Uhr'")
                      : DateTime.fromISO(e.date).setLocale('de').toFormat('d. MMM yyyy')}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </main>

      <footer className="flex h-[3vh] items-center justify-center bg-black">
        <NavigationButtons />
      </footer>
    </div>
  );
}
