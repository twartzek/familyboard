'use client';

import React, { useState, useEffect } from 'react';

const BigFrontImage = () => {
  const [randNumb, setRandNumb] = useState(0);
  useEffect(() => {
    const intervalId = setInterval(() => {
      setRandNumb(Math.floor(Math.random() * 100));
    }, 60000);

    return () => clearInterval(intervalId); // Cleanup bei Komponentenunmount
  }, []);

  return (
    <div key={randNumb} className="relative h-full w-full">
      <img
        src={'http://localhost:3006/api/v1/randimage?id=' + randNumb}
        className="absolute z-10 h-full w-full animate-fade object-scale-down"
        alt="Fehler, die Fotoquelle scheint nicht richtig konfiguriert zu sein"
        onError={event => (event.target.src = 'placeholder.png')}
      />
      <img
        src={'http://localhost:3006/api/v1/randimage?id=' + randNumb}
        className="absolute z-0 h-full w-full animate-fade object-fill blur-md filter"
        alt="Fehler, die Fotoquelle scheint nicht richtig konfiguriert zu sein"
        onError={event => (event.target.src = 'placeholder.png')}
      />
    </div>
  );
};

export default BigFrontImage;
