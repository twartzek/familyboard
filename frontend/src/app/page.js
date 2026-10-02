'use client';
import WeatherWidget from './WeatherWidget';
import GetRandomQuote from './GetQuote';
import MyClock from './MyClock';
import TandoorMealplan from './TandoorMealplan';
import BigFrontImage from './BigFrontImage';
import NavigationButtons from '@/components/NavigationButtons';
import { useState } from 'react';
import { DateTime } from 'luxon';
import Calendar from './NextCalendar';
import useSWR from 'swr';
import { useEffect } from 'react';
import { io } from 'socket.io-client';

const fetcher = (...args) => fetch(...args).then(res => res.json());

export default function Home() {
  const rangeStart = {
    start: DateTime.now().startOf('week').toFormat('yyyy-MM-dd'),
    end: DateTime.now().endOf('week').toFormat('yyyy-MM-dd'),
  };

  const [currentCalendarRange, setCurrentCalendarRange] = useState(rangeStart);
  const socket = io('http://localhost:3009');

  function handleCalendarRangeUpdate(range) {
    setCurrentCalendarRange(range);
  }

  const url = 'http://localhost:3006/api/v1/config';
  const { data, error, isLoading } = useSWR(url, fetcher, {});

  useEffect(() => {
    socket.on('mypage', msg => {
      window.open(msg, '_self');
    });

    return () => {
      socket.off('mypage');
    };
  }, [socket]);

  return (
    <div className="divide flex min-h-screen flex-col justify-between divide-y divide-solid divide-slate-300 border border-solid border-slate-300 bg-black font-[family-name:var(--font-geist-sans)]">
      {/* <header className="h-10 bg-red-500">Header</header> */}
      <main className="flex-grow bg-black">
        <div className="flex-col divide-y divide-solid divide-slate-300">
          <div className="z-20 h-[43vh] bg-black">
            <Calendar onCalRangeUpdate={handleCalendarRangeUpdate} />
          </div>
          <div className="flex h-[28vh] flex-row divide-x divide-slate-300">
            <div className="h-full w-1/3 bg-black">
              <div className="flex h-full flex-col divide-y divide-solid divide-slate-300 bg-black">
                <div className="flex-1 place-content-evenly bg-black">
                  <MyClock />
                </div>
                <div className="h-50 relative bg-black">
                  <WeatherWidget />
                </div>
              </div>
            </div>
            <div className="relative z-0 h-full w-2/3 overflow-hidden bg-black">
              <BigFrontImage />
            </div>
          </div>
          {data ? (
            data.tandoor.active ? (
              <div className="divide-y divide-solid divide-slate-300">
                <div className="z-20 flex h-[10vh] bg-black">
                  <TandoorMealplan currentRange={currentCalendarRange} />
                </div>
                <div className="flex h-[15vh] items-center bg-black">
                  <GetRandomQuote />
                </div>
              </div>
            ) : (
              // tandoor not active
              <div className="flex h-[25vh] items-center bg-black">
                <GetRandomQuote />
              </div>
            )
          ) : (
            // data not yet available
            <div>
              <div className="z-20 flex h-[10vh] bg-black">
                <TandoorMealplan currentRange={currentCalendarRange} />
              </div>
              <div className="flex h-[15vh] items-center bg-black">
                <GetRandomQuote />
              </div>
            </div>
          )}
        </div>
      </main>
      <footer className="flex h-[3vh] items-center justify-center bg-black">
        <NavigationButtons />
      </footer>
    </div>
  );
}
