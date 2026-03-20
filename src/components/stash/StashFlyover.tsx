import { useState, useRef, useEffect } from 'react'
import { Icon } from '../ui/Icon'

interface StashFlyoverProps {
  onSave: (message: string, includeUntracked: boolean) => Promise<void>
  onCancel: () => void
  busy?: boolean
}

export function StashFlyover({ onSave, onCancel, busy }: StashFlyoverProps) {
  const [message, setMessage] = useState('')
  const [includeUntracked, setIncludeUntracked] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Focus input on mount
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const handleSave = async () => {
    if (busy) return
    await onSave(message, includeUntracked)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 shadow-sm">Save stash</h2>
        <p className="text-[11px] text-neutral-500">Save your local changes to a new stash</p>
      </div>

      <div className="flex flex-col gap-3">
        {/* Message Input */}
        <div className="grid grid-cols-[70px_1fr] items-center gap-2">
          <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Message:</label>
          <div className="relative group">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary-500 transition-colors">
              <Icon name="archive" size={12} />
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder="Stash message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') onCancel()
              }}
              className="w-full rounded border border-neutral-200 bg-neutral-50 py-1.5 pl-8 pr-3 text-xs text-neutral-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50 transition-all"
            />
          </div>
        </div>

        {/* Include Untracked Checkbox */}
        <div className="ml-[78px] flex flex-col gap-1">
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={includeUntracked}
              onChange={(e) => setIncludeUntracked(e.target.checked)}
              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-900 transition-colors"
            />
            <span className="text-xs text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-neutral-50 transition-colors text-[11px]">Stage new files</span>
          </label>
          <p className="text-[10px] text-neutral-400 ml-5 leading-tight italic">
            By default stash ignores new files until you stage them
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-700">
          <button
            disabled={busy}
            onClick={handleSave}
            className="flex items-center justify-center gap-2 rounded bg-primary-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 min-w-[90px]"
          >
            {busy && (
              <svg className="git-spinner h-3 w-3 text-white/90" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="10" />
              </svg>
            )}
            <span>Save Stash</span>
          </button>
          <button
            onClick={onCancel}
            className="rounded border border-neutral-200 bg-neutral-0 px-4 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:border-neutral-500 transition-all active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
