import { Controller } from 'react-hook-form';
import TextField from '@mui/material/TextField';

export const FormInputText = ({
  disabled,
  name,
  variant = 'filled',
  control,
  defaultValue,
  label,
  type = 'text',
  required = false,
  rows = 1,
  multiline = false,
  autofocus = false,
  pattern = '',
}) => {
  return (
    <Controller
      name={name}
      control={control}
      defaultValue={defaultValue ? defaultValue : ''}
      rules={{
        required: required,
        pattern: pattern,
      }}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <TextField
          helperText={error ? error.message : null}
          sx={{ my: 1 }}
          margin="dense"
          error={!!error}
          fullWidth
          label={label}
          disabled={disabled}
          type={type}
          rows={rows}
          multiline={multiline}
          autoFocus={autofocus}
          onChange={onChange}
          value={value}
          variant={variant}
        />
      )}
    />
  );
};
