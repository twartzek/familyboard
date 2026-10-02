'use client';

import NavigationButtons from '@/components/NavigationButtons';
import useSWR from 'swr';
import LoadingView from '@/components/LoadingView';
import ErrorView from '@/components/ErrorView';

export default function Bring() {
  return (
    <div className="flex min-h-screen flex-col justify-between divide-y divide-solid divide-slate-300 border border-solid border-slate-300 bg-black font-[family-name:var(--font-geist-sans)]">
      {/* <header className="h-10 bg-red-500">Header</header> */}
      <main className="h-[97vh] flex-grow">
        <iframe
          width="100%"
          height="100%"
          src="https://web.getbring.com"
        ></iframe>
      </main>
      <footer className="flex h-[3vh] items-center justify-center bg-black">
        <NavigationButtons />
      </footer>
    </div>
  );
}
