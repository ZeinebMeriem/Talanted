import React from 'react'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color,
  className = '',
}) => {
  const sizeClass = `spinner ${size}`
  const style = color ? { borderTopColor: color } : {}

  return (
    <span
      className={`${sizeClass} ${className}`.trim()}
      style={style}
      aria-label="Loading"
      role="status"
    />
  )
}
