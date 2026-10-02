'use client';

import LoadingView from '@/components/LoadingView';
import ErrorView from '@/components/ErrorView';
import { useScript } from '@uidotdev/usehooks';
// import ScriptMeta from './ScriptMeta';
import { useEffect } from 'react';
import useSWR from 'swr';

export default function WeatherWidget() {
  const url = 'http://localhost:3006/api/v1/config';
  const fetcher = (...args) => fetch(...args).then(res => res.json());

  const { data, error, isLoading } = useSWR(url, fetcher, {});

  // const status = useScript(`https://weatherwidget.io/js/widget.min.js`, {
  //   removeOnUnmount: true,
  // });

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://weatherwidget.io/js/widget.min.js';
    script.id = 'weatherwidget-io-js';
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  });

  if (isLoading) return <LoadingView />;
  if (error) return <ErrorView error={error} />;

  // if (status !== 'ready') {
  //   return <LoadingView />;
  // }

  const aTag = extractATagInfo(data.weather.weatherwidgetio.htmlcode);

  return (
    <div
      className="weather"
      style={{ pointerEvents: 'none' }}
      dangerouslySetInnerHTML={{ __html: aTag }}
    ></div>
  );
}

function extractATagInfo(text) {
  const aTags = text.match(/<a[^>]*>.*?<\/a>/g);

  return aTags[0];
}
