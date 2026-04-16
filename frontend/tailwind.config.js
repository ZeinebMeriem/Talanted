/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark mode specific colors
        'dark-bg': '#0f172a',
        'dark-surface': '#1e293b',
        'dark-surface-2': '#334155',
      },
      animation: {
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "spin-slow": "spin 3s linear infinite",
        bounce: "bounce 0.6s infinite",
        "toggle-rotate": "toggleRotate 0.3s ease-out",
      },
      keyframes: {
        slideUp: {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        bounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        toggleRotate: {
          from: { transform: "rotate(0deg)", opacity: "0" },
          to: { transform: "rotate(360deg)", opacity: "1" },
        },
      },
      transitionDelay: {
        100: "100ms",
        200: "200ms",
      },
    },
  },
  plugins: [],
};
