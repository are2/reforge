import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ActionToolbar } from './ActionToolbar'

// ── Mocks ─────────────────────────────────────────────────────

// Mock window.system.selectFolder used by the Clone browse button
Object.defineProperty(window, 'system', {
  value: { selectFolder: vi.fn().mockResolvedValue(null) },
  writable: true,
})

// ── Helpers ───────────────────────────────────────────────────

const defaultProps = {
  activeBranch: 'main',
  repoName: 'my-repo',
}

function asyncNoop() { return Promise.resolve() }

// ── Rendering ─────────────────────────────────────────────────

describe('ActionToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('renders the toolbar container', () => {
      render(<ActionToolbar {...defaultProps} />)
      expect(screen.getByTestId('action-toolbar')).toBeTruthy()
    })

    it('renders all expected toolbar buttons', () => {
      render(<ActionToolbar {...defaultProps} />)
      const expectedLabels = ['Open', 'Clone', 'Fetch', 'Pull', 'Push', 'Stash', 'Branch', 'Pull Request']
      for (const label of expectedLabels) {
        expect(screen.getByTestId(`toolbar-btn-${label}`)).toBeTruthy()
      }
    })

    it('renders button labels', () => {
      render(<ActionToolbar {...defaultProps} />)
      const labels = ['Open', 'Clone', 'Fetch', 'Pull', 'Push', 'Stash', 'Branch', 'Pull Request']
      for (const label of labels) {
        expect(screen.getByTestId(`toolbar-btn-label-${label}`).textContent).toBe(label)
      }
    })

    it('displays the repo name and branch in the center pill', () => {
      render(<ActionToolbar {...defaultProps} />)
      expect(screen.getByText('my-repo')).toBeTruthy()
      expect(screen.getByText('main')).toBeTruthy()
    })

    it('shows "no branch" when activeBranch is empty', () => {
      render(<ActionToolbar {...defaultProps} activeBranch="" />)
      expect(screen.getByText('no branch')).toBeTruthy()
    })

    it('does not render center pill when repoName is empty', () => {
      render(<ActionToolbar {...defaultProps} repoName="" />)
      expect(screen.queryByText('my-repo')).toBeNull()
    })
  })

  describe('Pull Request button', () => {
    it('is disabled when isPrSupported is false', () => {
      render(<ActionToolbar {...defaultProps} isPrSupported={false} />)
      const btn = screen.getByTestId('toolbar-btn-Pull Request')
      expect(btn.hasAttribute('disabled')).toBe(true)
    })

    it('is enabled when isPrSupported is true', () => {
      render(<ActionToolbar {...defaultProps} isPrSupported={true} />)
      const btn = screen.getByTestId('toolbar-btn-Pull Request')
      expect(btn.hasAttribute('disabled')).toBe(false)
    })
  })

  describe('button callbacks', () => {
    it('calls onOpen when Open is clicked', () => {
      const onOpen = vi.fn()
      render(<ActionToolbar {...defaultProps} onOpen={onOpen} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Open'))
      expect(onOpen).toHaveBeenCalledOnce()
    })

    it('calls onFetch when Fetch is clicked', () => {
      const onFetch = vi.fn()
      render(<ActionToolbar {...defaultProps} onFetch={onFetch} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Fetch'))
      expect(onFetch).toHaveBeenCalledOnce()
    })

    it('calls onOpenPullRequest when Pull Request is clicked', () => {
      const onPR = vi.fn()
      render(<ActionToolbar {...defaultProps} isPrSupported={true} onOpenPullRequest={onPR} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Pull Request'))
      expect(onPR).toHaveBeenCalledOnce()
    })
  })

  describe('Branch flyover', () => {
    it('opens the branch form when Branch is clicked', () => {
      render(<ActionToolbar {...defaultProps} onCreateBranch={asyncNoop} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Branch'))
      expect(screen.getByText('Create New Branch')).toBeTruthy()
      expect(screen.getByPlaceholderText('Branch name')).toBeTruthy()
    })

    it('has a disabled Create button when branch name is empty', () => {
      render(<ActionToolbar {...defaultProps} onCreateBranch={asyncNoop} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Branch'))
      const createBtn = screen.getByText('Create').closest('button')!
      expect(createBtn.hasAttribute('disabled')).toBe(true)
    })

    it('enables Create button when a valid branch name is entered', () => {
      render(<ActionToolbar {...defaultProps} onCreateBranch={asyncNoop} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Branch'))
      fireEvent.change(screen.getByPlaceholderText('Branch name'), { target: { value: 'feature/new' } })
      const createBtn = screen.getByText('Create').closest('button')!
      expect(createBtn.hasAttribute('disabled')).toBe(false)
    })

    it('calls onCreateBranch with the branch name on submit', async () => {
      const onCreateBranch = vi.fn().mockResolvedValue(undefined)
      render(<ActionToolbar {...defaultProps} onCreateBranch={onCreateBranch} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Branch'))
      fireEvent.change(screen.getByPlaceholderText('Branch name'), { target: { value: 'my-branch' } })
      fireEvent.click(screen.getByText('Create'))
      await waitFor(() => expect(onCreateBranch).toHaveBeenCalledWith('my-branch'))
    })

    it('closes the branch form on Cancel', () => {
      render(<ActionToolbar {...defaultProps} onCreateBranch={asyncNoop} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Branch'))
      expect(screen.getByText('Create New Branch')).toBeTruthy()
      fireEvent.click(screen.getByText('Cancel'))
      expect(screen.queryByText('Create New Branch')).toBeNull()
    })
  })

  describe('Push flyover', () => {
    it('opens the push form when Push is clicked', () => {
      render(<ActionToolbar {...defaultProps} onPush={asyncNoop} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Push'))
      expect(screen.getByText('Push to Origin')).toBeTruthy()
    })

    it('defaults push branch to activeBranch', () => {
      render(<ActionToolbar {...defaultProps} activeBranch="develop" onPush={asyncNoop} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Push'))
      const select = screen.getByDisplayValue('develop')
      expect(select).toBeTruthy()
    })

    it('has a force push checkbox', () => {
      render(<ActionToolbar {...defaultProps} onPush={asyncNoop} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Push'))
      expect(screen.getByText('Force push')).toBeTruthy()
    })

    it('calls onPush with branch and force flag', async () => {
      const onPush = vi.fn().mockResolvedValue(undefined)
      render(<ActionToolbar {...defaultProps} onPush={onPush} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Push'))
      // The flyover submit <span>Push</span> doesn't have data-testid; the toolbar label does
      const pushSpans = screen.getAllByText('Push')
      const submitSpan = pushSpans.find(el => !el.hasAttribute('data-testid'))!
      fireEvent.click(submitSpan.closest('button')!)
      await waitFor(() => expect(onPush).toHaveBeenCalledWith('main', false))
    })

    it('displays push errors', async () => {
      const onPush = vi.fn().mockRejectedValue(new Error('non-fast-forward'))
      render(<ActionToolbar {...defaultProps} onPush={onPush} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Push'))
      const pushSpans = screen.getAllByText('Push')
      const submitSpan = pushSpans.find(el => !el.hasAttribute('data-testid'))!
      fireEvent.click(submitSpan.closest('button')!)
      await waitFor(() => expect(screen.getByText('non-fast-forward')).toBeTruthy())
    })
  })

  describe('Pull flyover', () => {
    it('opens the pull form when Pull is clicked', () => {
      render(<ActionToolbar {...defaultProps} onPull={asyncNoop} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Pull'))
      expect(screen.getByText('Pull from Origin')).toBeTruthy()
    })

    it('has a rebase checkbox', () => {
      render(<ActionToolbar {...defaultProps} onPull={asyncNoop} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Pull'))
      expect(screen.getByText('Rebase instead of merge')).toBeTruthy()
    })

    it('calls onPull with branch and rebase flag', async () => {
      const onPull = vi.fn().mockResolvedValue(undefined)
      render(<ActionToolbar {...defaultProps} onPull={onPull} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Pull'))
      const pullSpans = screen.getAllByText('Pull')
      const submitSpan = pullSpans.find(el => !el.hasAttribute('data-testid'))!
      fireEvent.click(submitSpan.closest('button')!)
      await waitFor(() => expect(onPull).toHaveBeenCalledWith('main', false))
    })

    it('displays pull errors', async () => {
      const onPull = vi.fn().mockRejectedValue(new Error('merge conflict'))
      render(<ActionToolbar {...defaultProps} onPull={onPull} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Pull'))
      const pullSpans = screen.getAllByText('Pull')
      const submitSpan = pullSpans.find(el => !el.hasAttribute('data-testid'))!
      fireEvent.click(submitSpan.closest('button')!)
      await waitFor(() => expect(screen.getByText('merge conflict')).toBeTruthy())
    })
  })

  describe('Clone flyover', () => {
    it('opens the clone form when Clone is clicked', () => {
      render(<ActionToolbar {...defaultProps} onClone={asyncNoop} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Clone'))
      expect(screen.getByPlaceholderText('Git Repository Url')).toBeTruthy()
      expect(screen.getByText('Clone a remote repository into a local folder')).toBeTruthy()
    })

    it('auto-fills repo name from URL', () => {
      render(<ActionToolbar {...defaultProps} onClone={asyncNoop} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Clone'))
      fireEvent.change(screen.getByPlaceholderText('Git Repository Url'), {
        target: { value: 'https://github.com/user/my-project.git' },
      })
      expect(screen.getByDisplayValue('my-project')).toBeTruthy()
    })

    it('has a disabled Clone button when fields are empty', () => {
      render(<ActionToolbar {...defaultProps} onClone={asyncNoop} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Clone'))
      const cloneSpans = screen.getAllByText('Clone')
      // Find the span that is inside a <button> but doesn't have data-testid (the flyover submit)
      const submitSpan = cloneSpans.find(
        el => !el.hasAttribute('data-testid') && el.closest('button')?.contains(el) && el.tagName === 'SPAN'
      )!
      expect(submitSpan.closest('button')!.hasAttribute('disabled')).toBe(true)
    })
  })

  describe('Stash flyover', () => {
    it('opens the stash form when Stash is clicked', () => {
      render(<ActionToolbar {...defaultProps} onStashPush={asyncNoop} />)
      fireEvent.click(screen.getByTestId('toolbar-btn-Stash'))
      expect(screen.getByText('Save stash')).toBeTruthy()
    })
  })

  describe('Error display', () => {
    it('shows error count when errors are present', () => {
      const errors = [
        { id: '1', message: 'Something broke', timestamp: Date.now() },
        { id: '2', message: 'Another error', timestamp: Date.now() },
      ]
      render(<ActionToolbar {...defaultProps} errors={errors} />)
      expect(screen.getByText('Errors (2)')).toBeTruthy()
    })

    it('does not show error button when no errors', () => {
      render(<ActionToolbar {...defaultProps} errors={[]} />)
      expect(screen.queryByText(/Errors/)).toBeNull()
    })

    it('opens error flyover when error button is clicked', () => {
      const errors = [{ id: '1', message: 'Git failed', timestamp: Date.now() }]
      render(<ActionToolbar {...defaultProps} errors={errors} />)
      fireEvent.click(screen.getByText('Errors (1)'))
      expect(screen.getByText('Git Errors')).toBeTruthy()
      expect(screen.getByText('Git failed')).toBeTruthy()
    })

    it('calls onClearErrors when Clear All is clicked', () => {
      const onClear = vi.fn()
      const errors = [{ id: '1', message: 'err', timestamp: Date.now() }]
      render(<ActionToolbar {...defaultProps} errors={errors} onClearErrors={onClear} />)
      fireEvent.click(screen.getByText('Errors (1)'))
      fireEvent.click(screen.getByText('Clear All'))
      expect(onClear).toHaveBeenCalledOnce()
    })
  })

  describe('busy / activity spinner', () => {
    it('shows Working spinner when busy is true', () => {
      render(<ActionToolbar {...defaultProps} busy={true} />)
      expect(screen.getByText('Working…')).toBeTruthy()
    })

    it('does not show Working spinner when busy is false', () => {
      render(<ActionToolbar {...defaultProps} busy={false} />)
      expect(screen.queryByText('Working…')).toBeNull()
    })
  })

  describe('branches dropdown', () => {
    it('populates branch select in push form', () => {
      render(
        <ActionToolbar
          {...defaultProps}
          branches={['main', 'develop', 'feature/x']}
          onPush={asyncNoop}
        />
      )
      fireEvent.click(screen.getByTestId('toolbar-btn-Push'))
      const options = screen.getAllByRole('option')
      expect(options.map(o => o.textContent)).toEqual(['main', 'develop', 'feature/x'])
    })
  })
})
