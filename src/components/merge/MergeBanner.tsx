import { Icon } from '../ui/Icon'

interface MergeBannerProps {
  isMerging: boolean
  isRebasing: boolean
  isCherryPicking: boolean
  onResolve: () => void
  onAbort: () => void
  onContinue: () => void
  hasConflicts?: boolean
}

export function MergeBanner({
  isMerging,
  isRebasing,
  isCherryPicking,
  onResolve,
  onAbort,
  onContinue,
  hasConflicts = false
}: MergeBannerProps) {
  if (!isMerging && !isRebasing && !isCherryPicking) return null

  const type = isMerging ? 'Merge' : isRebasing ? 'Rebase' : 'Cherry-pick'

  return (
    <div className="flex shrink-0 items-center justify-between gap-4 bg-primary-600 px-4 py-2 text-neutral-950 font-medium shadow-sm border-b border-black/10">
      <div className="flex items-center gap-2 text-neutral-950">
        <Icon name="git" size={16} />
        <span className="text-sm">
          <strong>{type} in progress.</strong> {hasConflicts ? 'There are conflicts that need to be resolved.' : 'All conflicts resolved!'}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={onAbort}
          className="px-3 py-1 text-xs font-bold rounded bg-neutral-950/10 hover:bg-neutral-950/20 transition-colors border border-black/10"
        >
          Abort {type}
        </button>
        {hasConflicts ? (
          <button
            onClick={onResolve}
            className="px-3 py-1 text-xs font-bold rounded bg-neutral-950 text-neutral-50 hover:bg-neutral-800 transition-colors shadow-sm"
          >
            Resolve Conflicts
          </button>
        ) : (
          <button
            onClick={onContinue}
            className="px-3 py-1 text-xs font-bold rounded bg-neutral-950 text-neutral-50 hover:bg-neutral-800 transition-colors shadow-sm"
          >
            Continue {type}
          </button>
        )}
      </div>
    </div>
  )
}
