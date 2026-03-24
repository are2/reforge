import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiffViewer } from './DiffViewer'
import type { FileDiff } from '../../../electron/shared/types'

// Mock Icon
vi.mock('./Icon', () => ({
  Icon: ({ name, size }: { name: string; size?: number }) => (
    <svg data-testid={`icon-${name}`} data-size={size} />
  ),
}))

function makeDiff(overrides: Partial<FileDiff> = {}): FileDiff {
  return {
    path: 'src/app.ts',
    hunks: [
      {
        header: '@@ -1,5 +1,6 @@',
        lines: [
          { type: 'context', content: 'import React from "react"', oldLineNo: 1, newLineNo: 1 },
          { type: 'remove', content: 'const x = 1', oldLineNo: 2 },
          { type: 'add', content: 'const x = 2', newLineNo: 2 },
          { type: 'add', content: 'const y = 3', newLineNo: 3 },
          { type: 'context', content: 'export default x', oldLineNo: 3, newLineNo: 4 },
        ],
      },
    ],
    ...overrides,
  }
}

describe('DiffViewer', () => {
  describe('loading state', () => {
    it('shows loading message', () => {
      render(<DiffViewer diff={null} loading />)
      expect(screen.getByText('Loading diff…')).toBeDefined()
    })

    it('does not render hunks while loading', () => {
      render(<DiffViewer diff={makeDiff()} loading />)
      expect(screen.getByText('Loading diff…')).toBeDefined()
      expect(screen.queryByText('@@ -1,5 +1,6 @@')).toBeNull()
    })
  })

  describe('empty state', () => {
    it('shows placeholder when diff is null', () => {
      render(<DiffViewer diff={null} />)
      expect(screen.getByText('Select a file to view changes')).toBeDefined()
    })
  })

  describe('binary files', () => {
    it('shows binary file indicator for generic binary', () => {
      const diff = makeDiff({
        isBinary: true,
        mimeType: 'application/octet-stream',
        size: 2048,
        hunks: [],
      })
      render(<DiffViewer diff={diff} />)
      expect(screen.getByText('Binary File')).toBeDefined()
      expect(screen.getByText('application/octet-stream')).toBeDefined()
      expect(screen.getByText('2.0 KB')).toBeDefined()
    })

    it('renders image preview for image binary with binaryContent', () => {
      const diff = makeDiff({
        isBinary: true,
        mimeType: 'image/png',
        size: 512,
        binaryContent: 'data:image/png;base64,AAAA',
        hunks: [],
      })
      render(<DiffViewer diff={diff} />)
      const img = document.querySelector('img') as HTMLImageElement
      expect(img).toBeDefined()
      expect(img.src).toContain('data:image/png;base64,AAAA')
      expect(img.alt).toBe('src/app.ts')
    })

    it('shows mime and size below image', () => {
      const diff = makeDiff({
        isBinary: true,
        mimeType: 'image/jpeg',
        size: 1048576,
        binaryContent: 'data:image/jpeg;base64,/9j/',
        hunks: [],
      })
      render(<DiffViewer diff={diff} />)
      expect(screen.getByText(/image\/jpeg/)).toBeDefined()
      expect(screen.getByText(/1\.00 MB/)).toBeDefined()
    })

    it('shows default binary file icon when no binaryContent for image', () => {
      const diff = makeDiff({
        isBinary: true,
        mimeType: 'image/svg+xml',
        hunks: [],
      })
      render(<DiffViewer diff={diff} />)
      // No binaryContent → falls through to binary indicator
      expect(screen.getByText('Binary File')).toBeDefined()
    })

    it('shows fallback mimeType for binary without mimeType', () => {
      const diff = makeDiff({
        isBinary: true,
        hunks: [],
      })
      render(<DiffViewer diff={diff} />)
      expect(screen.getByText('application/octet-stream')).toBeDefined()
    })
  })

  describe('no changes', () => {
    it('shows "No changes" for empty hunks', () => {
      render(<DiffViewer diff={makeDiff({ hunks: [] })} />)
      expect(screen.getByText('No changes in this file')).toBeDefined()
    })
  })

  describe('diff rendering', () => {
    it('renders hunk header', () => {
      render(<DiffViewer diff={makeDiff()} />)
      expect(screen.getByText('@@ -1,5 +1,6 @@')).toBeDefined()
    })

    it('renders context lines', () => {
      render(<DiffViewer diff={makeDiff()} />)
      expect(screen.getByText('import React from "react"')).toBeDefined()
      expect(screen.getByText('export default x')).toBeDefined()
    })

    it('renders added lines', () => {
      render(<DiffViewer diff={makeDiff()} />)
      expect(screen.getByText('const x = 2')).toBeDefined()
      expect(screen.getByText('const y = 3')).toBeDefined()
    })

    it('renders removed lines', () => {
      render(<DiffViewer diff={makeDiff()} />)
      expect(screen.getByText('const x = 1')).toBeDefined()
    })

    it('shows + indicator for added lines', () => {
      render(<DiffViewer diff={makeDiff()} />)
      const addIndicators = screen.getAllByText('+')
      expect(addIndicators.length).toBe(2)
    })

    it('shows - indicator for removed lines', () => {
      render(<DiffViewer diff={makeDiff()} />)
      const removeIndicators = screen.getAllByText('-')
      expect(removeIndicators.length).toBe(1)
    })

    it('applies green background class for added lines', () => {
      render(<DiffViewer diff={makeDiff()} />)
      const addedContent = screen.getByText('const x = 2')
      const row = addedContent.closest('.diff-add')
      expect(row).not.toBeNull()
    })

    it('applies red background class for removed lines', () => {
      render(<DiffViewer diff={makeDiff()} />)
      const removedContent = screen.getByText('const x = 1')
      const row = removedContent.closest('.diff-remove')
      expect(row).not.toBeNull()
    })

    it('renders line numbers for context lines', () => {
      render(<DiffViewer diff={makeDiff()} />)
      // First context line: oldLineNo=1, newLineNo=1
      const allOnes = screen.getAllByText('1')
      expect(allOnes.length).toBeGreaterThanOrEqual(2)
    })

    it('omits old line number for add lines', () => {
      render(<DiffViewer diff={makeDiff()} />)
      // 'const x = 2' is an add line with no oldLineNo
      const addedRow = screen.getByText('const x = 2').closest('.flex')!
      const spans = addedRow.querySelectorAll('span')
      // First span is oldLineNo — should be empty
      expect(spans[0].textContent).toBe('')
    })

    it('omits new line number for remove lines', () => {
      render(<DiffViewer diff={makeDiff()} />)
      const removedRow = screen.getByText('const x = 1').closest('.flex')!
      const spans = removedRow.querySelectorAll('span')
      // Second span is newLineNo — should be empty
      expect(spans[1].textContent).toBe('')
    })

    it('renders multiple hunks', () => {
      const diff = makeDiff({
        hunks: [
          {
            header: '@@ -1,3 +1,3 @@',
            lines: [
              { type: 'context', content: 'line 1', oldLineNo: 1, newLineNo: 1 },
            ],
          },
          {
            header: '@@ -10,3 +10,4 @@',
            lines: [
              { type: 'add', content: 'new line', newLineNo: 11 },
            ],
          },
        ],
      })
      render(<DiffViewer diff={diff} />)
      expect(screen.getByText('@@ -1,3 +1,3 @@')).toBeDefined()
      expect(screen.getByText('@@ -10,3 +10,4 @@')).toBeDefined()
      expect(screen.getByText('line 1')).toBeDefined()
      expect(screen.getByText('new line')).toBeDefined()
    })
  })

  describe('formatSize helper (via binary display)', () => {
    it('formats bytes', () => {
      render(<DiffViewer diff={makeDiff({ isBinary: true, size: 500, hunks: [] })} />)
      expect(screen.getByText('500 B')).toBeDefined()
    })

    it('formats kilobytes', () => {
      render(<DiffViewer diff={makeDiff({ isBinary: true, size: 2560, hunks: [] })} />)
      expect(screen.getByText('2.5 KB')).toBeDefined()
    })

    it('formats megabytes', () => {
      render(<DiffViewer diff={makeDiff({ isBinary: true, size: 5242880, hunks: [] })} />)
      expect(screen.getByText('5.00 MB')).toBeDefined()
    })

    it('shows "Unknown size" when size is undefined', () => {
      render(<DiffViewer diff={makeDiff({ isBinary: true, hunks: [] })} />)
      expect(screen.getByText('Unknown size')).toBeDefined()
    })
  })
})
