import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DetailsPane } from './DetailsPane'
import type { GitCommit, FileDiff } from '../../../electron/shared/types'

// ── Mock child components that have heavy dependencies ─────────
vi.mock('./CommitChangesView', () => ({
  CommitChangesView: (props: any) => (
    <div data-testid="commit-changes-view">
      CommitChangesView: {props.commit?.shortHash}
      {props.selectedPath && <span data-testid="selected-path">{props.selectedPath}</span>}
    </div>
  ),
}))

vi.mock('./FileTreeView', () => ({
  FileTreeView: () => <div data-testid="file-tree-view">FileTreeView</div>,
}))

vi.mock('./FileContentView', () => ({
  FileContentView: () => <div data-testid="file-content-view">FileContentView</div>,
}))

// Mock window.git for FileTreeTabContent
Object.defineProperty(window, 'git', {
  value: {
    getFileTree: vi.fn().mockResolvedValue([]),
    getFileContent: vi.fn().mockResolvedValue({ path: 'test.ts', content: '', isBinary: false, mimeType: 'text/plain', size: 0 }),
  },
  writable: true,
})

// ── Helpers ───────────────────────────────────────────────────

function makeCommit(overrides: Partial<GitCommit> = {}): GitCommit {
  return {
    hash: 'abc123def456abc123def456abc123def456abc1',
    shortHash: 'abc123d',
    subject: 'Fix the thing',
    body: ['This fixes a critical bug.', 'Reviewed by someone.'],
    author: { name: 'Alice', email: 'alice@example.com', initials: 'AL' },
    committer: { name: 'Bob', email: 'bob@example.com', initials: 'BO' },
    authorDate: '2025-06-15 10:30',
    commitDate: '2025-06-15 11:00',
    refs: [
      { name: 'main', type: 'local' },
      { name: 'v1.0', type: 'tag' },
    ],
    parents: ['def456a', 'fed789b'],
    files: [
      { path: 'src/index.ts', status: 'modified' },
      { path: 'src/new.ts', status: 'added' },
      { path: 'old.ts', status: 'deleted' },
    ],
    ...overrides,
  }
}

const defaultProps = {
  repoPath: '/test/repo',
  selectedCommit: null as GitCommit | null,
  selectedDiff: null as FileDiff | null,
  onSelectFile: vi.fn(),
}

// ── Tests ─────────────────────────────────────────────────────

