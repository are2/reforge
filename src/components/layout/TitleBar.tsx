import { useState, useEffect, useRef } from 'react'
import { Icon } from '../ui/Icon'

interface MenuItem {
  label?: string
  action?: () => void
  separator?: boolean
  role?: string
}

interface MenuDropdownProps {
  label: string
  items: MenuItem[]
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}

function MenuDropdown({ label, items, isOpen, onToggle, onClose }: MenuDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className={`px-3 h-[39px] text-xs font-medium transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700 focus:outline-none ${
          isOpen ? 'bg-neutral-200 dark:bg-neutral-700' : ''
        }`}
      >
        {label}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-[100] min-w-[160px] py-1 rounded-sm border border-neutral-200 bg-neutral-0 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
          {items.map((item, index) => (
            item.separator ? (
              <div key={index} className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />
            ) : (
              <button
                key={index}
                onClick={() => {
                  item.action?.()
                  onClose()
                }}
                className="flex w-full items-center px-3 py-1.5 text-xs text-neutral-700 hover:bg-primary-500 hover:text-white dark:text-neutral-300 dark:hover:bg-primary-600 dark:hover:text-white transition-colors text-left"
              >
                {item.label}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  )
}

export function TitleBar() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const menuData = [
    {
      label: 'File',
      items: [
        { label: 'Open folder', action: () => window.system.selectFolder() },
        { label: 'Settings', action: () => window.system.openSettings() },
        { separator: true },
        { label: 'Quit', action: () => window.system.quit() },
      ]
    },
    {
      label: 'View',
      items: [
        { label: 'Reload', action: () => window.system.reload() },
        { label: 'Force Reload', action: () => window.system.reload() },
        { separator: true },
        { label: 'Actual Size', action: () => window.system.zoomReset() },
        { label: 'Zoom In', action: () => window.system.zoomIn() },
        { label: 'Zoom Out', action: () => window.system.zoomOut() },
        { separator: true },
        { label: 'Toggle Full Screen', action: () => window.system.toggleFullScreen() },
      ]
    },
    {
      label: 'Window',
      items: [
        { label: 'Minimize', action: () => window.system.minimize() },
        { label: 'Zoom', action: () => window.system.maximize() },
      ]
    },
    {
      label: 'Help',
      items: [
        { label: 'About Git GUI', action: () => window.system.openAbout() },
      ]
    }
  ]

  return (
    <div 
      className="flex h-10 shrink-0 select-none items-center border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div className="flex items-center px-2.5 gap-2 no-drag" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="text-primary-600">
             <Icon name="logo" size={16} />
        </div>
        <div className="flex items-center">
          {menuData.map((menu) => (
            <MenuDropdown
              key={menu.label}
              label={menu.label}
              items={menu.items}
              isOpen={activeMenu === menu.label}
              onToggle={() => setActiveMenu(activeMenu === menu.label ? null : menu.label)}
              onClose={() => setActiveMenu(null)}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex justify-center items-center pointer-events-none">
        <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
            Reforge
        </span>
      </div>

      {/* Space for native window controls (TitleBarOverlay) */}
      <div className="w-[138px]" />
    </div>
  )
}
