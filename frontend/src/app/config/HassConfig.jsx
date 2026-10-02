'use client';
import React from 'react';
import { useForm } from 'react-hook-form';
import { FormInputText } from './FormInputText';
import Button from '@mui/material/Button';
import { useEffect } from 'react';
import SendIcon from '@mui/icons-material/Send';
import { FormInputCheckBox } from './FormInputCheckBox';
import { useState } from 'react';
import { Link } from '@mui/material';

export default function HassConfig({ serverBaseUrl, configData, onAlert }) {
  const { handleSubmit, control, setValue, watch } = useForm({});
  const [showHelp, setShowHelp] = useState(false);

  const onSubmit = async formData => {
    // async request which may result error
    try {
      configData.homeassistant.ip = formData.hassip;
      configData.homeassistant.port = formData.hassport;
      configData.homeassistant.active = formData.hassisactive;
      const response = await fetch(serverBaseUrl + '/api/v1/config', {
        method: 'POST',
        body: JSON.stringify(configData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        onAlert(
          'Home Assistant Konfiguration erfolgreich gespeichert',
          'success',
        );
      }
    } catch (e) {
      // handle your error
      onAlert('Home Assistant Konfiguration nicht gespeichert', 'error');
    }
  };

  const hassIsActive = watch('hassisactive');

  useEffect(() => {
    if (configData != null) {
      setValue('hassip', configData.homeassistant.ip);
      setValue('hassport', configData.homeassistant.port);
      setValue('hassisactive', configData.homeassistant.active);
    }
  }, [configData]);

  return (
    <div className="grid w-full grid-cols-1">
      <h1 className="p-1 font-bold">Home Assistant Server</h1>
      <div className="w-full p-1">
        <FormInputCheckBox
          control={control}
          name="hassisactive"
          label="Home Assistant nutzen?"
        />
        <FormInputText
          control={control}
          disabled={!hassIsActive}
          name="hassip"
          label="IP-Adresse*"
          required={'IP-Adresse ist erforderlich'}
          pattern={{
            value: /^((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])(\.(?!$)|$)){4}$/i,
            message: 'IP-Adresse ist ungültig.',
          }}
        />
        <FormInputText
          control={control}
          disabled={!hassIsActive}
          name="hassport"
          label="Port*"
          required={'Port ist erforderlich'}
          pattern={{
            value: /^\d{4}$/i,
            message: 'Port ist ungültig.',
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
          {' '}
          <HassHelp />{' '}
        </div>
      )}
    </div>
  );
}

function HassHelp() {
  return (
    <div className="p-4">
      <p className="mb-4 text-lg font-bold text-gray-100">
        Home Assistant einbinden
      </p>
      Ihr könnt in wenigen Schritten Home Assistant einbinden und habt dadurch
      nicht nur einen Kalendar mit sehr hohem{' '}
      <Link href="https://de.wikipedia.org/wiki/Woman_acceptance_factor">
        WAF
      </Link>{' '}
      ;-) sondern auch alle eure erstellten Dashboards direkt zur Verfügung. Ich
      empfehle dabei einen Kioskmode ohne die Nutzung von Anmeldedaten, da es ja
      zu Hause in eurer "sicheren" Umgebung ist. Folgend daher die Schritte.
      <div className="rounded p-4 shadow-md">
        <ol className="mb-4 list-decimal pl-4">
          <li className="mb-2 text-gray-100">
            Füge den user "familyboard" in Home Assistant hinzu.
          </li>

          <li className="mb-2 text-gray-100">
            Installiere in Home Assistant die Erweiterung{' '}
            <Link href="https://github.com/thomasloven/hass-browser_mod">
              Browser Mod
            </Link>
          </li>
          <li className="mb-2 text-gray-100">
            Konfigure in der Erweiterung "Browser Mod", welches Home Assistant
            Dashboard im Familyboard als default dashboard angezeigt werden soll
            (für den user "familyboard"). Ebenso sollte für diesen user keine
            sidebar sichtbar sein.
          </li>
          <li className="mb-2 text-gray-100">
            Fügt in eurem anzuzeigenden Dashboard ganz oben den kiosk mode
            hinzu. Ihr kommt dort über den "Raw-Konfigurationseditor" im
            entsprechenden Dashboard oben rechts unter "Dashboard bearbeiten"
            und dann die drei Punkte hin.
            <img src="hassKiosk.png"></img>
          </li>
          <li className="mb-2 text-gray-100">
            In der "configuration.yaml" Datei fügt ihr folgende Konfiguration
            hinzu. Ihr solltet dafür sorgen, das das familyboard immer die selbe
            IP bekommt.
            <img src="hassBypass.png"></img>
            Bei trusted user müsst ihr die ID eingeben, nicht den user Namen.
            <img src="hassUserId.png"></img>
          </li>
        </ol>
      </div>
    </div>
  );
}
