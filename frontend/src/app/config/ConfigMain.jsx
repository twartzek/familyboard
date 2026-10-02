'use client';
import React, { use, useState } from 'react';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useSWR from 'swr';

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import LoadingView from '@/components/LoadingView';
import ErrorView from '@/components/ErrorView';
import SMBConfig from './SMBConfig';
import HassConfig from './HassConfig';
import TandoorConfig from './TandoorConfig';
import CalendarConfig from './CalendarConfig';
import { useEffect } from 'react';
import WeatherWidgetIoConfig from './Weatherwidgetio';
import WindyConfig from './Windy';
import Info from './Info';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

let hostname = 'localhost';

const fetcher = (...args) => fetch(...args).then(res => res.json());

export default function ConfigurationMain({ component }) {
  useEffect(() => {
    hostname = window.location.hostname;
  }, []);

  // Snackbar Alert Handling for storing
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    serverity: 'info',
  });

  const handleAlert = (message, severity) => {
    setAlert({
      open: true,
      message: message,
      severity: severity,
    });
  };

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }

    setAlert({
      open: false,
      message: '',
    });
  };

  // Logic for datafetching
  const serverBaseUrl = 'http://' + hostname + ':3006';

  const url = serverBaseUrl + '/api/v1/config';
  const { data, error, isLoading } = useSWR(url, fetcher, {});

  if (isLoading) <LoadingView />;
  if (error) return <ErrorView error={error} />;

  return (
    <div className="divide flex min-h-screen flex-col justify-between divide-y divide-solid divide-slate-300 border border-solid border-slate-300 bg-black font-[family-name:var(--font-geist-sans)]">
      {/* <header className="h-10 bg-black text-center text-2xl text-white">
        Konfiguration
      </header> */}
      <main className="w-full flex-grow overscroll-y-auto bg-black">
        <ThemeProvider theme={darkTheme}>
          <CssBaseline />
          <div className="grid w-full grid-cols-1 gap-4">
            {component === 'Fotos' ? (
              <SMBConfig
                serverBaseUrl={serverBaseUrl}
                configData={data}
                onAlert={handleAlert}
              />
            ) : null}

            {component === 'Tandoor' ? (
              <TandoorConfig
                serverBaseUrl={serverBaseUrl}
                configData={data}
                onAlert={handleAlert}
              />
            ) : null}

            {component === 'Home Assistant' ? (
              <HassConfig
                serverBaseUrl={serverBaseUrl}
                configData={data}
                onAlert={handleAlert}
              />
            ) : null}

            {component === 'Kalendar' ? (
              <CalendarConfig
                serverBaseUrl={serverBaseUrl}
                configData={data}
                onAlert={handleAlert}
              />
            ) : null}

            {component === 'Wetter' ? (
              <WeatherWidgetIoConfig
                serverBaseUrl={serverBaseUrl}
                configData={data}
                onAlert={handleAlert}
              />
            ) : null}

            {component === 'Regenradar' ? (
              <WindyConfig
                serverBaseUrl={serverBaseUrl}
                configData={data}
                onAlert={handleAlert}
              />
            ) : null}

            {component === 'Info' ? (
              <Info
                serverBaseUrl={serverBaseUrl}
                configData={data}
                onAlert={handleAlert}
              />
            ) : null}

            {component ? null : (
              <div className="m-4 text-center text-white">
                Herzlich willkommen in der Konfiguration
              </div>
            )}
          </div>
        </ThemeProvider>

        <Snackbar
          open={alert.open}
          autoHideDuration={3000}
          onClose={handleClose}
        >
          <Alert
            onClose={handleClose}
            severity={alert.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {alert.message}
          </Alert>
        </Snackbar>
      </main>
      {/* <footer className="flex h-[3vh] items-center justify-center bg-black">
        <NavigationButtons />
      </footer> */}
    </div>
  );
}
