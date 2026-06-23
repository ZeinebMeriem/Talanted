import { useState, useEffect } from 'react'

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false)

  // Initialize from localStorage and system preference
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved) {
      setIsDark(saved === 'dark')
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(prefersDark)
    }
  }, [])

  // Update HTML class and localStorage when theme changes
  useEffect(() => {
    const html = document.documentElement
    if (isDark) {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      {isDark ? (
        // Sun icon (light mode)
        <svg
          className="w-5 h-5 text-yellow-500 animate-toggle-rotate"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v2a1 1 0 11-2 0V3a1 1 0 011-1zm4.293 1.293a1 1 0 011.414 0l1.414 1.414a1 1 0 11-1.414 1.414L14.293 3.707a1 1 0 010-1.414zm2.828 2.828a1 1 0 011.414 0l1.414 1.414a1 1 0 11-1.414 1.414l-1.414-1.414a1 1 0 010-1.414zm1.414 5.657a1 1 0 110-2h2a1 1 0 110 2h-2zm-1.414 2.828a1 1 0 011.414-1.414l1.414 1.414a1 1 0 11-1.414 1.414l-1.414-1.414zM13.586 13.586a1 1 0 01-1.414 0l-1.414-1.414a1 1 0 011.414-1.414l1.414 1.414a1 1 0 010 1.414zM12 15.657a1 1 0 110 2h-2a1 1 0 110-2h2zm-2.828-1.414a1 1 0 01-1.414 1.414L6.344 15.657a1 1 0 011.414-1.414l1.414 1.414zM7.071 11.314a1 1 0 01-1.414 0L4.243 9.9a1 1 0 011.414-1.414l1.414 1.414a1 1 0 010 1.414zm0 2.828a1 1 0 01-1.414 0l-1.414-1.414a1 1 0 011.414-1.414L7.071 13.728a1 1 0 010 1.414zM5.757 5.757a1 1 0 000-1.414L4.343 3.929a1 1 0 00-1.414 1.414l1.414 1.414a1 1 0 001.414 0zm2.828 2.828a1 1 0 000-1.414L7.171 6.757a1 1 0 00-1.414 1.414l1.414 1.414a1 1 0 001.414 0zM10 7a3 3 0 100 6 3 3 0 000-6z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        // Moon icon (dark mode)
        <svg
          className="w-5 h-5 text-blue-600 animate-toggle-rotate"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  )
}
