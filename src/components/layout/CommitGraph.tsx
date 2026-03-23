import { useMemo } from 'react'
import type { GitCommit } from '../../../electron/shared/types'

// ── Graph lane colours ─────────────────────────────────────────

const LANE_COLORS = [
  'var(--color-graph-0)',
  'var(--color-graph-1)',
  'var(--color-graph-2)',
  'var(--color-graph-3)',
  'var(--color-graph-4)',
  'var(--color-graph-5)',
]

function laneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length]
}

// ── Lane computation ───────────────────────────────────────────

export interface GraphRow {
  lane: number
  activeLanes: number[]
  connections: {
    fromLane: number
    toLane: number
    color: string
    /** 
     * straight: full-height vertical pass-through or node continuation
     * merge:    curved line coming IN to this commit from above (top→midY)
     * fork:     curved line going OUT from this commit downward (midY→bottom)
     */
    type: 'straight' | 'merge' | 'fork'
  }[]
  isRoot: boolean
  isHead: boolean
}

/**
 * Walk the commit list (topological order, newest first) and
 * assign each commit a lane. Returns a Map shortHash → GraphRow.
 *
 * `lanes` is an array of slots; each slot holds the shortHash of the commit
 * we are "waiting for" from above. null means the slot is free.
 *
 * Fork-point handling:
 *   When commit C is processed on lane L, every OTHER lane that was also
 *   waiting for C's hash gets a "fork" connection drawn (branch diverges at C)
 *   and that slot is freed (the branch will continue downward from C via its
 *   own child row which drew the fork curve).
 */
export function computeGraphRows(commits: GitCommit[]): Map<string, GraphRow> {
  const result = new Map<string, GraphRow>()
  let lanes: (string | null)[] = []

  for (const commit of commits) {
    const hash = commit.shortHash
    const isRoot = commit.parents.length === 0

    // ── Find or allocate a lane for this commit ─────────────────
    let myLane = lanes.indexOf(hash)
    const isHead = myLane === -1
    if (isHead) {
      // Not yet expected by any lane — grab a free slot or extend
      const free = lanes.indexOf(null)
      if (free !== -1) {
        myLane = free
        lanes[myLane] = hash
      } else {
        myLane = lanes.length
        lanes.push(hash)
      }
    }


    // ── Fork-point detection (before processing parents) ───────
    //   Multiple lane slots can hold the same hash when several commits
    //   each set this commit as their first parent (branch divergence point).
    //   Identify them now, emit fork curves, and free those extra slots.
    const forkLanes: number[] = []
    for (let i = 0; i < lanes.length; i++) {
      if (i !== myLane && lanes[i] === hash) {
        forkLanes.push(i)
        lanes[i] = null // free the slot; fork curve will be drawn below
      }
    }

    // Snapshot active lanes AFTER freeing fork slots, but BEFORE parent assignment
    const activeBeforeSet = new Set(
      lanes.map((v, i) => (v !== null ? i : -1)).filter((i) => i !== -1)
    )

    const connections: GraphRow['connections'] = []

    // Emit fork connections for each extra lane that was waiting for this commit
    for (const forkLane of forkLanes) {
      connections.push({
        fromLane: myLane,
        toLane: forkLane,
        color: laneColor(forkLane),
        type: 'fork',
      })
    }

    // ── Advance this lane to the first parent (or free it) ──────
    if (isRoot) {
      lanes[myLane] = null
    } else {
      lanes[myLane] = commit.parents[0]
    }

    // ── Handle merge parents (2nd, 3rd, …) ──────────────────────
    //   Allocate new lanes for them so we can draw curved merge lines.
    const mergeLanes: number[] = []
    for (let p = 1; p < commit.parents.length; p++) {
      const parentHash = commit.parents[p]
      let pLane = lanes.indexOf(parentHash)
      if (pLane === -1) {
        const free = lanes.indexOf(null)
        if (free !== -1) {
          pLane = free
          lanes[pLane] = parentHash
        } else {
          pLane = lanes.length
          lanes.push(parentHash)
        }
      }
      mergeLanes.push(pLane)
    }

    // ── Straight pass-through for lanes active both before and after ─
    const activeAfterSet = new Set(
      lanes.map((v, i) => (v !== null ? i : -1)).filter((i) => i !== -1)
    )

    // Main lane: always draw a straight line so the node connects to the row above.
    // (For root commits the SVG will only draw the top half — no line below the dot.)
    connections.push({
      fromLane: myLane,
      toLane: myLane,
      color: laneColor(myLane),
      type: 'straight',
    })

    // Pass-throughs for other lanes that were active before and remain active
    for (const lane of activeBeforeSet) {
      if (lane === myLane) continue
      if (mergeLanes.includes(lane)) continue // will be drawn as merge curve
      if (activeAfterSet.has(lane)) {
        connections.push({
          fromLane: lane,
          toLane: lane,
          color: laneColor(lane),
          type: 'straight',
        })
      }
      // Lane that became inactive (consumed by merge) — no pass-through needed
    }

    // Merge curves (come IN to this commit from a side lane above)
    for (const pLane of mergeLanes) {
      connections.push({
        fromLane: pLane,
        toLane: myLane,
        color: laneColor(pLane),
        type: 'merge',
      })
    }

    const activeAfter = [...activeAfterSet]

    result.set(hash, {
      lane: myLane,
      activeLanes: activeAfter,
      connections,
      isRoot,
      isHead,
    })
  }

  return result
}


