'use client';
import React from 'react';
import { useForm } from 'react-hook-form';
import { FormInputText } from './FormInputText';
import Button from '@mui/material/Button';
import { useEffect } from 'react';
import SendIcon from '@mui/icons-material/Send';
import Link from '@mui/material/Link';

export default function WindyConfig({ serverBaseUrl, configData, onAlert }) {
  const { handleSubmit, control, setValue } = useForm({});

  const onSubmit = async formData => {
    // async request which may result error
    try {
      configData.weather.windy.htmlcode = formData.htmlcode;

      const response = await fetch(serverBaseUrl + '/api/v1/config', {
        method: 'POST',
        body: JSON.stringify(configData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.status === 200) {
        onAlert('Windy Konfiguration erfolgreich gespeichert', 'success');
      }
    } catch (e) {
      // handle your error
      onAlert('Windy Konfiguration nicht gespeichert', 'error');
    }
  };

  useEffect(() => {
    if (configData != null) {
      setValue('htmlcode', configData.weather.windy.htmlcode);
    }
  }, [configData]);

  return (
    <div className="grid w-full grid-cols-1">
      <h1 className="p-1 font-bold">Regenradar Windy Copy&Paste</h1>
      <div className="w-full p-1">
        Geh auf die Webseite{' '}
        <Link
          href="https://embed.windy.com/config/map"
          target="_blank"
          rel="noopener"
        >
          embed.windy.com
        </Link>{' '}
        und wähle den Kartenausschnitt wie du es möchtest. Dann kopiere den
        HTML-Code über das Clipboard einfach in das folgende Textfeld.
        <FormInputText
          control={control}
          name="htmlcode"
          label="HTML Code*"
          required={'HTML Code ist erforderlich'}
          multiline={true}
          rows={10}
          pattern={{
            value: /^<iframe.+embed.windy.com.+iframe>$/gim,
            message:
              'Der HTML Code ist nicht richtig kopiert. Er sollte mit iframe beginnen und mit iframe enden.',
          }}
        />
        <Button
          onClick={handleSubmit(onSubmit)}
          variant={'contained'}
          endIcon={<SendIcon />}
        >
          Speichern
        </Button>
      </div>
    </div>
  );
}
