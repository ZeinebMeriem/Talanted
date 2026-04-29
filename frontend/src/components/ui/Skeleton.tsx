import React from 'react'

export interface SkeletonProps {
  variant?: 'text' | 'title' | 'avatar' | 'button' | 'card'
  width?: string | number
  height?: string | number
  count?: number
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
}) => {
  const getDefaultDimensions = (): { width: string; height: string } => {
    switch (variant) {
      case 'title':
        return { width: '100%', height: '28px' }
      case 'avatar':
        return { width: '48px', height: '48px' }
      case 'button':
        return { width: '100px', height: '40px' }
      case 'card':
        return { width: '100%', height: '200px' }
      case 'text':
      default:
        return { width: '100%', height: '16px' }
    }
  }

  const defaults = getDefaultDimensions()
  const skeletonWidth = width ?? defaults.width
  const skeletonHeight = height ?? defaults.height

  const skeletons = Array.from({ length: count }).map((_, i) => (
    <div
      key={i}
      className={`skeleton ${className}`.trim()}
      style={{
        width: typeof skeletonWidth === 'number' ? `${skeletonWidth}px` : skeletonWidth,
        height: typeof skeletonHeight === 'number' ? `${skeletonHeight}px` : skeletonHeight,
        borderRadius: variant === 'avatar' ? '50%' : '8px',
        marginBottom: i < count - 1 ? '8px' : undefined,
      }}
      aria-label="Loading"
      role="presentation"
    />
  ))

  return <>{skeletons}</>
}
