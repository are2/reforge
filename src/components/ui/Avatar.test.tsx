import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  describe('initials rendering', () => {
    it('renders the provided initials', () => {
      render(<Avatar initials="AB" />)
      expect(screen.getByText('AB')).toBeDefined()
    })

    it('renders single-letter initials', () => {
      render(<Avatar initials="X" />)
      expect(screen.getByText('X')).toBeDefined()
    })
  })

  describe('variant', () => {
    it('defaults to primary variant', () => {
      render(<Avatar initials="PR" />)
      const el = screen.getByText('PR')
      expect(el.className).toContain('bg-primary-400')
      expect(el.className).toContain('text-primary-900')
    })

    it('applies primary variant classes explicitly', () => {
      render(<Avatar initials="PR" variant="primary" />)
      const el = screen.getByText('PR')
      expect(el.className).toContain('bg-primary-400')
    })

    it('applies secondary variant classes', () => {
      render(<Avatar initials="SC" variant="secondary" />)
      const el = screen.getByText('SC')
      expect(el.className).toContain('bg-secondary-400')
      expect(el.className).toContain('text-secondary-900')
    })
  })

  describe('size', () => {
    it('defaults to md size', () => {
      render(<Avatar initials="MD" />)
      const el = screen.getByText('MD')
      expect(el.className).toContain('h-8')
      expect(el.className).toContain('w-8')
      expect(el.className).toContain('text-xs')
    })

    it('applies sm size classes', () => {
      render(<Avatar initials="SM" size="sm" />)
      const el = screen.getByText('SM')
      expect(el.className).toContain('h-6')
      expect(el.className).toContain('w-6')
    })

    it('applies md size classes explicitly', () => {
      render(<Avatar initials="MD" size="md" />)
      const el = screen.getByText('MD')
      expect(el.className).toContain('h-8')
      expect(el.className).toContain('w-8')
    })
  })

  describe('common classes', () => {
    it('renders as a span element', () => {
      render(<Avatar initials="SP" />)
      const el = screen.getByText('SP')
      expect(el.tagName).toBe('SPAN')
    })

    it('has rounded, font-semibold, select-none classes', () => {
      render(<Avatar initials="CL" />)
      const el = screen.getByText('CL')
      expect(el.className).toContain('rounded')
      expect(el.className).toContain('font-semibold')
      expect(el.className).toContain('select-none')
    })

    it('is inline-flex centered', () => {
      render(<Avatar initials="IF" />)
      const el = screen.getByText('IF')
      expect(el.className).toContain('inline-flex')
      expect(el.className).toContain('items-center')
      expect(el.className).toContain('justify-center')
    })
  })
})
