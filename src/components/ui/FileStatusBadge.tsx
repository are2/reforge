import type { FileStatus } from '../../../electron/shared/types'

interface FileStatusBadgeProps {
  status: FileStatus
  isIgnored?: boolean
}

const statusConfig: Record<FileStatus, { label: string; className: string }> = {
  modified: {
    label: 'M',
    className: 'bg-primary-500 text-neutral-0',
  },
  added: {
    label: 'A',
    className: 'bg-secondary-500 text-neutral-0',
  },
  deleted: {
    label: 'D',
    className: 'bg-accent-red text-neutral-0',
  },
  renamed: {
    label: 'R',
    className: 'bg-accent-blue text-neutral-0',
  },
  untracked: {
    label: 'U',
    className: 'bg-secondary-400 text-neutral-0',
  },
  copied: {
    label: 'C',
    className: 'bg-accent-violet text-neutral-0',
  },
  conflict: {
    label: '!',
    className: 'bg-accent-red text-neutral-0',
  },
}

export function FileStatusBadge({ status, isIgnored }: FileStatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <span
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[0.5625rem] font-bold leading-none ${config.className} ${
        isIgnored ? 'opacity-50 grayscale' : ''
      }`}
      title={isIgnored ? 'This file is matched by .gitignore' : undefined}
    >
      {config.label}
    </span>
  )
}
