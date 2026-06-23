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
      sm: 'px-3.5 py-2 text-[11px]',
      md: 'px-4 py-2.5 text-xs',
      lg: 'px-6 py-3 text-sm',
    }

    const variantMap = {
      primary: `
        bg-[#019cda] hover:bg-[#008fc9]
        text-white font-bold
        shadow-sm shadow-sky-500/10
        active:scale-[0.99]
        transition-all duration-200
        border-0
      `,
      secondary: `
        bg-stone-100 hover:bg-stone-200
        text-stone-800 font-bold
        border border-stone-200
        active:scale-[0.99]
        transition-all duration-200
      `,
      danger: `
        bg-red-500 hover:bg-red-600
        text-white font-bold
        shadow-sm shadow-red-500/15
        active:scale-[0.99]
        transition-all duration-200
        border-0
      `,
      ghost: `
        bg-transparent text-stone-600 font-semibold
        hover:bg-stone-100 hover:text-stone-800
        active:bg-stone-200
        transition-all duration-200
        border border-transparent
      `,
      outline: `
        bg-transparent text-[#019cda] font-bold
        border border-[#019cda]/30
        hover:border-[#019cda] hover:bg-sky-50
        active:scale-[0.99]
        transition-all duration-200
      `,
    }

    const baseClass = `
      inline-flex items-center justify-center gap-1.5 rounded-xl
      font-bold transition-all duration-200 cursor-pointer
      disabled:opacity-50 disabled:cursor-not-allowed
      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#019cda]
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

