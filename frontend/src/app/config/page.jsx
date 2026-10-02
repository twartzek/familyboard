'use client';
import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ImageIcon from '@mui/icons-material/Image';
import CookieIcon from '@mui/icons-material/Cookie';
import AddHomeIcon from '@mui/icons-material/AddHome';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import RadarIcon from '@mui/icons-material/Radar';
import ConfigurationMain from './ConfigMain';
import { Divider } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

export default function Configuration() {
  const [open, setOpen] = React.useState(false);
  const [component, setComponent] = React.useState(null);

  const toggleDrawer = newOpen => () => {
    setOpen(newOpen);
  };

  const drawerIcons = [
    <CalendarMonthIcon key="calendar" />,
    <ImageIcon key="image" />,
    <CookieIcon key="cookie" />,
    <AddHomeIcon key="home" />,
    <WbSunnyIcon key="weather" />,
    <RadarIcon key="radar" />,
  ];

  const DrawerList = (
    <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
      <List>
        {[
          'Kalendar',
          'Fotos',
          'Tandoor',
          'Home Assistant',
          'Wetter',
          'Regenradar',
        ].map((text, index) => (
          <ListItem key={text} disablePadding>
            <ListItemButton onClick={() => setComponent(text)}>
              <ListItemIcon>{drawerIcons[index]}</ListItemIcon>
              <ListItemText primary={text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem key={'Info'} disablePadding>
          <ListItemButton onClick={() => setComponent('Info')}>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText primary={'Info'} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <div>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 2 }}
              onClick={toggleDrawer(true)}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Familyboard Konfiguration
            </Typography>
            {/* <Button color="inherit">Login</Button> */}
          </Toolbar>
        </AppBar>
      </Box>
      <ConfigurationMain component={component} />
      <Drawer open={open} onClose={toggleDrawer(false)}>
        {DrawerList}
      </Drawer>
    </div>
  );
}
