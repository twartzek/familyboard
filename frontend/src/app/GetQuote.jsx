'use client';

import { useEffect, useState } from 'react';
import quotes from './quotes.json';
import Rand from 'rand-seed';

function GetRandomQuote() {
  const d = new Date();
  const rand = new Rand(d.toDateString());

  const [quoteId, setQuoteId] = useState(
    Math.floor(rand.next() * quotes.length),
  ); // One quote per day

  // useEffect(() => {
  //   const intervalId = setInterval(() => {
  //     // setQuoteId(Math.floor(Math.random() * quotes.length));
  //     setQuoteId(Math.floor(rand.next() * quotes.length));
  //   }, 21600000);

  //   return () => clearInterval(intervalId); // Cleanup bei Komponentenunmount
  // }, [quoteId]);

  if (quotes[quoteId].Zitat.length > 100) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center"
        key={quoteId}
      >
        <div
          className="text-center text-4xl text-white"
          style={{ fontFamily: 'var(--font-fredericka)' }}
        >
          &quot;{quotes[quoteId].Zitat}&quot;
          <br />
        </div>
        <div className="text-center text-xl text-white">
          <br /> {quotes[quoteId].Autor}
        </div>
      </div>
    );
  } else {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center"
        key={quoteId}
      >
        <div
          className="text-center text-6xl text-white"
          style={{ fontFamily: 'var(--font-fredericka)' }}
        >
          &quot;{quotes[quoteId].Zitat}&quot;
          <br />
        </div>
        <div className="text-center text-2xl text-white">
          <br /> {quotes[quoteId].Autor}
        </div>
      </div>
    );
  }
}

export default GetRandomQuote;
// "font-famly: var(--homemade-apple);"
