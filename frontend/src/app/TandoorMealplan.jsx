'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { DateTime } from 'luxon';
import ErrorView from '@/components/ErrorView';
import LoadingView from '@/components/LoadingView';

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

function TandoorMealplan({ currentRange }) {
  // const startOfWeek = DateTime.now()
  //   .setLocale('de-DE')
  //   .startOf('week', { useLocaleWeeks: true });
  // const endOfWeek = DateTime.now()
  //   .setLocale('de-DE')
  //   .endOf('week', { useLocaleWeeks: true });
  // const startDateString = startOfWeek.toFormat('yyyy-MM-dd');
  // const endDateString = endOfWeek.toFormat('yyyy-MM-dd');
  const startDateString = currentRange.start;
  const endDateString = currentRange.end;
  const startOfWeek = DateTime.fromFormat(startDateString, 'yyyy-MM-dd')
    .setLocale('de-DE')
    .startOf('week', { useLocaleWeeks: true });

  const url =
    'http://127.0.0.1:3006/api/v1/mealplan/?from_date=' +
    startDateString +
    '&to_date=' +
    endDateString;

  const { data, error, isLoading } = useSWR(url, fetcher, {
    refreshInterval: 1800000,
  });

  if (isLoading) return <LoadingView />;

  if (error) return <ErrorView error={error} />;

  return (
    <div className="grid h-full w-full grid-cols-7">
      <div>
        <MapMealToDay data={data} day={startOfWeek.plus({ days: 0 })} />
      </div>
      <div>
        <MapMealToDay data={data} day={startOfWeek.plus({ days: 1 })} />
      </div>
      <div>
        <MapMealToDay data={data} day={startOfWeek.plus({ days: 2 })} />
      </div>
      <div>
        <MapMealToDay data={data} day={startOfWeek.plus({ days: 3 })} />
      </div>
      <div>
        <MapMealToDay data={data} day={startOfWeek.plus({ days: 4 })} />
      </div>
      <div>
        <MapMealToDay data={data} day={startOfWeek.plus({ days: 5 })} />
      </div>
      <div>
        <MapMealToDay data={data} day={startOfWeek.plus({ days: 6 })} />
      </div>
    </div>
  );
}

export default TandoorMealplan;

function MapMealToDay({ data, day }) {
  for (const item of data.results) {
    if (day.hasSame(DateTime.fromISO(item.from_date), 'day')) {
      if (item.recipe) {
        return (
          <MealItem
            weekday={day.weekdayLong}
            title={item.recipe.name}
            image={item.recipe.image ? item.recipe.image : 'rezeptOhneBild.jpg'}
            recipeid={item.recipe.id}
          />
        );
      }

      if (item.title) {
        return (
          <MealItem
            weekday={day.weekdayLong}
            title={item.title}
            image="rezeptOhneBild.jpg"
          />
        );
      }
    }
  }
  return <MealItem weekday={day.weekdayLong} title="Reste" image="reste.jpg" />;
}

function MealItem({ weekday, image, title, link, recipeid }) {
  return (
    <div className="flex h-full flex-col bg-black p-1">
      <div className="text-center font-bold text-white">{weekday}</div>
      <div className="relative h-full w-full flex-grow rounded-t text-white">
        <Link href={'http://localhost:3000/singlerecipe?id=' + recipeid}>
          <img
            src={image}
            alt="Rezept"
            className="absolute h-full w-full rounded-t object-cover"
          ></img>
        </Link>
      </div>
      <div className="line-clamp-2 h-12 rounded-b bg-gray-900 text-center text-xs font-bold text-white">
        <Link href={'http://localhost:3000/singlerecipe?id=' + recipeid}>
          {title}
        </Link>
      </div>
    </div>
  );
}
