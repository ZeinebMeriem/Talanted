import React, { InputHTMLAttributes, useState } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  helperText?: string
  label?: string
  fullWidth?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      error,
      helperText,
      label,
      fullWidth = true,
      className = '',
      type = 'text',
      disabled,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false)
    const hasError = !!error

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={`
            w-full px-4 py-3 rounded-lg
            bg-white dark:bg-slate-800
            border-2 transition-all duration-200
            font-medium text-slate-900 dark:text-white
            placeholder-slate-400 dark:placeholder-slate-500
            focus:outline-none
            ${hasError
              ? 'border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/30'
              : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30'
            }
            disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400 disabled:cursor-not-allowed
            ${className}
          `.trim()}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? `error-${props.id}` : undefined}
          onFocus={(e) => {
            setIsFocused(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            props.onBlur?.(e)
          }}
          {...props}
        />
        {hasError && (
          <span
            id={`error-${props.id}`}
            className="block text-sm font-medium text-red-500 dark:text-red-400 mt-2 animate-pulse"
            role="alert"
          >
            ✕ {error}
          </span>
        )}
        {helperText && !hasError && (
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            {helperText}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

