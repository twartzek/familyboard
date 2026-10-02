import { Controller } from 'react-hook-form';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

export const FormInputCheckBox = ({
  disabled,
  name,
  control,
  label,
  required,
}) => {
  return (
    <Controller
      name={name}
      control={control}
      defaultValue={false}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <FormControlLabel
          required={required}
          disabled={disabled}
          control={
            <Checkbox
              sx={{ my: 1 }}
              margin="dense"
              disabled={disabled}
              onChange={onChange}
              checked={value}
              required={required}
            />
          }
          label={label}
        />
      )}
    />
  );
};
