'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import HomeIcon from '@mui/icons-material/Home';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import Stack from '@mui/material/Stack';
import Icon from '@mdi/react';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import { mdiHomeAssistant } from '@mdi/js';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import PropTypes from 'prop-types';
import { DialogContent, Link } from '@mui/material';
import useSWR from 'swr';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import WebIcon from '@mui/icons-material/Web';
import LocalDiningIcon from '@mui/icons-material/LocalDining';

const fetcher = (...args) => fetch(...args).then(res => res.json());

export default function NavigationButtons() {
  const url = 'http://localhost:3006/api/v1/config';
  const { data, error, isLoading } = useSWR(url, fetcher, {});

  const [open, setOpen] = React.useState(false);
  const [openMyPage, setOpenMyPage] = React.useState(false);

  const router = useRouter();
  const pathname = usePathname();
  let timeout;

  const resetTimer = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (pathname !== '/') {
        router.push('/'); // Replace with your target page
        router.refresh();
      }
    }, 600000); // 10 minutes in milliseconds
  };

  useEffect(() => {
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);

    resetTimer(); // Start the timer initially

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, []);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClickOpenMyPage = () => {
    setOpenMyPage(true);
  };

  const handleClose = value => {
    setOpen(false);
    setOpenMyPage(false);
  };

  return (
    <div className="flex w-full items-center justify-between">
      <div className="ml-0"></div>
      <div className="flex flex-1 justify-center">
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<HomeIcon />}
            onClick={() => {
              router.push('/');
              router.refresh();
            }}
          >
            Home
          </Button>

          {data ? (
            data.homeassistant.active ? (
              <Button
                variant="outlined"
                startIcon={<Icon path={mdiHomeAssistant} size={1} />}
                //   color="tertiary"
                onClick={() => router.push('/homeassistant')}
              >
                Home Assistant
              </Button>
            ) : null
          ) : null}
          {data ? (
            data.tandoor.active ? (
              <Button
                variant="outlined"
                startIcon={<FormatListNumberedIcon />}
                //   color="tertiary"
                onClick={() => router.push('/allrecipes')}
              >
                Rezepte
              </Button>
            ) : null
          ) : null}
          <Button
            variant="outlined"
            startIcon={<WaterDropIcon />}
            //   color="tertiary"
            onClick={() => {
              router.push('/regenradar');
            }}
          >
            Regenradar
          </Button>
          <Button
            variant="outlined"
            startIcon={<LocalDiningIcon />}
            onClick={() => router.push('/spuelmaschine')}
          >
            Spülmaschine
          </Button>
          <Button
            variant="outlined"
            startIcon={<WebIcon />}
            onClick={handleClickOpenMyPage}
          >
            MyPage
          </Button>
        </Stack>
      </div>
      <div className="mr-0">
        <IconButton color="primary" onClick={handleClickOpen}>
          <SettingsIcon />
        </IconButton>
      </div>
      <SimpleDialog
        open={open}
        onClose={handleClose}
        page="config"
        title="Scannen für Konfiguration"
      />
      <SimpleDialog
        open={openMyPage}
        onClose={handleClose}
        page="mypage"
        title="Scannen für Eingabe Webseite"
      />
    </div>
  );
}

function SimpleDialog(props) {
  const { onClose, open, page, title } = props;
  const fetcher = (...args) => fetch(...args).then(res => res.json());

  const { data, error, isLoading } = useSWR(
    'http://localhost:3006/api/v1/localsystemdata',
    fetcher,
  );

  const handleClose = () => {
    onClose();
  };

  if (isLoading)
    return (
      <Dialog
        onClose={handleClose}
        open={open}
        className="bg-slate-800 opacity-90"
      >
        <DialogTitle className="text-center">{title}</DialogTitle>
        <DialogContent className="flex flex-col place-content-center items-center justify-center text-center">
          <Box sx={{ display: 'flex' }}>
            <CircularProgress />
          </Box>
          Loading...
        </DialogContent>
      </Dialog>
    );

  if (error)
    return (
      <Dialog
        onClose={handleClose}
        open={open}
        className="bg-slate-800 opacity-90"
      >
        <DialogTitle className="text-center">{title}</DialogTitle>
        <DialogContent className="flex flex-col place-content-center items-center justify-center text-center">
          Ups, leider ist etwas schief gelaufen und wir können keinen QR Code
          generieren.
        </DialogContent>
      </Dialog>
    );

  return (
    <Dialog
      onClose={handleClose}
      open={open}
      className="bg-slate-800 opacity-90"
    >
      <DialogTitle className="text-center">{title}</DialogTitle>
      <DialogContent className="flex flex-col place-content-center items-center justify-center text-center">
        <QRCodeSVG value={'http://' + data.ip + ':3000/' + page} />
        {page === 'config' ? (
          <div>
            oder im Browser auf dem Rechner eingeben:
            <br />
            {data.ip + ':3000/config'}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

SimpleDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  selectedValue: PropTypes.string.isRequired,
};
