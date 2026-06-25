/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      // Semantic Colors
      colors: {
        // Talanted brand tokens (matches template)
        'primary-blue': '#15395e',
        'accent-blue':  '#019cda',
        // Brand colors
        primary: {
          DEFAULT: '#019cda',
          dark: '#15395e',
          light: '#38bdf8',
          50: '#f0f5fb',
          100: '#d9e6f5',
          200: '#b3ceea',
          300: '#8db5de',
          400: '#679cd3',
          500: '#5480ba',
          600: '#4670a8',
          700: '#376096',
          800: '#285084',
          900: '#1a3860',
        },
        secondary: {
          DEFAULT: '#6ba3d9',
          light: '#8bb5e0',
          dark: '#5a91c5',
        },
        // Status colors
        success: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#059669',
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
          dark: '#d97706',
        },
        error: {
          DEFAULT: '#ef5350',
          light: '#f87171',
          dark: '#e04580',
        },
        // Neutral palette
        neutral: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        // Dark mode
        'dark-bg': '#0f172a',
        'dark-surface': '#1e293b',
        'dark-surface-2': '#334155',
      },
      // Typography
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '44px' }],
      },
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      // Spacing scale
      spacing: {
        0: '0',
        0.2: '1px',
        0.5: '2px',
        1: '4px',
        1.5: '6px',
        2: '8px',
        2.5: '10px',
        3: '12px',
        3.5: '14px',
        4: '16px',
        4.5: '18px',
        5: '20px',
        5.5: '22px',
        6: '24px',
        6.5: '26px',
        7: '28px',
        7.5: '30px',
        8: '32px',
        8.5: '34px',
        9: '36px',
        10: '40px',
        11: '44px',
        12: '48px',
        14: '56px',
        16: '64px',
        20: '80px',
        24: '96px',
        28: '112px',
        32: '128px',
        36: '144px',
        40: '160px',
        44: '176px',
        48: '192px',
        52: '208px',
        56: '224px',
        60: '240px',
        64: '256px',
        72: '288px',
        80: '320px',
        96: '384px',
      },
      // Shadows
      boxShadow: {
        none: 'none',
        xs: '0 1px 2px rgba(0,0,0,0.05)',
        sm: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        base: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(84,128,186,0.1)',
        md: '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
        lg: '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
        xl: '0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)',
        '2xl': '0 25px 50px rgba(0,0,0,0.25)',
        glow: '0 0 20px rgba(84,128,186,0.4)',
        'glow-lg': '0 0 40px rgba(84,128,186,0.6)',
      },
      // Animations
      animation: {
        // Basic
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-left': 'slideLeft 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-out': 'fadeOut 0.3s ease-out',
        // Scaling
        'scale-in': 'scaleIn 0.3s ease-out',
        'scale-up': 'scaleUp 0.3s ease-out',
        // Rotating
        'toggle-rotate': 'toggleRotate 0.3s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        // Pulsing
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'pulse-color': 'pulseColor 2s ease-in-out infinite',
        // Floating
        'float': 'float 3s ease-in-out infinite',
        'float-slow': 'float 4s ease-in-out infinite',
        // Shimmer
        'shimmer': 'shimmer 2s infinite',
        'bounce': 'bounce 0.6s infinite',
      },
      // Keyframes
      keyframes: {
        // Slide animations
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          from: { transform: 'translateY(-20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          from: { transform: 'translateX(20px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideRight: {
          from: { transform: 'translateX(-20px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        // Fade animations
        fadeIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        fadeOut: {
          from: { opacity: '1', transform: 'scale(1)' },
          to: { opacity: '0', transform: 'scale(0.95)' },
        },
        // Scale animations
        scaleIn: {
          from: { transform: 'scale(0.9)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        scaleUp: {
          from: { transform: 'scale(1)' },
          to: { transform: 'scale(1.05)' },
        },
        // Rotate animation
        toggleRotate: {
          from: { transform: 'rotate(0deg)', opacity: '0' },
          to: { transform: 'rotate(360deg)', opacity: '1' },
        },
        // Pulse animations
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(84,128,186,0.7)' },
          '50%': { boxShadow: '0 0 0 10px rgba(84,128,186,0)' },
        },
        pulseColor: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        // Float animation
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        // Shimmer animation
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        // Enterprise UI component animations
        toastIn: {
          '0%': { transform: 'translateX(400px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        toastOut: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(400px)', opacity: '0' },
        },
        modalFade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        modalScale: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        backdropFade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        buttonActive: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.98)' },
          '100%': { transform: 'scale(1)' },
        },
        focusRing: {
          '0%': { outlineWidth: '0', outlineOffset: '0' },
          '100%': { outlineWidth: '2px', outlineOffset: '2px' },
        },
        errorShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
      },
      // Transitions
      transitionDuration: {
        0: '0ms',
        100: '100ms',
        200: '200ms',
        300: '300ms',
        500: '500ms',
        700: '700ms',
        1000: '1000ms',
      },
      transitionDelay: {
        0: '0ms',
        100: '100ms',
        200: '200ms',
        300: '300ms',
        500: '500ms',
      },
      // Z-index layering system for enterprise components
      zIndex: {
        'hide': '-1',
        'auto': 'auto',
        0: '0',
        10: '10',
        20: '20',
        30: '30',
        40: '40',
        50: '50',
        'dropdown': '900',
        'sticky': '950',
        'fixed': '980',
        'modal-backdrop': '990',
        'modal': '1000',
        'popover': '1020',
        'tooltip': '1030',
        'toast': '1040',
      },
      // Enhanced animation for UI components
      animation: {
        'toast-in': 'toastIn 0.3s cubic-bezier(0.4,0,0.2,1)',
        'toast-out': 'toastOut 0.3s cubic-bezier(0.4,0,0.2,1)',
        'modal-fade': 'modalFade 0.25s cubic-bezier(0.4,0,0.2,1)',
        'modal-scale': 'modalScale 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        'backdrop-fade': 'backdropFade 0.2s ease-out',
        'button-active': 'buttonActive 0.2s cubic-bezier(0.4,0,0.2,1)',
      },
      // Opacity
      opacity: {
        0: '0',
        5: '0.05',
        10: '0.1',
        20: '0.2',
        30: '0.3',
        40: '0.4',
        50: '0.5',
        60: '0.6',
        70: '0.7',
        80: '0.8',
        90: '0.9',
        95: '0.95',
        100: '1',
      },
      // Border radius
      borderRadius: {
        none: '0',
        sm: '4px',
        base: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
