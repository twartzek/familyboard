'use client';
import React from 'react';
import { useForm } from 'react-hook-form';
import { FormInputText } from './FormInputText';
import Button from '@mui/material/Button';
import { useEffect } from 'react';
import SendIcon from '@mui/icons-material/Send';
import { FormInputCheckBox } from './FormInputCheckBox';
import { Link } from '@mui/material';
import { useState } from 'react';

export default function TandoorConfig({ serverBaseUrl, configData, onAlert }) {
  const { handleSubmit, control, setValue, watch } = useForm({});
  const [showHelp, setShowHelp] = useState(false);

  const onSubmit = async formData => {
    // async request which may result error
    try {
      configData.tandoor.bearertoken = formData.bearer;
      configData.tandoor.ip = formData.tandoorip;
      configData.tandoor.port = formData.tandoorport;
      configData.tandoor.active = formData.tandoorisactive;
      const response = await fetch(serverBaseUrl + '/api/v1/config', {
        method: 'POST',
        body: JSON.stringify(configData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.status === 200) {
        onAlert('Tandoor Konfiguration erfolgreich gespeichert', 'success');
      }
      // if (response.status >= 500) {
      //   onAlert('Server Fehler', 'error');
      // }
    } catch (e) {
      // handle your error
      onAlert('Tandoor Konfiguration nicht gespeichert', 'error');
    }
  };

  const tandorIsActive = watch('tandoorisactive');

  useEffect(() => {
    if (configData != null) {
      setValue('tandoorip', configData.tandoor.ip);
      setValue('tandoorport', configData.tandoor.port);
      setValue('bearer', configData.tandoor.bearertoken);
      setValue('tandoorisactive', configData.tandoor.active);
    }
  }, [configData]);

  return (
    <div className="grid w-full grid-cols-1">
      <h1 className="p-1 font-bold">Tandoor Zugangsdaten</h1>

      <div className="w-full p-1">
        <FormInputCheckBox
          control={control}
          name="tandoorisactive"
          label="Tandoor nutzen?"
        />

        <FormInputText
          control={control}
          disabled={!tandorIsActive}
          name="tandoorip"
          label="IP-Adresse*"
          required={'IP-Adresse ist erforderlich'}
          pattern={{
            value: /^((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])(\.(?!$)|$)){4}$/i,
            message: 'IP-Adresse ist ungültig.',
          }}
        />
        <FormInputText
          control={control}
          disabled={!tandorIsActive}
          name="tandoorport"
          label="Port*"
          required={'Port ist erforderlich'}
          pattern={{
            value: /^\d{4}$/i,
            message: 'Port ist ungültig.',
          }}
        />
        <FormInputText
          control={control}
          disabled={!tandorIsActive}
          name="bearer"
          label="Bearer Token*"
          required={'Token mit Leserechten ist erforderlich'}
          pattern={{
            value: /^tda_.+$/i,
            message: 'Der token sollte mit "tda_" anfangen.',
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
      <div className="h-4"></div>
      <Button
        className="rounded bg-blue-500 px-4 py-8 font-bold text-white hover:bg-blue-700"
        onClick={() => setShowHelp(!showHelp)}
      >
        {showHelp ? 'Hilfe verstecken' : 'Hilfe anzeigen'}
      </Button>
      {showHelp && (
        <div>
          <TandoorHelp />
        </div>
      )}
    </div>
  );
}

function TandoorHelp() {
  return (
    <div className="p-4">
      <p className="mb-4 text-lg font-bold text-gray-100">
        Tandoor Digitale Rezepte
      </p>
      <Link href="https://tandoor.dev">Tandoor</Link> ist ein sehr gutes Tool um
      Rezepte unabhängig von einem Online Service bei sich zentral digital zu
      organisieren. Rezepte können von fast überall importiert werden. Es kann
      selber auf einem eigenen Server, Synology NAS oder ähnlichem gehostet
      werden. Es ist eine Demo verfügbar, allerdings ist die Reaktionszeit sehr
      langsam. Auf{' '}
      <Link href="https://github.com/TandoorRecipes/recipes">Github</Link>{' '}
      kannst du dir Installationshinweise anschauen.
      <br />
      <br />
      Zur Rezepteingabe empfehle ich über den Browser vom Computer oder über die
      App kitshn im {''}
      <Link href="https://play.google.com/store/apps/details?id=de.kitshn.android&hl=de&pli=1">
        Google Store
      </Link>{' '}
      {''}
      oder der App im {''}
      <Link href="https://apps.apple.com/us/app/kitshn-for-tandoor/id6740168361">
        Apple Store
      </Link>
      .
    </div>
  );
}