// ── SVG rendering ──────────────────────────────────────────────

const COL_W = 14
const NODE_R = 4
const STROKE_W = 2
const LEFT_PAD = 10
/** Must match the CSS row height in HistoryPane */
const ROW_H = 28

function laneX(lane: number): number {
  return LEFT_PAD + lane * COL_W
}

interface CommitGraphProps {
  graphRow: GraphRow
  maxLane: number
}

export function CommitGraph({ graphRow, maxLane }: CommitGraphProps) {
  const w = LEFT_PAD + (maxLane + 1) * COL_W + 4
  const h = ROW_H
  const midY = h / 2
  const cx = laneX(graphRow.lane)

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0"
      style={{ display: 'block' }}
    >
      {graphRow.connections.map((conn, i) => {
        const x1 = laneX(conn.fromLane)
        const x2 = laneX(conn.toLane)

        if (conn.type === 'straight') {
          // For a root commit's own lane, only draw the top half (no line below the dot)
          const isRootOwnLane =
            graphRow.isRoot &&
            conn.fromLane === graphRow.lane &&
            conn.toLane === graphRow.lane
          
          // For a head commit's own lane (start of branch), only draw the bottom half (no line above dot)
          const isHeadOwnLane =
            graphRow.isHead &&
            conn.fromLane === graphRow.lane &&
            conn.toLane === graphRow.lane

          return (
            <line
              key={i}
              x1={x1}
              y1={isHeadOwnLane ? midY : 0}
              x2={x2}
              y2={isRootOwnLane ? midY : h}
              stroke={conn.color}
              strokeWidth={STROKE_W}
            />
          )
        }

        if (conn.type === 'merge') {
          // Merge commit: new branch lane OPENS downward from this node.
          // Curves FROM the commit node (cx, midY) DOWN to the side lane bottom (x1, h).
          return (
            <path
              key={i}
              d={`M ${cx} ${midY} C ${cx} ${midY + h * 0.4}, ${x1} ${h - h * 0.1}, ${x1} ${h}`}
              fill="none"
              stroke={conn.color}
              strokeWidth={STROKE_W}
            />
          )
        }

        if (conn.type === 'fork') {
          // Fork-point commit: branch lane CLOSES into this node from above.
          // Curves FROM the side lane top (x2, 0) INTO the commit node (cx, midY).
          return (
            <path
              key={i}
              d={`M ${x2} 0 C ${x2} ${h * 0.4}, ${cx} ${midY - h * 0.1}, ${cx} ${midY}`}
              fill="none"
              stroke={conn.color}
              strokeWidth={STROKE_W}
            />
          )
        }

        return null
      })}

      {/* Commit node dot — drawn last so it sits on top of lines */}
      <circle
        cx={cx}
        cy={midY}
        r={NODE_R}
        fill={laneColor(graphRow.lane)}
        stroke="var(--color-bg-panel, #1e1e2e)"
        strokeWidth={1.5}
      />
    </svg>
  )
}

// ── Hook to compute graph data once ────────────────────────────

export function useGraphData(commits: GitCommit[]) {
  return useMemo(() => {
    const rows = computeGraphRows(commits)
    let maxLane = 0
    for (const row of rows.values()) {
      if (row.lane > maxLane) maxLane = row.lane
      for (const l of row.activeLanes) {
        if (l > maxLane) maxLane = l
      }
    }
    return { rows, maxLane }
  }, [commits])
}
