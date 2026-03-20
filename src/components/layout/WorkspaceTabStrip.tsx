import { Icon } from '../ui/Icon'
import type { WorkspaceTab } from '../../../electron/shared/types'

export interface WorkspaceTabStripProps {
  tabs: WorkspaceTab[]
  activeTabId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
}

export function WorkspaceTabStrip({ tabs, activeTabId, onSelect, onClose }: WorkspaceTabStripProps) {
  return (
    <div className="flex h-6 shrink-0 items-end border-b border-neutral-200 bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-850">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`group flex cursor-pointer items-center gap-1.5 px-3 py-1 text-[0.6875rem] leading-tight ${
              isActive
                ? 'border-b-2 border-accent-violet bg-neutral-0 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50'
                : 'border-b-2 border-transparent text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <span className="truncate max-w-[10rem]">{tab.label}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose(tab.id)
              }}
              className="hidden rounded-sm p-0.5 text-neutral-300 hover:text-neutral-500 group-hover:inline-flex dark:text-neutral-500 dark:hover:text-neutral-300"
            >
              <Icon name="x" size={10} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
