import { Icon } from './Icon'

interface BranchChipProps {
  name: string
  type?: 'local' | 'remote' | 'tag'
  onContextMenu?: (e: React.MouseEvent) => void
}

export function BranchChip({ name, type = 'local', onContextMenu }: BranchChipProps) {
  const base =
    'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[0.6875rem] leading-tight font-medium truncate max-w-48'

  const colors =
    type === 'local'
      ? 'bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-neutral-50'
      : type === 'tag'
      ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200'
      : 'border border-neutral-200 text-accent-blue dark:border-neutral-600 dark:text-accent-blue'

  const icon = type === 'remote' ? '☁' : type === 'tag' ? 'tag' : ''

  return (
    <span 
      className={`${base} ${colors}`}
      onContextMenu={onContextMenu}
    >
      {icon && (
        <span className="flex items-center">
          {type === 'tag' ? (
            <Icon name="tag" size={10} className="mr-0.5" />
          ) : (
            <span className="text-[0.5rem]">{icon}</span>
          )}
        </span>
      )}
      {name}
    </span>
  )
}

