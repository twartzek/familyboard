'use client';

import useSWR from 'swr';
import Link from 'next/link';
import PersonIcon from '@mui/icons-material/Person';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ErrorView from '@/components/ErrorView';
import LoadingView from '@/components/LoadingView';
import { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';

import NavigationButtons from '@/components/NavigationButtons';

const fetcher = async (...args) => {
  const res = await fetch(...args);
  if (res.ok) {
    const resJson = await res.json();
    if (resJson.detail)
      throw new Error('BearerToken fehlt oder ist nicht gültig');
    return resJson;
  }
  if (res.status === 500) {
    const error = new Error('Der Tandoor Server ist nicht erreichbar');
    error.status = res.status;
    throw error;
  }

  throw new Error(res.statusText);
};

export default function AllRecipes() {
  const url = 'http://localhost:3006/api/v1/allrecipes';
  const { data, error, isLoading } = useSWR(url, fetcher, {});
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const handleSwipe = eventData => {
    if (eventData.dir === 'Left' && eventData.velocity > 1) {
      console.log('swipe left');
      router.back();
    }
  };

  const handlers = useSwipeable({
    onSwiped: handleSwipe,
    // onTouchStartOrOnMouseDown: ({ event }) => event.preventDefault(),
    // touchEventOptions: { passive: false },
    // preventScrollOnSwipe: true,
    // trackMouse: true,
  });

  if (isLoading)
    return (
      <div className="divide flex min-h-screen w-screen flex-col justify-between divide-y divide-solid divide-slate-300 border border-solid border-slate-300 bg-black font-[family-name:var(--font-geist-sans)]">
        <main className="h-[97vh] w-full flex-grow touch-auto overflow-y-auto bg-black">
          <div className="grid h-full w-full place-items-center">
            <LoadingView />
          </div>
        </main>
        <footer className="flex h-[3vh] items-center justify-center bg-black">
          <NavigationButtons />
        </footer>
      </div>
    );

  if (error)
    return (
      <div className="divide flex min-h-screen w-screen flex-col justify-between divide-y divide-solid divide-slate-300 border border-solid border-slate-300 bg-black font-[family-name:var(--font-geist-sans)]">
        <main className="h-[97vh] w-full flex-grow touch-auto overflow-y-auto bg-black">
          <div className="grid h-full w-full place-items-center">
            <Box sx={{ display: 'flex' }}>{error.message}</Box>
          </div>
        </main>
        <footer className="flex h-[3vh] items-center justify-center bg-black">
          <NavigationButtons />
        </footer>
      </div>
    );

  if (data.count === 0)
    return (
      <div className="divide flex min-h-screen w-screen flex-col justify-between divide-y divide-solid divide-slate-300 border border-solid border-slate-300 bg-black font-[family-name:var(--font-geist-sans)]">
        <main className="h-[97vh] w-full flex-grow touch-auto overflow-y-auto bg-black">
          <div className="grid h-full w-full place-items-center">
            <Box sx={{ display: 'flex' }}>
              Entweder ist der Bearertoken falsch oder du hast noch keine
              Rezepte erstellt.
            </Box>
          </div>
        </main>
        <footer className="flex h-[3vh] items-center justify-center bg-black">
          <NavigationButtons />
        </footer>
      </div>
    );

  const searchTerm = search.trim().toLowerCase();
  const filteredRecipes = data.results.filter(
    recipe =>
      recipe.name.toLowerCase().includes(searchTerm) ||
      recipe.keywords.some(tag => tag.label.toLowerCase().includes(searchTerm)),
  );

  return (
    <div className="divide flex min-h-screen w-screen flex-col justify-between divide-y divide-solid divide-slate-300 border border-solid border-slate-300 bg-black font-[family-name:var(--font-geist-sans)]">
      <main
        className={
          (keyboardOpen ? 'h-[67vh]' : 'h-[91vh]') +
          ' w-full flex-grow touch-auto overflow-y-auto bg-black'
        }
        {...handlers}
      >
        {filteredRecipes.length === 0 ? (
          <div className="grid h-full w-full place-items-center">
            <Box sx={{ display: 'flex' }}>Keine Rezepte gefunden.</Box>
          </div>
        ) : (
          <div className="grid w-full touch-auto grid-cols-3 content-start gap-4">
            {filteredRecipes.map(recipe => {
              return (
                <RecipeCard
                  image={recipe.image}
                  title={recipe.name}
                  key={recipe.id}
                  workingTime={recipe.working_time}
                  waitingTime={recipe.waiting_time}
                  keywords={recipe.keywords}
                  id={recipe.id}
                />
              );
            })}
          </div>
        )}
      </main>
      <div className="flex h-[6vh] items-center justify-center bg-black px-2">
        <input
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          onFocus={() => setKeyboardOpen(true)}
          inputMode="none"
          placeholder="Rezept suchen…"
          className="h-[4vh] w-1/2 rounded border border-solid border-slate-300 bg-gray-900 px-3 text-lg text-white placeholder-slate-400 focus:border-yellow-600 focus:outline-none"
        />
      </div>
      {keyboardOpen && (
        <SearchKeyboard
          onKey={key => setSearch(search + key)}
          onBackspace={() => setSearch(search.slice(0, -1))}
          onClear={() => setSearch('')}
          onClose={() => setKeyboardOpen(false)}
        />
      )}
      <footer className="flex h-[3vh] items-center justify-center bg-black">
        <NavigationButtons />
      </footer>
    </div>
  );
}

const KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p', 'ü'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä'],
  ['y', 'x', 'c', 'v', 'b', 'n', 'm', 'ß'],
];

