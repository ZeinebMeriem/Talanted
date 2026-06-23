import React from 'react'

interface NotFoundProps {
  onGoHome?: () => void
}

export const NotFound: React.FC<NotFoundProps> = ({ onGoHome }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
    <div className="text-center max-w-md">
      <div className="text-8xl font-bold text-slate-200 mb-4">404</div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Page not found</h1>
      <p className="text-slate-500 mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={onGoHome ?? (() => window.location.assign('/'))}
        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
      >
        Go back home
      </button>
    </div>
  </div>
)

export default NotFound
