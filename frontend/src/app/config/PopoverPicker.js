import React, { useCallback, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import Button from '@mui/material/Button';
import useClickOutside from './useClickOutside';

export const PopoverPicker = ({ color, onChange }) => {
  const popover = useRef();
  const [isOpen, toggle] = useState(false);

  const close = useCallback(() => toggle(false), []);
  useClickOutside(popover, close);

  return (
    <div className="">
      <Button variant="outlined" onClick={() => toggle(true)}>
        Wähle Farbe
      </Button>

      {isOpen && (
        <div className="absolute z-10" ref={popover}>
          <HexColorPicker color={color} onChange={onChange} />
        </div>
      )}
    </div>
  );
};
