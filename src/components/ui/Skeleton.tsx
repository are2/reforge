import React from 'react'

interface SkeletonProps {
  /** Optional className for custom sizing/shaping */
  className?: string
  /** Whether the skeleton is a circle */
  circle?: boolean
  /** Width of the skeleton, if not using className */
  width?: string | number
  /** Height of the skeleton, if not using className */
  height?: string | number
}

/**
 * Reusable skeleton component for loading states.
 */
export function Skeleton({ className = '', circle, width, height }: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width,
    height: height,
  }

  return (
    <div
      className={`skeleton ${circle ? 'rounded-full' : 'rounded-sm'} ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}
