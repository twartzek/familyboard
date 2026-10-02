'use client';
import React from 'react';
import { useForm } from 'react-hook-form';
import { FormInputText } from './FormInputText';
import Button from '@mui/material/Button';
import { useEffect } from 'react';
import { PopoverPicker } from './PopoverPicker';
import { useState } from 'react';
import SendIcon from '@mui/icons-material/Send';
import PropTypes from 'prop-types';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import CustomTabPanel from '@/components/CustomTabPanel';

CustomTabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export default function CalendarConfig({ serverBaseUrl, configData, onAlert }) {
  const { handleSubmit, control, setValue } = useForm({});
  const [showHelp, setShowHelp] = useState(false);

  const [calColors, setCalColors] = useState([
    '#27283d',
    '#94453f',
    '#636152',
    '#c9b475',
    '#552f3e',
    '#9a6a66',
  ]);

  const [valueTab, setValueTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setValueTab(newValue);
  };

  useEffect(() => {
    let colors = [];
    if (configData != null) {
      for (let i = 0; i < configData.calendarsources.length; i++) {
        setValue('url' + i, configData.calendarsources[i].url);
        setValue('calname' + i, configData.calendarsources[i].name);
        colors.push(configData.calendarsources[i].darkcolorcontainer);
      }
      setCalColors(colors);
    }
  }, [configData]);

  function handleColorChange(color, index) {
    let colors = [...calColors];
    colors[index] = color;
    setCalColors(colors);
  }

  const onSubmit = async formData => {
    // async request which may result error
    try {
      for (let i = 0; i < configData.calendarsources.length; i++) {
        let factor = getContrastYIQ(calColors[i]);
        configData.calendarsources[i].name =
          formData['calname' + i].trim() == ''
            ? 'Kalendar ' + (i + 1)
            : formData['calname' + i].trim();
        configData.calendarsources[i].url = formData['url' + i].trim();
        configData.calendarsources[i].darkcolorcontainer = calColors[i];
        configData.calendarsources[i].darkcolormain = pSBC(
          -0.8 * factor,
          calColors[i],
        );
        configData.calendarsources[i].darkcoloroncontainer = pSBC(
          0.8 * factor,
          calColors[i],
        );
      }

      const response = await fetch(serverBaseUrl + '/api/v1/config', {
        method: 'POST',
        body: JSON.stringify(configData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.status === 200) {
        onAlert('Kalendar Konfiguration erfolgreich gespeichert', 'success');
      }
    } catch (e) {
      // handle your error
      onAlert('Kalendar Konfiguration nicht gespeichert', 'error');
    }
  };

  return (
    <div className="grid w-full grid-cols-1">
      <h1 className="p-1 font-bold">Kalendar Konfiguration</h1>
      <h6 className="p-1">(bis zu 6 möglich)</h6>
      <div className="w-full p-1">
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={valueTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons
              allowScrollButtonsMobile
            >
              {calColors && calColors.length > 0
                ? calColors.map((calColor, index) => (
                    <Tab key={index} label={index + 1} {...a11yProps(index)} />
                  ))
                : null}
            </Tabs>
          </Box>
          {calColors && calColors.length > 0 ? (
            calColors.map((calColor, index) => (
              <div key={index}>
                <CustomTabPanel key={index} value={valueTab} index={index}>
                  <SingleCalendarConfig
                    key={index}
                    control={control}
                    url={'url' + index}
                    calname={'calname' + index}
                    calColor={calColor}
                    onColorChange={e => handleColorChange(e, index)}
                  />
                  <Button
                    onClick={handleSubmit(onSubmit)}
                    variant={'contained'}
                    endIcon={<SendIcon />}
                  >
                    Speichern
                  </Button>
                </CustomTabPanel>
              </div>
            ))
          ) : (
            <p>Keine Kalenderquellen gefunden.</p>
          )}
        </Box>
      </div>
      <Button
        className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
        onClick={() => setShowHelp(!showHelp)}
      >
        {showHelp ? 'Hilfe verstecken' : 'Hilfe anzeigen'}
      </Button>

      {showHelp && (
        <div>
          <GoogleICalLinkHelp />
          <AppleWebCalLinkHelp />
        </div>
      )}
    </div>
  );
}

function SingleCalendarConfig({
  control,
  url,
  calname,
  calColor,
  onColorChange,
}) {
  return (
    <div className="mb-4 mt-4 w-full">
      <FormInputText control={control} name={calname} label="Name" />

      <FormInputText
        control={control}
        name={url}
        label="iCal URL"
        rows={7}
        multiline={true}
        pattern={{
          value: /(^webcal:.+)|(http.+ics$)|(^$)/gim,
          message:
            'Entweder leer lassen oder eine google oder Apple iCal URL eingeben',
        }}
      />

      <CalendarEventExample
        calColor={calColor}
        name={calname}
        onColorChange={onColorChange}
      />
    </div>
  );
}

function CalendarEventExample({ calColor, onColorChange }) {
  // const [color, setColor] = useState(bgColorInit);
  let factor = getContrastYIQ(calColor);
  let borderColor = pSBC(-0.8 * factor, calColor);
  let textColor = pSBC(0.8 * factor, calColor);

  return (
    <div className="flex h-[90px] items-center justify-center gap-4">
      <PopoverPicker color={calColor} onChange={onColorChange} />
      <div className="h-[75px] w-60 rounded-lg bg-black">
        <div
          style={{
            backgroundColor: `${calColor}`,
            color: `${textColor}`,
            borderColor: `${borderColor}`,
          }}
          className={`h-30 w-66 m-2 truncate rounded-md border-l-8 p-1`}
        >
          Beispiel Termin
          <br /> 13:30-14:00
        </div>
      </div>
    </div>
  );
}

// Version 4.1
const pSBC = (p, c0, c1, l) => {
  let r,
    g,
    b,
    P,
    f,
    t,
    h,
    m = Math.round,
    a = typeof c1 == 'string';
  if (
    typeof p != 'number' ||
    p < -1 ||
    p > 1 ||
    typeof c0 != 'string' ||
    (c0[0] != 'r' && c0[0] != '#') ||
    (c1 && !a)
  )
    return null;
  (h = c0.length > 9),
    (h = a ? (c1.length > 9 ? true : c1 == 'c' ? !h : false) : h),
    (f = pSBC.pSBCr(c0)),
    (P = p < 0),
    (t =
      c1 && c1 != 'c'
        ? pSBC.pSBCr(c1)
        : P
          ? { r: 0, g: 0, b: 0, a: -1 }
          : { r: 255, g: 255, b: 255, a: -1 }),
    (p = P ? p * -1 : p),
    (P = 1 - p);
  if (!f || !t) return null;
  if (l)
    (r = m(P * f.r + p * t.r)),
      (g = m(P * f.g + p * t.g)),
      (b = m(P * f.b + p * t.b));
  else
    (r = m((P * f.r ** 2 + p * t.r ** 2) ** 0.5)),
      (g = m((P * f.g ** 2 + p * t.g ** 2) ** 0.5)),
      (b = m((P * f.b ** 2 + p * t.b ** 2) ** 0.5));
  (a = f.a),
    (t = t.a),
    (f = a >= 0 || t >= 0),
    (a = f ? (a < 0 ? t : t < 0 ? a : a * P + t * p) : 0);
  if (h)
    return (
      'rgb' +
      (f ? 'a(' : '(') +
      r +
      ',' +
      g +
      ',' +
      b +
      (f ? ',' + m(a * 1000) / 1000 : '') +
      ')'
    );
  else
    return (
      '#' +
      (4294967296 + r * 16777216 + g * 65536 + b * 256 + (f ? m(a * 255) : 0))
        .toString(16)
        .slice(1, f ? undefined : -2)
    );
};

pSBC.pSBCr = d => {
  const i = parseInt;
  let n = d.length,
    x = {};
  if (n > 9) {
    const [r, g, b, a] = (d = d.split(','));
    n = d.length;
    if (n < 3 || n > 4) return null;
    (x.r = i(r[3] == 'a' ? r.slice(5) : r.slice(4))),
      (x.g = i(g)),
      (x.b = i(b)),
      (x.a = a ? parseFloat(a) : -1);
  } else {
    if (n == 8 || n == 6 || n < 4) return null;
    if (n < 6)
      d =
        '#' +
        d[1] +
        d[1] +
        d[2] +
        d[2] +
        d[3] +
        d[3] +
        (n > 4 ? d[4] + d[4] : '');
    d = i(d.slice(1), 16);
    if (n == 9 || n == 5)
      (x.r = (d >> 24) & 255),
        (x.g = (d >> 16) & 255),
        (x.b = (d >> 8) & 255),
        (x.a = Math.round((d & 255) / 0.255) / 1000);
    else (x.r = d >> 16), (x.g = (d >> 8) & 255), (x.b = d & 255), (x.a = -1);
  }
  return x;
};

function getContrastYIQ(hexcolor) {
  var r = parseInt(hexcolor.substring(1, 3), 16);
  var g = parseInt(hexcolor.substring(3, 5), 16);
  var b = parseInt(hexcolor.substring(5, 7), 16);
  var yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? -1 : 1;
}

const GoogleICalLinkHelp = () => {
  return (
    <div className="rounded p-4 shadow-md">
      <p className="mb-4 text-lg font-bold text-gray-100">
        So kommst du an deinen privaten Google iCal-Link
      </p>
      <ol className="mb-4 list-decimal pl-4">
        <li className="mb-2 text-gray-100">
          <span className="font-bold text-gray-300">
            Google Kalender öffnen
          </span>
          : Öffne Google Kalender auf deinem Computer.
        </li>
        <li className="mb-2 text-gray-100">
          <span className="font-bold text-gray-300">Kalendar wählen</span>:
          Wähle den Kalender aus, für den du den privaten iCal-Link benötigst.
        </li>
        <li className="mb-2 text-gray-100">
          <span className="font-bold text-gray-300">Einstellungen öffnen</span>:
          Klicke auf die 3 Punkte rechts neben dem Kalendar und wähle
          "Einstellungen und Freigabe".
          <img src="googleCalSettings.png"></img>
        </li>
        <li className="mb-2 text-gray-100">
          <span className="font-bold text-gray-300">Scrollen</span>: Scrolle
          nach unten bis zum Abschnitt "Kalendar integrieren".
          <img src="googleICalLink.png"></img>
        </li>

        <li className="mb-2 text-gray-100">
          <span className="font-bold text-gray-300">Link kopieren</span>:
          Kopiere den angezeigten Link "Privatadresse im iCal-Format". Dies ist
          dein privater Google iCal-Link.
        </li>
      </ol>
      <p className="mt-2 text-sm text-gray-100">
        Hinweis: Der private iCal-Link beginnt normalerweise mit
        `https://calendar.google.com/calendar/ical/...`. Stelle sicher, dass du
        diesen Link sicher aufbewahrst, da er Zugriff auf deinen Kalender
        ermöglicht.
      </p>
    </div>
  );
};

const AppleWebCalLinkHelp = () => {
  return (
    <div className="rounded p-4 shadow-md">
      <p className="mb-4 text-lg font-bold text-gray-100">
        So bekommst du den Apple WebCal-Kalenderlink
      </p>
      <ol className="mb-4 list-decimal pl-4">
        <li className="mb-2 text-gray-100">
          <span className="font-bold text-gray-300">Apple Kalender öffnen</span>
          : Öffne den Apple Kalender auf deinem iPhone oder iPad.
        </li>
        <li className="mb-2 text-gray-100">
          <span className="font-bold text-gray-300">Kalender wählen</span>:
          Wähle den Kalender aus, für den du den WebCal-Link benötigst.
        </li>
        <li className="mb-2 text-gray-100">
          <span className="font-bold text-gray-300">Tippe auf "Info"</span>:
          Tippe auf das "Info"-Symbol rechts rechts neben dem Kalendar.
          <img src="appleCalSettings.png"></img>
        </li>

        <li className="mb-2 text-gray-100">
          <span className="font-bold text-gray-300">
            "Link teilen..." klicken
          </span>
          : Klicke auf "Link teilen ...".
          <img src="appleLink.png"></img>
        </li>
        <li className="mb-2 text-gray-100">
          <span className="font-bold text-gray-300">Link kopieren</span>:
          Kopiere den angezeigten WebCal-Link. Dies ist dein Apple
          WebCal-Kalenderlink.
        </li>
      </ol>
      <p className="mt-2 text-sm text-gray-100">
        Hinweis: Der WebCal-Link beginnt normalerweise mit `webcal://...`.
        Stelle sicher, dass du diesen Link sicher aufbewahrst, da er Zugriff auf
        deinen Kalender ermöglicht.
      </p>
    </div>
  );
};
