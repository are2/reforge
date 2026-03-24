import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileStatusBadge } from './FileStatusBadge'
import type { FileStatus } from '../../../electron/shared/types'

describe('FileStatusBadge', () => {
  const statuses: { status: FileStatus; label: string }[] = [
    { status: 'modified', label: 'M' },
    { status: 'added', label: 'A' },
    { status: 'deleted', label: 'D' },
    { status: 'renamed', label: 'R' },
    { status: 'untracked', label: 'U' },
    { status: 'copied', label: 'C' },
    { status: 'conflict', label: '!' },
  ]

  describe('label rendering', () => {
    statuses.forEach(({ status, label }) => {
      it(`renders "${label}" for ${status}`, () => {
        render(<FileStatusBadge status={status} />)
        expect(screen.getByText(label)).toBeDefined()
      })
    })
  })

  describe('CSS classes per status', () => {
    it('applies primary background for modified', () => {
      render(<FileStatusBadge status="modified" />)
      const el = screen.getByText('M')
      expect(el.className).toContain('bg-primary-500')
    })

    it('applies secondary background for added', () => {
      render(<FileStatusBadge status="added" />)
      const el = screen.getByText('A')
      expect(el.className).toContain('bg-secondary-500')
    })

    it('applies accent-red for deleted', () => {
      render(<FileStatusBadge status="deleted" />)
      const el = screen.getByText('D')
      expect(el.className).toContain('bg-accent-red')
    })

    it('applies accent-blue for renamed', () => {
      render(<FileStatusBadge status="renamed" />)
      const el = screen.getByText('R')
      expect(el.className).toContain('bg-accent-blue')
    })

    it('applies secondary-400 for untracked', () => {
      render(<FileStatusBadge status="untracked" />)
      const el = screen.getByText('U')
      expect(el.className).toContain('bg-secondary-400')
    })

    it('applies accent-violet for copied', () => {
      render(<FileStatusBadge status="copied" />)
      const el = screen.getByText('C')
      expect(el.className).toContain('bg-accent-violet')
    })

    it('applies accent-red for conflict', () => {
      render(<FileStatusBadge status="conflict" />)
      const el = screen.getByText('!')
      expect(el.className).toContain('bg-accent-red')
    })
  })

  describe('common classes', () => {
    it('renders as a span', () => {
      render(<FileStatusBadge status="modified" />)
      expect(screen.getByText('M').tagName).toBe('SPAN')
    })

    it('has sizing and rounding classes', () => {
      render(<FileStatusBadge status="modified" />)
      const el = screen.getByText('M')
      expect(el.className).toContain('h-4')
      expect(el.className).toContain('w-4')
      expect(el.className).toContain('rounded-sm')
      expect(el.className).toContain('font-bold')
    })
  })

  describe('isIgnored', () => {
    it('applies opacity and grayscale when ignored', () => {
      render(<FileStatusBadge status="modified" isIgnored />)
      const el = screen.getByText('M')
      expect(el.className).toContain('opacity-50')
      expect(el.className).toContain('grayscale')
    })

    it('shows gitignore title when ignored', () => {
      render(<FileStatusBadge status="added" isIgnored />)
      const el = screen.getByText('A')
      expect(el.title).toBe('This file is matched by .gitignore')
    })

    it('has no title when not ignored', () => {
      render(<FileStatusBadge status="added" />)
      const el = screen.getByText('A')
      expect(el.title).toBe('')
    })

    it('does not apply opacity when not ignored', () => {
      render(<FileStatusBadge status="deleted" />)
      const el = screen.getByText('D')
      expect(el.className).not.toContain('opacity-50')
      expect(el.className).not.toContain('grayscale')
    })
  })
})
