import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BranchChip } from './BranchChip'

// Mock Icon so we can detect when it's rendered
vi.mock('./Icon', () => ({
  Icon: ({ name, size }: { name: string; size?: number }) => (
    <svg data-testid={`icon-${name}`} data-size={size} />
  ),
}))

describe('BranchChip', () => {
  describe('name rendering', () => {
    it('renders the branch name', () => {
      render(<BranchChip name="main" />)
      expect(screen.getByText('main')).toBeDefined()
    })

    it('renders long branch names', () => {
      render(<BranchChip name="feature/very-long-branch-name-here" />)
      expect(screen.getByText('feature/very-long-branch-name-here')).toBeDefined()
    })

    it('renders as a span element', () => {
      render(<BranchChip name="dev" />)
      const el = screen.getByText('dev').closest('span')!
      expect(el.tagName).toBe('SPAN')
    })

    it('has truncate and max-w-48 classes', () => {
      render(<BranchChip name="main" />)
      const chip = screen.getByText('main').closest('span[class*="truncate"]')!
      expect(chip.className).toContain('truncate')
      expect(chip.className).toContain('max-w-48')
    })
  })

  describe('type defaults and icons', () => {
    it('defaults to local type (no icon)', () => {
      render(<BranchChip name="main" />)
      expect(screen.queryByTestId('icon-tag')).toBeNull()
      expect(screen.queryByTestId('icon-stash')).toBeNull()
    })

    it('shows primary background for local type', () => {
      render(<BranchChip name="main" type="local" />)
      const chip = screen.getByText('main').closest('span[class*="rounded"]')!
      expect(chip.className).toContain('bg-primary-100')
      expect(chip.className).toContain('text-primary-800')
    })

    it('shows cloud emoji for remote type', () => {
      render(<BranchChip name="origin/main" type="remote" />)
      expect(screen.getByText('☁')).toBeDefined()
    })

    it('applies remote border classes without custom color', () => {
      render(<BranchChip name="origin/main" type="remote" />)
      const chip = screen.getByText('origin/main').closest('span[class*="rounded"]')!
      expect(chip.className).toContain('border')
      expect(chip.className).toContain('text-accent-blue')
    })

    it('renders Icon for tag type', () => {
      render(<BranchChip name="v1.0.0" type="tag" />)
      expect(screen.getByTestId('icon-tag')).toBeDefined()
    })

    it('applies tag colors', () => {
      render(<BranchChip name="v1.0.0" type="tag" />)
      const chip = screen.getByText('v1.0.0').closest('span[class*="rounded"]')!
      expect(chip.className).toContain('bg-violet-100')
      expect(chip.className).toContain('text-violet-800')
    })

    it('renders Icon for stash type', () => {
      render(<BranchChip name="stash@{0}" type="stash" />)
      expect(screen.getByTestId('icon-stash')).toBeDefined()
    })

    it('applies stash colors', () => {
      render(<BranchChip name="stash@{0}" type="stash" />)
      const chip = screen.getByText('stash@{0}').closest('span[class*="rounded"]')!
      expect(chip.className).toContain('bg-amber-100')
      expect(chip.className).toContain('text-amber-800')
    })
  })

  describe('custom color', () => {
    it('sets backgroundColor for local type with color', () => {
      render(<BranchChip name="main" type="local" color="#e06080" />)
      const chip = screen.getByText('main').closest('span[class*="rounded"]')! as HTMLElement
      expect(chip.style.backgroundColor).toBe('rgb(224, 96, 128)')
      expect(chip.className).toContain('text-white')
    })

    it('sets border color for remote type with color', () => {
      render(<BranchChip name="origin/main" type="remote" color="#50b0e0" />)
      const chip = screen.getByText('origin/main').closest('span[class*="rounded"]')! as HTMLElement
      // jsdom normalizes hex to rgb
      expect(chip.style.borderColor).toBe('rgb(80, 176, 224)')
      expect(chip.style.color).toBe('rgb(80, 176, 224)')
    })

    it('does not set background for tag type with color (uses class colors)', () => {
      render(<BranchChip name="v1" type="tag" color="#ff0000" />)
      const chip = screen.getByText('v1').closest('span[class*="rounded"]')! as HTMLElement
      expect(chip.style.backgroundColor).toBe('')
    })
  })

  describe('onContextMenu', () => {
    it('fires onContextMenu callback on right-click', () => {
      const handler = vi.fn()
      render(<BranchChip name="main" onContextMenu={handler} />)
      const chip = screen.getByText('main').closest('span[class*="rounded"]')!
      fireEvent.contextMenu(chip)
      expect(handler).toHaveBeenCalledOnce()
    })

    it('does not error without onContextMenu', () => {
      render(<BranchChip name="main" />)
      const chip = screen.getByText('main').closest('span[class*="rounded"]')!
      expect(() => fireEvent.contextMenu(chip)).not.toThrow()
    })
  })
})
