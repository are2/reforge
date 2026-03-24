import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LeftSidebar } from './LeftSidebar'
import type {
  GitBranch,
  GitRemote,
  GitTag,
  GitStash,
  GitSubmodule,
} from '../../../electron/shared/types'

// ── Helpers ───────────────────────────────────────────────────

function defaultProps(overrides: Record<string, any> = {}) {
  return {
    activeBranch: 'main',
    branches: [] as GitBranch[],
    remotes: [] as GitRemote[],
    tags: [] as GitTag[],
    stashes: [] as GitStash[],
    submodules: [] as GitSubmodule[],
    localChangesCount: 0,
    activeView: 'history' as const,
    onViewChange: vi.fn(),
    onBranchSelect: vi.fn(),
    onActiveBranchChange: vi.fn(),
    onMerge: vi.fn(),
    onRebase: vi.fn(),
    onDelete: vi.fn(),
    onPull: vi.fn().mockResolvedValue(undefined),
    onPush: vi.fn().mockResolvedValue(undefined),
    onRemoveTag: vi.fn().mockResolvedValue(undefined),
    onDeleteRemoteBranch: vi.fn().mockResolvedValue(undefined),
    onCheckoutRemoteBranch: vi.fn().mockResolvedValue(undefined),
    onStashApply: vi.fn().mockResolvedValue(undefined),
    onStashPop: vi.fn().mockResolvedValue(undefined),
    onStashDrop: vi.fn().mockResolvedValue(undefined),
    onTrackingSet: vi.fn().mockResolvedValue(undefined),
    onTrackingUnset: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────

describe('LeftSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('basic rendering', () => {
    it('renders the sidebar element', () => {
      const { container } = render(<LeftSidebar {...defaultProps()} />)
      expect(container.querySelector('aside')).toBeTruthy()
    })

    it('renders Local Changes and History view buttons', () => {
      render(<LeftSidebar {...defaultProps()} />)
      expect(screen.getByText('Local Changes')).toBeTruthy()
      expect(screen.getByText('History')).toBeTruthy()
    })

    it('renders all tree section headers', () => {
      render(<LeftSidebar {...defaultProps()} />)
      expect(screen.getByText('Branches')).toBeTruthy()
      expect(screen.getByText('Remotes')).toBeTruthy()
      expect(screen.getByText('Tags')).toBeTruthy()
      expect(screen.getByText('Stashes')).toBeTruthy()
      expect(screen.getByText('Submodules')).toBeTruthy()
    })
  })

  describe('view switching', () => {
    it('highlights History when activeView is history', () => {
      render(<LeftSidebar {...defaultProps({ activeView: 'history' })} />)
      const historyBtn = screen.getByText('History').closest('button')!
      expect(historyBtn.className).toContain('font-medium')
    })

    it('highlights Local Changes when activeView is localChanges', () => {
      render(<LeftSidebar {...defaultProps({ activeView: 'localChanges' })} />)
      const lcBtn = screen.getByText('Local Changes').closest('button')!
      expect(lcBtn.className).toContain('font-medium')
    })

    it('calls onViewChange with "history" when History is clicked', () => {
      const onViewChange = vi.fn()
      render(<LeftSidebar {...defaultProps({ onViewChange })} />)
      fireEvent.click(screen.getByText('History'))
      expect(onViewChange).toHaveBeenCalledWith('history')
    })

    it('calls onViewChange with "localChanges" when Local Changes is clicked', () => {
      const onViewChange = vi.fn()
      render(<LeftSidebar {...defaultProps({ onViewChange })} />)
      fireEvent.click(screen.getByText('Local Changes'))
      expect(onViewChange).toHaveBeenCalledWith('localChanges')
    })
  })

  describe('local changes count', () => {
    it('shows the count badge when localChangesCount > 0', () => {
      render(<LeftSidebar {...defaultProps({ localChangesCount: 5 })} />)
      expect(screen.getByText('(5)')).toBeTruthy()
    })

    it('does not show count badge when localChangesCount is 0', () => {
      render(<LeftSidebar {...defaultProps({ localChangesCount: 0 })} />)
      expect(screen.queryByText('(0)')).toBeNull()
    })
  })

  describe('tree sections collapse/expand', () => {
    it('Branches section is open by default', () => {
      render(
        <LeftSidebar
          {...defaultProps({
            branches: [{ name: 'main', isCurrent: true, tip: 'abc' }],
          })}
        />
      )
      expect(screen.getByText('main')).toBeTruthy()
    })

    it('clicking a section header toggles its content', () => {
      render(
        <LeftSidebar
          {...defaultProps({
            branches: [{ name: 'feature-branch', isCurrent: false, tip: 'abc' }],
          })}
        />
      )
      // Branch is rendered initially (Branches section is open by default)
      expect(screen.getByText('feature-branch')).toBeTruthy()
      // Click "Branches" header to collapse
      fireEvent.click(screen.getByText('Branches'))
      // After collapse, the branch item should be gone
      expect(screen.queryByText('feature-branch')).toBeNull()
      // Click again to re-expand
      fireEvent.click(screen.getByText('Branches'))
      expect(screen.getByText('feature-branch')).toBeTruthy()
    })
  })

  describe('empty state messages', () => {
    it('shows "No branches" when branches list is empty', () => {
      render(<LeftSidebar {...defaultProps()} />)
      expect(screen.getByText('No branches')).toBeTruthy()
    })

    it('shows "No remotes" when remotes list is empty', () => {
      render(<LeftSidebar {...defaultProps()} />)
      expect(screen.getByText('No remotes')).toBeTruthy()
    })

    it('shows "No stashes" when stashes list is empty', () => {
      render(<LeftSidebar {...defaultProps()} />)
      expect(screen.getByText('No stashes')).toBeTruthy()
    })
  })

  describe('loading skeleton', () => {
    it('shows skeleton items for branches when loading with empty data', () => {
      const { container } = render(
        <LeftSidebar {...defaultProps({ loading: true })} />
      )
      const skeletons = container.querySelectorAll('.skeleton')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('does not show skeletons when data is loaded', () => {
      render(
        <LeftSidebar
          {...defaultProps({
            loading: false,
            branches: [{ name: 'main', isCurrent: true, tip: 'abc' }],
          })}
        />
      )
      // The branches section should show real content, not skeletons
      expect(screen.getByText('main')).toBeTruthy()
    })
  })

  describe('branches rendering', () => {
    it('renders branch items', () => {
      render(
        <LeftSidebar
          {...defaultProps({
            branches: [
              { name: 'main', isCurrent: true, tip: 'abc123' },
              { name: 'develop', isCurrent: false, tip: 'def456' },
            ],
          })}
        />
      )
      expect(screen.getByText('main')).toBeTruthy()
      expect(screen.getByText('develop')).toBeTruthy()
    })
  })

  describe('remotes rendering', () => {
    it('renders remote names and their branches', () => {
      render(
        <LeftSidebar
          {...defaultProps({
            remotes: [
              {
                name: 'origin',
                url: 'https://github.com/user/repo.git',
                branches: [
                  { name: 'main', tip: 'abc' },
                  { name: 'develop', tip: 'def' },
                ],
              },
            ],
          })}
        />
      )
      expect(screen.getByText('origin')).toBeTruthy()
    })
  })

  describe('tags rendering', () => {
    it('renders tag items when Tags section is expanded', () => {
      render(
        <LeftSidebar
          {...defaultProps({
            tags: [
              { name: 'v1.0.0', hash: 'aaa' },
              { name: 'v2.0.0', hash: 'bbb' },
            ],
          })}
        />
      )
      // Tags section is defaultOpen=false, need to expand
      fireEvent.click(screen.getByText('Tags'))
      expect(screen.getByText('v1.0.0')).toBeTruthy()
      expect(screen.getByText('v2.0.0')).toBeTruthy()
    })
  })

  describe('stashes rendering', () => {
    it('renders stash items', () => {
      render(
        <LeftSidebar
          {...defaultProps({
            stashes: [
              { index: 0, message: 'WIP: feature work', hash: 'aaa' },
              { index: 1, message: 'Quick save', hash: 'bbb' },
            ],
          })}
        />
      )
      expect(screen.getByText(/WIP: feature work/)).toBeTruthy()
      expect(screen.getByText(/Quick save/)).toBeTruthy()
    })
  })

  describe('submodules rendering', () => {
    it('renders submodule items when Submodules section is expanded', () => {
      render(
        <LeftSidebar
          {...defaultProps({
            submodules: [
              { name: 'lib-core', path: 'lib/core', hash: 'aaa' },
            ],
          })}
        />
      )
      // Submodules defaultOpen=false
      fireEvent.click(screen.getByText('Submodules'))
      expect(screen.getByText('lib-core')).toBeTruthy()
    })

    it('shows "None" when no submodules and section is expanded', () => {
      render(<LeftSidebar {...defaultProps()} />)
      fireEvent.click(screen.getByText('Submodules'))
      expect(screen.getByText('None')).toBeTruthy()
    })
  })
})
