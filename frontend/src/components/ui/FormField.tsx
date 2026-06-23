import React, { ReactNode } from 'react'
import { Input, InputProps } from './Input'

export interface FormFieldProps extends Omit<InputProps, 'label'> {
  label: string
  required?: boolean
  hint?: string
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      required,
      hint,
      error,
      helperText,
      ...inputProps
    },
    ref
  ) => {
    return (
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor={inputProps.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#1f2937',
          }}
          className="dark:text-gray-200"
        >
          {label}
          {required && <span style={{ color: '#ef5350', marginLeft: '4px' }}>*</span>}
        </label>
        <Input
          ref={ref}
          label={undefined}
          error={error}
          helperText={hint || helperText}
          {...inputProps}
        />
      </div>
    )
  }
)

FormField.displayName = 'FormField'
