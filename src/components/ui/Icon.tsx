/**
 * Lightweight SVG icon set using thin line style.
 * For a real app these would come from a sprite or icon library.
 */

interface IconProps {
  name: string
  className?: string
  size?: number
  color?: string
}

const paths: Record<string, string> = {
  // toolbar / generic
  'quick-launch': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0v-6a1 1 0 011-1h2a1 1 0 011 1v6m-6 0h6',
  fetch: 'M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3',
  pull: 'M12 3v12m0 0l-4-4m4 4l4-4M4 19h16',
  push: 'M12 19V7m0 0l4 4m-4-4l-4 4M4 5h16',
  stash: 'M5 8h14M5 8a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
  branch: 'M6 3v12M18 9a3 3 0 01-3 3h-6M6 21a3 3 0 100-6 3 3 0 000 6zM18 9a3 3 0 100-6 3 3 0 000 6z',
  'pull-request': 'M6 9v8a3 3 0 003 3h3M18 9v12M18 9l-3 3m3-3l3 3M6 9a3 3 0 100-6 3 3 0 000 6z',
  terminal: 'M4 17l6-5-6-5M12 19h8',
  alert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37 1.066.672 2.476.096 2.573-1.066z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  // navigation
  chevron: 'M9 5l7 7-7 7',
  'chevron-down': 'M19 9l-7 7-7-7',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  folder: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  git: 'M13 10V3L4 14h7v7l9-11h-7z',
  tag: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
  archive: 'M5 8h14M5 8a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
  copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  sun: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
  moon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
  x: 'M6 18L18 6M6 6l12 12',
  link: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
  'arrow-up': 'M5 15l7-7 7 7',
  'arrow-down': 'M19 9l-7 7-7 7',
  file: 'M7 21h10a2 2 0 002-2V9.414a2 2 0 00-.586-1.414l-4.414-4.414A2 2 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  logo: 'M4 19h16v1H4v-1z M7 19v-4c0-2 1-3 3-3h4c2 0 3 1 3 3v4 M3 11c0-2 2-3 4-3h10c2 0 4 1 4 3v2H3v-2z M12 8V4a2 2 0 110-4 2 2 0 010 4z',
}

export function Icon({ name, className = '', size = 14, color }: IconProps) {
  const d = paths[name]
  if (!d) return null

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || 'currentColor'}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      <path d={d} />
    </svg>
  )
}
