'use client';
import React from 'react';
import { useForm } from 'react-hook-form';
import { FormInputText } from './FormInputText';
import Button from '@mui/material/Button';
import { useEffect } from 'react';
import SendIcon from '@mui/icons-material/Send';
import Link from '@mui/material/Link';
import licenses from './npm-licenses.json';

export default function WindyConfig({ serverBaseUrl, configData, onAlert }) {
  const { handleSubmit, control, setValue } = useForm({});

  const onSubmit = async formData => {
    // async request which may result error
    try {
      //   configData.weather.windy.htmlcode = formData.htmlcode;

      const response = await fetch(serverBaseUrl + '/api/v1/config', {
        method: 'POST',
        body: JSON.stringify(configData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.status === 200) {
        onAlert('Info erfolgreich abgesendet', 'success');
      }
    } catch (e) {
      // handle your error
      onAlert('Fehler beim Versenden', 'error');
    }
  };

  useEffect(() => {
    if (configData != null) {
      //   setValue('htmlcode', configData.weather.windy.htmlcode);
    }
  }, [configData]);

  return (
    <div className="grid w-full grid-cols-1 p-2">
      <h1 className="font-bold">Allgemeine Informationen</h1>
      <div className="w-full">
        <p> Version: 0.0.1 </p>
        <p> Autor: Tobias Wartzek </p>
        <div className="h-4"></div>
        <h1 className="font-bold">Benutzte Open Source Lizenzen</h1>

        {licenses.map((license, index) => (
          <License
            key={index}
            tool={license.name}
            link={license.link}
            license={license.licenseType}
          />
        ))}
      </div>
    </div>
  );
}

function License({ tool, link, license }) {
  return (
    <li>
      <span className="font-bold">
        <Link href={link.replace('git+', '')}>{tool}</Link>
      </span>
      : {license}
    </li>
  );
}
