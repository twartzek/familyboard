'use client';

import NavigationButtons from '@/components/NavigationButtons';
import useSWR from 'swr';
import LoadingView from '@/components/LoadingView';
import ErrorView from '@/components/ErrorView';
import { FormInputText } from '../config/FormInputText';
import { useForm } from 'react-hook-form';
import Button from '@mui/material/Button';
import SendIcon from '@mui/icons-material/Send';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});
export default function CustomPage() {
  const { handleSubmit, control } = useForm({});
  // IP/Hostname des Familyboard-Servers, damit das Handy den Socket-Server erreicht
  // (window.location.hostname funktioniert hier nicht, da diese Seite vom Handy aus
  // aufgerufen wird, nicht vom Familyboard selbst).
  const hostname =
    process.env.NEXT_PUBLIC_FAMILYBOARD_HOST ??
    (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
  const socket = io('http://' + hostname + ':3009');

  const onSubmit = async formData => {
    if (socket) {
      socket.emit(
        'mypage',
        formData.webseite.match(/^https?:\/\//)
          ? formData.webseite
          : 'http://' + formData.webseite,
      );
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between divide-y divide-solid divide-slate-300 border border-solid border-slate-300 bg-black font-[family-name:var(--font-geist-sans)]">
      {/* <header className="h-10 bg-red-500">Header</header> */}
      <main className="h-[97vh] flex-grow">
        <ThemeProvider theme={darkTheme}>
          <CssBaseline />
          <div className="m-10 flex h-full flex-col items-center justify-center">
            Öffne Webseite auf dem Familyboard {hostname}
            <FormInputText
              control={control}
              name="webseite"
              label="Webseite*"
              required={'Webseite ist erforderlich'}
              pattern={{
                value:
                  /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi,
                message: 'Web Adresse ist ungültig.',
              }}
            />
            <Button
              onClick={handleSubmit(onSubmit)}
              variant={'contained'}
              endIcon={<SendIcon />}
            >
              Los
            </Button>
          </div>
        </ThemeProvider>
      </main>
    </div>
  );
}
