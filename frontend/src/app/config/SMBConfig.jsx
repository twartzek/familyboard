'use client';
import React from 'react';
import { useForm } from 'react-hook-form';
import { FormInputText } from './FormInputText';
import Button from '@mui/material/Button';
import { useEffect } from 'react';
import SendIcon from '@mui/icons-material/Send';
import useSWR from 'swr';

const fetcher = (...args) => fetch(...args).then(res => res.json());

export default function SMBConfig({ serverBaseUrl, configData, onAlert }) {
  const { handleSubmit, control, setValue } = useForm({});

  const { data, error, isLoading } = useSWR(
    'http://localhost:3006/api/v1/localsystemdata',
    fetcher,
  );

  const onSubmit = async formData => {
    // async request which may result error
    try {
      configData.smbserver.ip = formData.smbip;
      configData.smbserver.name = formData.smbname;
      configData.smbserver.user = formData.smbuser;
      configData.smbserver.password = formData.smbpass;
      configData.smbserver.directory = formData.smbdirectory;
      const response = await fetch(serverBaseUrl + '/api/v1/config', {
        method: 'POST',
        body: JSON.stringify(configData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.status === 200) {
        onAlert('SMB Konfiguration erfolgreich gespeichert', 'success');
      }
    } catch (e) {
      // handle your error
      onAlert('SMB Konfiguration nicht gespeichert', 'error');
    }
  };

  useEffect(() => {
    if (configData != null) {
      setValue('smbip', configData.smbserver.ip);
      setValue('smbname', configData.smbserver.name);
      setValue('smbuser', configData.smbserver.user);
      setValue('smbpass', configData.smbserver.password);
      setValue('smbdirectory', configData.smbserver.directory);
    }
  }, [configData]);

  const handleFamSmbClick = () => {
    setValue('smbip', data ? data.ip : '');
    setValue('smbname', 'familyboard');
    setValue('smbuser', 'familyboard');
    setValue('smbpass', 'familyboard');
    setValue('smbdirectory', 'fotos');
  };

  return (
    <div className="grid w-full grid-cols-1">
      <h1 className="p-1 font-bold">SMB Laufwerk für Fotoanzeige</h1>
      <div className="w-full p-1">
        <Button
          variant="outlined"
          onClick={handleFamSmbClick}
          disabled={isLoading || error || data == null}
        >
          Benutze Familyboard SMB
        </Button>
        <FormInputText
          control={control}
          name="smbip"
          label="IP-Adresse*"
          required={'IP-Adresse ist erforderlich'}
          pattern={{
            value: /^((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])(\.(?!$)|$)){4}$/i,
            message: 'IP-Adresse ist ungültig.',
          }}
        />
        <FormInputText control={control} name="smbname" label="Server Name" />
        <FormInputText
          control={control}
          name="smbdirectory"
          required={'Pfad ist erforderlich'}
          label="SMB Ordnerpfad*"
        />
        <FormInputText
          control={control}
          name="smbuser"
          label="Benutzer Name*"
          required={'Benutzer ist erforderlich'}
        />
        <FormInputText
          control={control}
          name="smbpass"
          required={'Passwort ist erforderlich'}
          label="Benutzer Passwort*"
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
