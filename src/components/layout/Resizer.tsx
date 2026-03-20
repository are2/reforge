import React, { useState, useEffect, useCallback } from 'react'

interface ResizerProps {
  onResize: (delta: number) => void
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export const Resizer: React.FC<ResizerProps> = ({ 
  onResize, 
  orientation = 'horizontal', 
  className = '' 
}) => {
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      onResize(orientation === 'horizontal' ? e.movementY : e.movementX)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, onResize, orientation])

  const cursorClass = orientation === 'horizontal' ? 'cursor-row-resize' : 'cursor-col-resize'
  const sizeClass = orientation === 'horizontal' ? 'h-1 w-full' : 'w-1 h-full'

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`${sizeClass} ${cursorClass} bg-transparent hover:bg-primary-500/30 active:bg-primary-500/50 transition-colors ${className}`}
      title="Drag to resize"
    />
  )
}
