import React, { InputHTMLAttributes } from 'react'

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
    const hasError = !!error

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-[10.5px] uppercase tracking-wider font-extrabold text-stone-400 font-mono mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={`
            w-full px-3.5 py-2.5 rounded-xl
            bg-stone-50 dark:bg-stone-800
            border transition-all duration-200
            font-semibold text-xs text-stone-800 dark:text-stone-100
            placeholder-stone-300 dark:placeholder-stone-500
            focus:outline-none
            ${hasError
              ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-400'
              : 'border-stone-200 dark:border-stone-700 focus:border-[#019cda] focus:ring-1 focus:ring-[#019cda]'
            }
            disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed
            ${className}
          `.trim()}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? `error-${props.id}` : undefined}
          onFocus={props.onFocus}
          onBlur={props.onBlur}
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

