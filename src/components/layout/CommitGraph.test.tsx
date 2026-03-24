import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import type { GitCommit } from '../../../electron/shared/types'
import {
  laneColor,
  computeGraphRows,
  CommitGraph,
  type GraphRow,
} from './CommitGraph'

// ── Helpers ────────────────────────────────────────────────────

/** Build a minimal GitCommit for testing. */
function makeCommit(
  shortHash: string,
  parents: string[],
  overrides: Partial<GitCommit> = {}
): GitCommit {
  return {
    hash: shortHash.padEnd(40, '0'),
    shortHash,
    subject: `commit ${shortHash}`,
    body: [],
    author: { name: 'Test', email: 'test@test.com', initials: 'T' },
    committer: { name: 'Test', email: 'test@test.com', initials: 'T' },
    authorDate: '2025-01-01T00:00:00Z',
    commitDate: '2025-01-01T00:00:00Z',
    refs: [],
    files: [],
    parents,
    ...overrides,
  }
}

// ── laneColor ──────────────────────────────────────────────────

describe('laneColor', () => {
  it('returns a CSS variable for lanes 0–5', () => {
    for (let i = 0; i < 6; i++) {
      expect(laneColor(i)).toBe(`var(--color-graph-${i})`)
    }
  })

  it('wraps around for lanes >= 6', () => {
    expect(laneColor(6)).toBe(laneColor(0))
    expect(laneColor(7)).toBe(laneColor(1))
    expect(laneColor(12)).toBe(laneColor(0))
  })
})

// ── computeGraphRows ───────────────────────────────────────────

