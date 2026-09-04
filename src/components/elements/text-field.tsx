'use client';

import { TextInput, type TextInputProps } from '@astryxdesign/core/TextInput';
import { type Control, type FieldPath, type FieldValues, useController } from 'react-hook-form';

/**
 * Every prop `TextInput` owns, minus the four this component derives from the
 * form. `value`/`onChange` come from the field, `status` from its validation
 * state, and `htmlName` from the field name.
 */
type TextFieldProps<TValues extends FieldValues> = Omit<
  TextInputProps,
  'value' | 'onChange' | 'status' | 'htmlName'
> & {
  control: Control<TValues>;
  name: FieldPath<TValues>;
};

/**
 * Binds a react-hook-form field to Astryx's `TextInput`.
 *
 * Astryx inputs are fully controlled — `value` is required and `onChange`
 * hands back the string rather than the event — so the `{...register(name)}`
 * spread does not apply. `useController` is the supported bridge, and putting
 * it behind one component keeps every form in the app from re-deriving the
 * same wiring (and from forgetting to surface the error).
 *
 * The validation message is rendered by `TextInput` itself through `status`,
 * so forms do not pair each input with a separate error element.
 */
const TextField = <TValues extends FieldValues>({ control, name, ...props }: TextFieldProps<TValues>) => {
  const {
    field: { value, onChange, onBlur, ref },
    fieldState: { error },
  } = useController({ control, name });

  return (
    <TextInput
      {...props}
      ref={ref}
      htmlName={name}
      value={value ?? ''}
      onChange={onChange}
      onBlur={onBlur}
      status={error?.message ? { type: 'error', message: error.message } : undefined}
    />
  );
};

export default TextField;
