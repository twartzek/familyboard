'use client';
import React from 'react';
import { useForm } from 'react-hook-form';
import { FormInputText } from './FormInputText';
import Button from '@mui/material/Button';
import { useEffect } from 'react';
import SendIcon from '@mui/icons-material/Send';
import Link from '@mui/material/Link';

export default function WeatherWidgetIoConfig({
  serverBaseUrl,
  configData,
  onAlert,
}) {
  const { handleSubmit, control, setValue } = useForm({});

  const onSubmit = async formData => {
    // async request which may result error
    try {
      configData.weather.weatherwidgetio.htmlcode = formData.htmlcode;

      const response = await fetch(serverBaseUrl + '/api/v1/config', {
        method: 'POST',
        body: JSON.stringify(configData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.status === 200) {
        onAlert(
          'WeatherWidgetIo Konfiguration erfolgreich gespeichert',
          'success',
        );
      }
    } catch (e) {
      // handle your error
      onAlert('WeatherWidgetIo Konfiguration nicht gespeichert', 'error');
    }
  };

  useEffect(() => {
    if (configData != null) {
      setValue('htmlcode', configData.weather.weatherwidgetio.htmlcode);
    }
  }, [configData]);

  return (
    <div className="grid w-full grid-cols-1">
      <h1 className="p-1 font-bold">WeatherWidgetIO Copy&Paste</h1>
      <div className="w-full p-1">
        Geh auf die Webseite{' '}
        <Link href="https://weatherwidget.io" target="_blank" rel="noopener">
          weatherwidget.io{' '}
        </Link>{' '}
        und wähle die Stadt. Konfiguiere die Wetteranzeige wie du es möchtest.
        Dann kopiere den HTML-Code über das Clipboard einfach in das folgende
        Textfeld.
        <FormInputText
          control={control}
          name="htmlcode"
          label="HTML Code*"
          required={'HTML Code ist erforderlich'}
          multiline={true}
          rows={15}
          pattern={{
            value: /^<a class="weatherwidget-io.+script>$/is,
            message: 'HTML Code ist nicht korrekt kopiert.',
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
