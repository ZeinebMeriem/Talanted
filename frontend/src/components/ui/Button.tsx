import React, { ButtonHTMLAttributes } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  icon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      icon,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const sizeMap = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-2.5 text-base',
      lg: 'px-8 py-3 text-lg',
    }

    const variantMap = {
      primary: `
        bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600
        text-white font-semibold
        shadow-lg shadow-blue-500/30
        hover:shadow-2xl hover:shadow-blue-500/40
        hover:scale-105
        active:scale-95
        transition-all duration-200
        border-0
      `,
      secondary: `
        bg-gradient-to-r from-slate-100 to-slate-200
        text-slate-700 font-semibold
        hover:from-slate-200 hover:to-slate-300
        hover:scale-105
        active:scale-95
        transition-all duration-200
        border-0
      `,
      danger: `
        bg-gradient-to-r from-red-500 to-rose-600
        text-white font-semibold
        shadow-lg shadow-red-500/30
        hover:shadow-2xl hover:shadow-red-500/40
        hover:scale-105
        active:scale-95
        transition-all duration-200
        border-0
      `,
      ghost: `
        bg-transparent text-slate-600 font-medium
        hover:bg-slate-100 hover:text-slate-800
        active:bg-slate-200
        transition-all duration-200
        border border-transparent
        hover:border-slate-300
      `,
      outline: `
        bg-transparent text-blue-600 font-semibold
        border border-blue-300
        hover:border-blue-500 hover:bg-blue-50
        hover:scale-105
        active:scale-95
        transition-all duration-200
      `,
    }

    const baseClass = `
      inline-flex items-center justify-center gap-2 rounded-lg
      font-medium transition-all duration-200
      disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500
      whitespace-nowrap
    `

    const fullWidthClass = fullWidth ? 'w-full' : ''

    return (
      <button
        ref={ref}
        className={`${baseClass} ${sizeMap[size]} ${variantMap[variant]} ${fullWidthClass} ${className}`.trim()}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <span className="spinner animate-spin w-5 h-5 border-2 border-current border-t-transparent"></span>
        )}
        {icon && !loading && icon}
        <span>{children}</span>
      </button>
    )
  }
)

Button.displayName = 'Button'

