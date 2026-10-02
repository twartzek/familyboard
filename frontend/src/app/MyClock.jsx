//  from https://blog.aiherrera.com/crafting-time-building-an-analog-clock-with-react-and-tailwind-css

'use client';

import React, { useState, useEffect } from 'react';
import useClock from './use-clock';

const MyClock = () => {
  const [timing] = useClock();
  const [uhrzeit, setUhrzeit] = useState(
    new Date().toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setUhrzeit(
        new Date().toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    }, 60000); // 1 Minute
    return () => clearInterval(intervalId);
  }, []);

  const clockNumbers = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="grid-rows-1 place-content-evenly">
      <div className="flex w-full cursor-pointer flex-wrap justify-center gap-x-40 gap-y-0">
        <div className="group relative flex cursor-pointer text-sm">
          <div
            className={`relative flex h-56 w-56 items-center justify-center rounded-full border border-white bg-black text-white`}
          >
            {clockNumbers.map(num => (
              <label
                key={num}
                className={`absolute inset-1 text-center text-xl`}
                style={{ transform: `rotate(calc(${num}*(360deg/12)))` }}
              >
                <span
                  className={`inline-block`}
                  style={{ transform: `rotate(calc(${num}*(-360deg/12)))` }}
                >
                  {num}
                </span>
              </label>
            ))}

            <section className="absolute z-50 flex h-4 w-4 justify-center">
              {/* Clock center */}
              <span
                className={`absolute -bottom-[3px] z-50 flex h-4 w-4 rounded-full bg-white before:absolute before:left-0.5 before:top-0.5 before:h-3 before:w-3 before:justify-center before:rounded-full before:bg-white`}
              ></span>
              {/* Minute hand */}
              <span
                className={`absolute bottom-1.5 z-20 h-[7em] w-1 origin-bottom rounded-md bg-white`}
                style={timing.updateMinutes}
              ></span>
              {/* Hour hand */}
              <span
                className={`absolute bottom-1.5 z-10 h-[5.5em] w-1.5 origin-bottom divide-white rounded-md bg-red-400`}
                style={timing.updateHours}
              ></span>
            </section>
          </div>
        </div>
      </div>

      <div className="h-full text-center text-7xl text-white">{uhrzeit}</div>
    </div>
  );
};

export default MyClock;

// import React, { useState, useEffect } from "react";

// const MyClock = () => {
//   const [uhrzeit, setUhrzeit] = useState(new Date());
//   const [stundenWinkel, setStundenWinkel] = useState(0);
//   const [minutenWinkel, setMinutenWinkel] = useState(0);

//   useEffect(() => {
//     const intervalId = setInterval(() => {
//       const jetzt = new Date();
//       setUhrzeit(jetzt);
//       setStundenWinkel(
//         ((jetzt.getHours() % 12) + jetzt.getMinutes() / 60) * 30
//       );
//       setMinutenWinkel(jetzt.getMinutes() * 6);
//     }, 1000);
//     return () => clearInterval(intervalId);
//   }, []);

//   return (
//     <div className="w-48 h-48 rounded-full border border-gray-300 flex justify-center items-center relative">
//       <div
//         className="absolute w-1 h-24 bg-gray-600"
//         style={{ transform: `rotate(${stundenWinkel}deg)` }}
//       />
//       <div
//         className="absolute w-1 h-32 bg-gray-600"
//         style={{ transform: `rotate(${minutenWinkel}deg)` }}
//       />
//       <div className="w-4 h-4 rounded-full bg-gray-600 absolute" />
//     </div>
//   );
// };

// export default MyClock;