// The kiosk browser on the Pi has no system on-screen keyboard, so the search
// field brings its own.
function SearchKeyboard({ onKey, onBackspace, onClear, onClose }) {
  const keyClass =
    'h-full select-none rounded bg-gray-800 text-2xl text-white active:bg-yellow-600';

  return (
    <div className="flex h-[24vh] flex-col gap-1 bg-black p-1">
      {KEYBOARD_ROWS.map((row, rowIndex) => {
        return (
          <div key={rowIndex} className="flex flex-1 gap-1">
            {row.map(key => {
              return (
                <button
                  type="button"
                  key={key}
                  className={keyClass + ' flex-1'}
                  onClick={() => onKey(key)}
                >
                  {key}
                </button>
              );
            })}
            {rowIndex === KEYBOARD_ROWS.length - 1 && (
              <button
                type="button"
                className={keyClass + ' flex-[3]'}
                onClick={onBackspace}
              >
                ⌫
              </button>
            )}
          </div>
        );
      })}
      <div className="flex flex-1 gap-1">
        <button
          type="button"
          className={keyClass + ' flex-1'}
          onClick={onClear}
        >
          Löschen
        </button>
        <button
          type="button"
          className={keyClass + ' flex-[3]'}
          onClick={() => onKey(' ')}
        >
          Leerzeichen
        </button>
        <button
          type="button"
          className={keyClass + ' flex-1'}
          onClick={onClose}
        >
          Schließen
        </button>
      </div>
    </div>
  );
}

function CookTimeBadge({ workingTime, waitingTime }) {
  return (
    <div className="absolute z-10 ml-1 mt-1">
      <Stack direction="row" spacing={1}>
        <Chip
          icon={<PersonIcon color="rgba(240, 240, 240, 1)" />}
          label={workingTime + ' min'}
          sx={{
            bgcolor: 'rgba(5, 5, 5, 0.7)',
            color: 'rgba(240, 240, 240, 1)',
          }}
        />
        <Chip
          icon={<AccessTimeIcon color="rgba(240, 240, 240, 1)" />}
          label={waitingTime + ' min'}
          sx={{
            bgcolor: 'rgba(5, 5, 5, 0.6)',
            color: 'rgba(240, 240, 240, 1)',
          }}
          // className="bg-yellow-600 opacity-80"
        />
      </Stack>
    </div>
  );
}

function RecipeTags({ recipeKeywords }) {
  return (
    <div className="mb-2 flex flex-row overflow-y-auto">
      {recipeKeywords.map((tag, index) => {
        return (
          <div
            key={index}
            className="ml-2 whitespace-pre rounded bg-yellow-600 px-2 text-sm opacity-80"
          >
            {tag.label}
          </div>
        );
      })}
    </div>
  );
}

function RecipeCard({ image, title, workingTime, waitingTime, id, keywords }) {
  return (
    <Link href={'http://localhost:3000/singlerecipe?id=' + id}>
      <div className="flex h-[20vh] w-full flex-col bg-black">
        <div className="relative flex-grow rounded-t text-white">
          <CookTimeBadge workingTime={workingTime} waitingTime={waitingTime} />
          <img
            src={image}
            alt="Rezept"
            loading="lazy"
            className="absolute h-full w-full rounded-t object-cover"
          ></img>
        </div>
        <div className="line-clamp-2 flex h-24 flex-col justify-between rounded-b bg-gray-900 text-center text-lg font-bold text-white">
          {title}
          <RecipeTags recipeKeywords={keywords} />
        </div>
      </div>
    </Link>
  );
}
