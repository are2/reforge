import React from 'react'
import { Icon } from './Icon'

interface WindowFrameProps {
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  onClose: () => void
  padding?: boolean
}

/**
 * WindowFrame provides a consistent layout for standalone windows (Settings, Merge Tool).
 * Matches the style of the Modal component.
 */
export function WindowFrame({ title, children, footer, onClose, padding = true }: WindowFrameProps) {
  return (
    <div className="window-frame flex h-screen flex-col bg-neutral-0 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50 overflow-hidden transition-colors duration-200">
      {/* Draggable Header */}
      <header className="flex h-10 shrink-0 select-none items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 dark:border-neutral-800 dark:bg-neutral-900 drag">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.05em] text-neutral-500 dark:text-neutral-400 no-drag">
          {title}
        </h3>
        
        <button 
          onClick={onClose}
          className="no-drag flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800"
          title="Close"
        >
          <Icon name="x" size={14} className="text-neutral-500 dark:text-neutral-400" />
        </button>
      </header>

      {/* Main Body */}
      <main className={`flex-1 overflow-y-auto no-drag ${padding ? 'p-6' : 'p-0'}`}>
        {children}
      </main>

      {/* Footer */}
      {footer && (
        <footer className="flex h-14 shrink-0 items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-50 dark:bg-neutral-850 px-4 dark:border-neutral-800 no-drag">
          {footer}
        </footer>
      )}

      <style>{`
        .drag {
          -webkit-app-region: drag;
        }
        .no-drag {
          -webkit-app-region: no-drag;
        }
      `}</style>
    </div>
  )
}
