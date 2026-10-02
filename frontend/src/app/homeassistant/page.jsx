'use client';

import NavigationButtons from '@/components/NavigationButtons';
import useSWR from 'swr';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

const fetcher = (...args) => fetch(...args).then(res => res.json());

export default function Homeassistant() {
  const url = 'http://localhost:3006/api/v1/homeassistantconfig';
  const { data, error, isLoading } = useSWR(url, fetcher, {});

  if (isLoading)
    return (
      <div className="grid h-full w-full place-items-center justify-center text-white">
        <div>
          <Box sx={{ display: 'flex' }}>
            <CircularProgress />
          </Box>
          Loading...
        </div>
      </div>
    );
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="divide flex min-h-screen flex-col justify-between divide-y divide-solid divide-slate-300 border border-solid border-slate-300 bg-black font-[family-name:var(--font-geist-sans)]">
      {/* <header className="h-10 bg-red-500">Header</header> */}
      <main className="h-[97vh] flex-grow bg-black">
        <iframe src={data.url} width="100%" height="100%"></iframe>
      </main>
      <footer className="flex h-[3vh] items-center justify-center bg-black">
        <NavigationButtons />
      </footer>
    </div>
  );
}