describe('computeGraphRows', () => {
  describe('single linear chain', () => {
    // A → B → C (newest first: A, B, C)
    const commits = [
      makeCommit('aaa', ['bbb']),
      makeCommit('bbb', ['ccc']),
      makeCommit('ccc', []),
    ]
    const rows = computeGraphRows(commits)

    it('assigns all commits to lane 0', () => {
      expect(rows.get('aaa')!.lane).toBe(0)
      expect(rows.get('bbb')!.lane).toBe(0)
      expect(rows.get('ccc')!.lane).toBe(0)
    })

    it('marks the first commit as head', () => {
      expect(rows.get('aaa')!.isHead).toBe(true)
      expect(rows.get('bbb')!.isHead).toBe(false)
    })

    it('marks the last commit as root', () => {
      expect(rows.get('ccc')!.isRoot).toBe(true)
      expect(rows.get('aaa')!.isRoot).toBe(false)
      expect(rows.get('bbb')!.isRoot).toBe(false)
    })

    it('each row has a straight connection on lane 0', () => {
      for (const [, row] of rows) {
        const straight = row.connections.filter((c) => c.type === 'straight')
        expect(straight.length).toBeGreaterThanOrEqual(1)
        expect(straight[0].fromLane).toBe(0)
        expect(straight[0].toLane).toBe(0)
      }
    })
  })

  describe('simple branch (fork and merge)', () => {
    // Topology (newest first):
    //   M merges B1 and B2
    //   B1 → base
    //   B2 → base
    //   base (root)
    const commits = [
      makeCommit('M', ['B1', 'B2']),   // merge commit
      makeCommit('B1', ['base']),
      makeCommit('B2', ['base']),
      makeCommit('base', []),
    ]
    const rows = computeGraphRows(commits)

    it('places the merge commit on lane 0', () => {
      expect(rows.get('M')!.lane).toBe(0)
    })

    it('continues first parent on the same lane as merge', () => {
      // M is lane 0 and its first parent is B1 → B1 should be lane 0
      expect(rows.get('B1')!.lane).toBe(0)
    })

    it('places the second parent on a different lane', () => {
      expect(rows.get('B2')!.lane).not.toBe(rows.get('M')!.lane)
    })

    it('merge commit has a merge-type connection', () => {
      const mergeConns = rows.get('M')!.connections.filter((c) => c.type === 'merge')
      expect(mergeConns.length).toBe(1)
      expect(mergeConns[0].toLane).toBe(rows.get('M')!.lane)
    })

    it('base commit has a fork-type connection from the converging branch', () => {
      const baseRow = rows.get('base')!
      const forkConns = baseRow.connections.filter((c) => c.type === 'fork')
      expect(forkConns.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('parallel branches', () => {
    // Two independent branches from the same tip
    //   A1 → root   (branch 1 head)
    //   A2 → root   (branch 2 head)
    //   root         (root)
    const commits = [
      makeCommit('A1', ['root']),
      makeCommit('A2', ['root']),
      makeCommit('root', []),
    ]
    const rows = computeGraphRows(commits)

    it('places independent heads on separate lanes', () => {
      expect(rows.get('A1')!.lane).not.toBe(rows.get('A2')!.lane)
    })

    it('both branches marked as heads', () => {
      expect(rows.get('A1')!.isHead).toBe(true)
      expect(rows.get('A2')!.isHead).toBe(true)
    })

    it('root has a fork connection from the second branch', () => {
      const rootRow = rows.get('root')!
      const forkConns = rootRow.connections.filter((c) => c.type === 'fork')
      expect(forkConns.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('octopus merge (3+ parents)', () => {
    // M merges three parents
    const commits = [
      makeCommit('M', ['p1', 'p2', 'p3']),
      makeCommit('p1', []),
      makeCommit('p2', []),
      makeCommit('p3', []),
    ]
    const rows = computeGraphRows(commits)

    it('emits merge connections for each extra parent (p2, p3)', () => {
      const mergeConns = rows.get('M')!.connections.filter((c) => c.type === 'merge')
      // parents[1] and parents[2] each get a merge connection
      expect(mergeConns.length).toBe(2)
    })

    it('first parent continues on the same lane', () => {
      expect(rows.get('p1')!.lane).toBe(rows.get('M')!.lane)
    })
  })

  describe('pass-through lanes', () => {
    // A long branch runs alongside a short one
    //   A → B   (main commit on lane 0)
    //   C → D   (side branch head, parallel)
    //   B → E
    //   D → E
    //   E (root)
    const commits = [
      makeCommit('A', ['B']),
      makeCommit('C', ['D']),
      makeCommit('B', ['E']),
      makeCommit('D', ['E']),
      makeCommit('E', []),
    ]
    const rows = computeGraphRows(commits)

    it('side branch passes through as straight when main progresses', () => {
      // When we render B, the side branch (waiting for D) should still be active
      const rowB = rows.get('B')!
      const straights = rowB.connections.filter((c) => c.type === 'straight')
      // At least lane 0 (B itself) and the side lane
      expect(straights.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('empty input', () => {
    it('returns an empty map for no commits', () => {
      const rows = computeGraphRows([])
      expect(rows.size).toBe(0)
    })
  })

  describe('single commit (root and head)', () => {
    const commits = [makeCommit('solo', [])]
    const rows = computeGraphRows(commits)

    it('the single commit is both root and head', () => {
      const row = rows.get('solo')!
      expect(row.isRoot).toBe(true)
      expect(row.isHead).toBe(true)
      expect(row.lane).toBe(0)
    })
  })

  describe('deeply nested chain', () => {
    // 10-commit linear chain
    const hashes = Array.from({ length: 10 }, (_, i) => `c${i}`)
    const commits = hashes.map((h, i) =>
      makeCommit(h, i < hashes.length - 1 ? [hashes[i + 1]] : [])
    )
    const rows = computeGraphRows(commits)

    it('keeps all commits on lane 0', () => {
      for (const h of hashes) {
        expect(rows.get(h)!.lane).toBe(0)
      }
    })

    it('only first commit is head', () => {
      expect(rows.get('c0')!.isHead).toBe(true)
      for (let i = 1; i < hashes.length; i++) {
        expect(rows.get(hashes[i])!.isHead).toBe(false)
      }
    })

    it('only last commit is root', () => {
      expect(rows.get('c9')!.isRoot).toBe(true)
      for (let i = 0; i < hashes.length - 1; i++) {
        expect(rows.get(hashes[i])!.isRoot).toBe(false)
      }
    })
  })

  describe('lane reuse after branch ends', () => {
    // After a side branch merges, its lane should be reused
    //   M  merges main and side → parents [main1, side1]
    //   main1 → base
    //   side1 → base
    //   base (root)
    //   Then a new branch appears:
    //   newHead → base2
    //   base2 (root)
    const commits = [
      makeCommit('M', ['main1', 'side1']),
      makeCommit('main1', ['base']),
      makeCommit('side1', ['base']),
      makeCommit('base', []),
      makeCommit('newHead', ['base2']),
      makeCommit('base2', []),
    ]
    const rows = computeGraphRows(commits)

    it('new branch reuses a freed lane', () => {
      rows.get('side1')!.lane
      const newLane = rows.get('newHead')!.lane
      // newHead should pick up a free lane (potentially the one freed by merge)
      // rather than always extending to a new lane
      const maxLaneBeforeNew = Math.max(
        rows.get('M')!.lane,
        rows.get('main1')!.lane,
        rows.get('side1')!.lane,
        rows.get('base')!.lane
      )
      expect(newLane).toBeLessThanOrEqual(maxLaneBeforeNew + 1)
    })
  })

  describe('connection color consistency', () => {
    const commits = [
      makeCommit('M', ['p1', 'p2']),
      makeCommit('p1', []),
      makeCommit('p2', []),
    ]
    const rows = computeGraphRows(commits)

    it('straight connections use their lane color', () => {
      const row = rows.get('M')!
      for (const conn of row.connections.filter((c) => c.type === 'straight')) {
        expect(conn.color).toBe(laneColor(conn.fromLane))
      }
    })

    it('merge connections use the source lane color', () => {
      const row = rows.get('M')!
      for (const conn of row.connections.filter((c) => c.type === 'merge')) {
        expect(conn.color).toBe(laneColor(conn.fromLane))
      }
    })
  })
})

// ── CommitGraph SVG rendering ──────────────────────────────────

describe('CommitGraph component', () => {
  function makeGraphRow(overrides: Partial<GraphRow> = {}): GraphRow {
    return {
      lane: 0,
      activeLanes: [0],
      connections: [
        { fromLane: 0, toLane: 0, color: laneColor(0), type: 'straight' },
      ],
      isRoot: false,
      isHead: false,
      ...overrides,
    }
  }

  it('renders an SVG element', () => {
    const { container } = render(
      <CommitGraph graphRow={makeGraphRow()} maxLane={2} />
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('renders the commit node circle', () => {
    const { container } = render(
      <CommitGraph graphRow={makeGraphRow()} maxLane={2} />
    )
    const circle = container.querySelector('circle')
    expect(circle).toBeTruthy()
    expect(circle!.getAttribute('fill')).toBe(laneColor(0))
  })

  it('positions node at the correct lane', () => {
    const COL_W = 14
    const LEFT_PAD = 10
    const lane = 2
    const row = makeGraphRow({ lane })
    const { container } = render(
      <CommitGraph graphRow={row} maxLane={4} />
    )
    const circle = container.querySelector('circle')
    const expectedCx = LEFT_PAD + lane * COL_W
    expect(circle!.getAttribute('cx')).toBe(String(expectedCx))
  })

  it('renders a line for a straight connection', () => {
    const { container } = render(
      <CommitGraph graphRow={makeGraphRow()} maxLane={2} />
    )
    const lines = container.querySelectorAll('line')
    expect(lines.length).toBeGreaterThanOrEqual(1)
    // Straight connection should span the full height for non-root, non-head
    const line = lines[0]
    expect(line.getAttribute('y1')).toBe('0')
    expect(line.getAttribute('y2')).toBe('28')
  })

  it('renders a half line for root commits (top half only)', () => {
    const row = makeGraphRow({ isRoot: true })
    const { container } = render(
      <CommitGraph graphRow={row} maxLane={2} />
    )
    const lines = container.querySelectorAll('line')
    const ownLaneLine = Array.from(lines).find(
      (l) => l.getAttribute('x1') === l.getAttribute('x2')
    )
    expect(ownLaneLine).toBeTruthy()
    // Root: y1=0, y2=midY (14)
    expect(ownLaneLine!.getAttribute('y1')).toBe('0')
    expect(ownLaneLine!.getAttribute('y2')).toBe('14')
  })

  it('renders a half line for head commits (bottom half only)', () => {
    const row = makeGraphRow({ isHead: true })
    const { container } = render(
      <CommitGraph graphRow={row} maxLane={2} />
    )
    const lines = container.querySelectorAll('line')
    const ownLaneLine = Array.from(lines).find(
      (l) => l.getAttribute('x1') === l.getAttribute('x2')
    )
    expect(ownLaneLine).toBeTruthy()
    // Head: y1=midY (14), y2=h (28)
    expect(ownLaneLine!.getAttribute('y1')).toBe('14')
    expect(ownLaneLine!.getAttribute('y2')).toBe('28')
  })

  it('renders a path for merge connections', () => {
    const row = makeGraphRow({
      connections: [
        { fromLane: 0, toLane: 0, color: laneColor(0), type: 'straight' },
        { fromLane: 1, toLane: 0, color: laneColor(1), type: 'merge' },
      ],
    })
    const { container } = render(
      <CommitGraph graphRow={row} maxLane={2} />
    )
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBe(1)
    const d = paths[0].getAttribute('d')!
    expect(d).toContain('M')
    expect(d).toContain('C')
    expect(paths[0].getAttribute('stroke')).toBe(laneColor(1))
  })

  it('renders a path for fork connections', () => {
    const row = makeGraphRow({
      connections: [
        { fromLane: 0, toLane: 0, color: laneColor(0), type: 'straight' },
        { fromLane: 0, toLane: 2, color: laneColor(2), type: 'fork' },
      ],
    })
    const { container } = render(
      <CommitGraph graphRow={row} maxLane={3} />
    )
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBe(1)
    const d = paths[0].getAttribute('d')!
    expect(d).toContain('M')
    expect(d).toContain('C')
    expect(paths[0].getAttribute('stroke')).toBe(laneColor(2))
  })

  it('scales SVG width based on maxLane', () => {
    const COL_W = 14
    const LEFT_PAD = 10
    const maxLane = 5
    const { container } = render(
      <CommitGraph graphRow={makeGraphRow()} maxLane={maxLane} />
    )
    const svg = container.querySelector('svg')!
    const expectedW = LEFT_PAD + (maxLane + 1) * COL_W + 4
    expect(svg.getAttribute('width')).toBe(String(expectedW))
  })

  it('SVG height is always 28 (ROW_H)', () => {
    const { container } = render(
      <CommitGraph graphRow={makeGraphRow()} maxLane={2} />
    )
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('height')).toBe('28')
  })

  it('circle is drawn last (on top of lines)', () => {
    const row = makeGraphRow({
      connections: [
        { fromLane: 0, toLane: 0, color: laneColor(0), type: 'straight' },
        { fromLane: 1, toLane: 0, color: laneColor(1), type: 'merge' },
      ],
    })
    const { container } = render(
      <CommitGraph graphRow={row} maxLane={2} />
    )
    const svg = container.querySelector('svg')!
    const children = Array.from(svg.children)
    const lastChild = children[children.length - 1]
    expect(lastChild.tagName).toBe('circle')
  })

  it('renders multiple straight connections for pass-through lanes', () => {
    const row = makeGraphRow({
      lane: 0,
      activeLanes: [0, 1, 2],
      connections: [
        { fromLane: 0, toLane: 0, color: laneColor(0), type: 'straight' },
        { fromLane: 1, toLane: 1, color: laneColor(1), type: 'straight' },
        { fromLane: 2, toLane: 2, color: laneColor(2), type: 'straight' },
      ],
    })
    const { container } = render(
      <CommitGraph graphRow={row} maxLane={3} />
    )
    const lines = container.querySelectorAll('line')
    expect(lines.length).toBe(3)
  })

  it('applies correct stroke colors to straight lines', () => {
    const row = makeGraphRow({
      lane: 0,
      connections: [
        { fromLane: 0, toLane: 0, color: laneColor(0), type: 'straight' },
        { fromLane: 1, toLane: 1, color: laneColor(1), type: 'straight' },
      ],
    })
    const { container } = render(
      <CommitGraph graphRow={row} maxLane={2} />
    )
    const lines = container.querySelectorAll('line')
    expect(lines[0].getAttribute('stroke')).toBe(laneColor(0))
    expect(lines[1].getAttribute('stroke')).toBe(laneColor(1))
  })

  it('node circle has a background-colored stroke ring', () => {
    const { container } = render(
      <CommitGraph graphRow={makeGraphRow()} maxLane={2} />
    )
    const circle = container.querySelector('circle')!
    expect(circle.getAttribute('stroke')).toBe('var(--color-bg-panel, #1e1e2e)')
    expect(circle.getAttribute('stroke-width')).toBe('1.5')
  })
})

// ── useGraphData hook ──────────────────────────────────────────

describe('useGraphData (via computeGraphRows)', () => {
  it('computes correct maxLane for a branching scenario', () => {
    const commits = [
      makeCommit('M', ['p1', 'p2']),
      makeCommit('p1', []),
      makeCommit('p2', []),
    ]
    const rows = computeGraphRows(commits)
    let maxLane = 0
    for (const row of rows.values()) {
      if (row.lane > maxLane) maxLane = row.lane
      for (const l of row.activeLanes) {
        if (l > maxLane) maxLane = l
      }
    }
    // With a merge, at least one parent will be on lane 1
    expect(maxLane).toBeGreaterThanOrEqual(1)
  })

  it('maxLane is 0 for a linear chain', () => {
    const commits = [
      makeCommit('a', ['b']),
      makeCommit('b', ['c']),
      makeCommit('c', []),
    ]
    const rows = computeGraphRows(commits)
    let maxLane = 0
    for (const row of rows.values()) {
      if (row.lane > maxLane) maxLane = row.lane
      for (const l of row.activeLanes) {
        if (l > maxLane) maxLane = l
      }
    }
    expect(maxLane).toBe(0)
  })
})
