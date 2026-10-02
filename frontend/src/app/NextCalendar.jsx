'use client';

import { useNextCalendarApp, ScheduleXCalendar } from '@schedule-x/react';
import {
  createViewDay,
  createViewMonthAgenda,
  createViewMonthGrid,
  createViewWeek,
  viewWeek,
} from '@schedule-x/calendar';
import { createEventsServicePlugin } from '@schedule-x/events-service';
import { createEventModalPlugin } from '@schedule-x/event-modal';
import { createCalendarControlsPlugin } from '@schedule-x/calendar-controls';
import { createCurrentTimePlugin } from '@schedule-x/current-time';
import useSWR from 'swr';
import '@schedule-x/theme-default/dist/index.css';
import { useRouter } from 'next/navigation';
import { bgevents } from '@/components/backgroundevents';

const schedule = require('node-schedule');

function Calendar({ onCalRangeUpdate }) {
  const router = useRouter();

  const job = schedule.scheduleJob('* 5 0 * * *', function () {
    router.refresh();
  });

  const plugins = [
    createEventsServicePlugin(),
    createEventModalPlugin(),
    createCalendarControlsPlugin(),
    createCurrentTimePlugin(),
  ];

  // Fetch Events
  const urlEvents = 'http://localhost:3006/api/v1/events';
  const fetcherEvents = (url, hash) =>
    fetch(url, { headers: { Hashvalue: hash } }).then(res => res.json());

  const { data, error, isLoading } = useSWR(
    urlEvents,
    url => fetcherEvents(url),
    {
      refreshInterval: 30000,
    },
  );

  // Fetch calendar config
  const urlCalendars = 'http://localhost:3006/api/v1/calendars';
  const fetcher = (...args) => fetch(...args).then(res => res.json());

  const { data: calendars } = useSWR(urlCalendars, fetcher, {
    refreshInterval: 30000,
  });

  // Build Calendar
  const calendar = useNextCalendarApp(
    {
      defaultView: viewWeek.name,
      backgroundEvents: bgevents,
      dayBoundaries: {
        start: '06:00',
        end: '23:00',
      },
      locale: 'de-DE',
      isDark: true,
      calendars: calendars,
      weekOptions: {
        gridHeight: 655,
      },
      isResponsive: false,
      views: [
        createViewDay(),
        createViewWeek(),
        createViewMonthGrid(),
        createViewMonthAgenda(),
      ],
      callbacks: {
        onRangeUpdate(range) {
          onCalRangeUpdate({
            start: range.start.substring(0, 10),
            end: range.end.substring(0, 10),
          });
        },
      },
    },
    plugins,
  );

  if (isLoading)
    return (
      <div>
        <ScheduleXCalendar calendarApp={calendar} />
      </div>
    );
  if (error)
    return (
      <div>
        <ScheduleXCalendar calendarApp={calendar} />
      </div>
    );

  if (data) {
    if (calendar) {
      calendar.eventsService.set(data);
    }
  }

  if (calendars) {
    if (calendar) {
      calendar.calendarControls.setCalendars(calendars);
    }
  }

  return (
    <div>
      <ScheduleXCalendar calendarApp={calendar} />
    </div>
  );
}

export default Calendar;