describe('DetailsPane', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('tab navigation', () => {
    it('renders all three tabs: Commit, Changes, File Tree', () => {
      render(<DetailsPane {...defaultProps} />)
      expect(screen.getByText('Commit')).toBeTruthy()
      expect(screen.getByText('Changes')).toBeTruthy()
      expect(screen.getByText('File Tree')).toBeTruthy()
    })

    it('defaults to the Commit tab', () => {
      const commit = makeCommit()
      render(<DetailsPane {...defaultProps} selectedCommit={commit} />)
      // Subject should be visible in the Commit detail tab
      expect(screen.getByText('Fix the thing')).toBeTruthy()
    })

    it('switches to Changes tab on click', () => {
      const commit = makeCommit()
      render(<DetailsPane {...defaultProps} selectedCommit={commit} />)
      fireEvent.click(screen.getByText('Changes'))
      expect(screen.getByTestId('commit-changes-view')).toBeTruthy()
    })

    it('switches to File Tree tab on click', () => {
      const commit = makeCommit()
      render(<DetailsPane {...defaultProps} selectedCommit={commit} />)
      fireEvent.click(screen.getByText('File Tree'))
      // FileTreeTabContent attempts to load tree
      expect(screen.getByText('Loading file tree…')).toBeTruthy()
    })
  })

  describe('empty state (no commit selected)', () => {
    it('shows placeholder when no commit is selected on Commit tab', () => {
      render(<DetailsPane {...defaultProps} />)
      expect(screen.getByText('Select a commit to view details')).toBeTruthy()
    })

    it('shows placeholder when no commit is selected on Changes tab', () => {
      render(<DetailsPane {...defaultProps} />)
      fireEvent.click(screen.getByText('Changes'))
      expect(screen.getByText('Select a commit to view changes')).toBeTruthy()
    })

    it('shows placeholder when no commit is selected on File Tree tab', () => {
      render(<DetailsPane {...defaultProps} />)
      fireEvent.click(screen.getByText('File Tree'))
      expect(screen.getByText('Select a commit to view the file tree')).toBeTruthy()
    })
  })

  describe('loading state', () => {
    it('shows Loading… text when detailLoading is true', () => {
      render(<DetailsPane {...defaultProps} detailLoading={true} />)
      expect(screen.getByText('Loading…')).toBeTruthy()
    })

    it('shows skeleton when loading and no commit', () => {
      const { container } = render(<DetailsPane {...defaultProps} detailLoading={true} />)
      // Skeleton elements should be present
      const skeletons = container.querySelectorAll('.skeleton')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('CommitDetail content', () => {
    it('displays the commit subject', () => {
      render(<DetailsPane {...defaultProps} selectedCommit={makeCommit()} />)
      expect(screen.getByText('Fix the thing')).toBeTruthy()
    })

    it('displays commit body lines', () => {
      render(<DetailsPane {...defaultProps} selectedCommit={makeCommit()} />)
      expect(screen.getByText('This fixes a critical bug.')).toBeTruthy()
      expect(screen.getByText('Reviewed by someone.')).toBeTruthy()
    })

    it('displays author info', () => {
      render(<DetailsPane {...defaultProps} selectedCommit={makeCommit()} />)
      expect(screen.getByText('Alice')).toBeTruthy()
      expect(screen.getByText(/<alice@example.com>/i)).toBeTruthy()
    })

    it('displays committer when different from author', () => {
      render(<DetailsPane {...defaultProps} selectedCommit={makeCommit()} />)
      expect(screen.getByText('Bob')).toBeTruthy()
    })

    it('does not display committer block when author and committer are the same', () => {
      const commit = makeCommit({
        committer: { name: 'Alice', email: 'alice@example.com', initials: 'AL' },
        commitDate: '2025-06-15 10:30',
      })
      render(<DetailsPane {...defaultProps} selectedCommit={commit} />)
      // Only one "Author" label, no "Committer"
      expect(screen.getByText('Author')).toBeTruthy()
      expect(screen.queryByText('Committer')).toBeNull()
    })

    it('displays the full SHA hash', () => {
      const commit = makeCommit()
      render(<DetailsPane {...defaultProps} selectedCommit={commit} />)
      expect(screen.getByText(commit.hash)).toBeTruthy()
    })

    it('displays parent short hashes', () => {
      render(<DetailsPane {...defaultProps} selectedCommit={makeCommit()} />)
      expect(screen.getByText('def456a')).toBeTruthy()
      expect(screen.getByText('fed789b')).toBeTruthy()
    })

    it('displays refs as branch chips', () => {
      render(<DetailsPane {...defaultProps} selectedCommit={makeCommit()} />)
      expect(screen.getByText('main')).toBeTruthy()
      expect(screen.getByText('v1.0')).toBeTruthy()
    })

    it('displays the changed files count', () => {
      render(<DetailsPane {...defaultProps} selectedCommit={makeCommit()} />)
      expect(screen.getByText('(3)')).toBeTruthy()
    })

    it('lists changed file paths', () => {
      render(<DetailsPane {...defaultProps} selectedCommit={makeCommit()} />)
      expect(screen.getByText('src/index.ts')).toBeTruthy()
      expect(screen.getByText('src/new.ts')).toBeTruthy()
      expect(screen.getByText('old.ts')).toBeTruthy()
    })
  })

  describe('file navigation from commit detail', () => {
    it('clicking a file navigates to Changes tab and calls onSelectFile', () => {
      const onSelectFile = vi.fn()
      const commit = makeCommit()
      render(<DetailsPane {...defaultProps} selectedCommit={commit} onSelectFile={onSelectFile} />)
      fireEvent.click(screen.getByText('src/index.ts'))
      // Should switch to Changes tab
      expect(screen.getByTestId('commit-changes-view')).toBeTruthy()
      expect(onSelectFile).toHaveBeenCalledWith('src/index.ts', commit.hash)
    })
  })

  describe('commit with no body', () => {
    it('renders without body paragraphs when body is empty', () => {
      const commit = makeCommit({ body: [] })
      render(<DetailsPane {...defaultProps} selectedCommit={commit} />)
      expect(screen.getByText('Fix the thing')).toBeTruthy()
    })
  })

  describe('commit with no refs', () => {
    it('does not render Refs section when refs are empty', () => {
      const commit = makeCommit({ refs: [] })
      render(<DetailsPane {...defaultProps} selectedCommit={commit} />)
      expect(screen.queryByText('Refs')).toBeNull()
    })
  })

  describe('commit with no parents (root)', () => {
    it('does not render Parents section', () => {
      const commit = makeCommit({ parents: [] })
      render(<DetailsPane {...defaultProps} selectedCommit={commit} />)
      expect(screen.queryByText('Parents')).toBeNull()
    })
  })

  describe('changed files toggle', () => {
    it('collapses the file list when "Changed files" is clicked', () => {
      render(<DetailsPane {...defaultProps} selectedCommit={makeCommit()} />)
      expect(screen.getByText('src/index.ts')).toBeTruthy()
      // Click to collapse
      fireEvent.click(screen.getByText('Changed files'))
      expect(screen.queryByText('src/index.ts')).toBeNull()
    })

    it('re-expands the file list when clicked again', () => {
      render(<DetailsPane {...defaultProps} selectedCommit={makeCommit()} />)
      fireEvent.click(screen.getByText('Changed files'))
      expect(screen.queryByText('src/index.ts')).toBeNull()
      fireEvent.click(screen.getByText('Changed files'))
      expect(screen.getByText('src/index.ts')).toBeTruthy()
    })
  })
})
