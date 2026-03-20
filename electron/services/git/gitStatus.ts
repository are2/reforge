import path from 'node:path'
import fs from 'node:fs'
import { runGit } from './gitRunner'
import type { FileStatus, StatusEntry, LocalChangesData } from '../../shared/types'

/**
 * Map porcelain status codes to FileStatus.
 */
function mapStatusCode(code: string): FileStatus | 'conflict' {
  switch (code) {
    case 'M': return 'modified'
    case 'A': return 'added'
    case 'D': return 'deleted'
    case 'R': return 'renamed'
    case 'C': return 'copied'
    case '?': return 'untracked'
    case 'U': return 'conflict'
    case 'AA': return 'conflict'
    case 'DD': return 'conflict'
    default:  return 'modified'
  }
}

/**
 * Check if the repository is in a specific state (merging, rebasing, etc.)
 */
async function getRepoState(repoPath: string): Promise<{ isMerging: boolean, isRebasing: boolean, isCherryPicking: boolean }> {
  try {
    const gitDirResult = await runGit(repoPath, ['rev-parse', '--git-dir'])
    if (gitDirResult.exitCode !== 0) return { isMerging: false, isRebasing: false, isCherryPicking: false }
    
    const gitDir = path.isAbsolute(gitDirResult.stdout.trim()) 
      ? gitDirResult.stdout.trim() 
      : path.join(repoPath, gitDirResult.stdout.trim())

    return {
      isMerging: fs.existsSync(path.join(gitDir, 'MERGE_HEAD')),
      isRebasing: fs.existsSync(path.join(gitDir, 'rebase-apply')) || fs.existsSync(path.join(gitDir, 'rebase-merge')),
      isCherryPicking: fs.existsSync(path.join(gitDir, 'CHERRY_PICK_HEAD'))
    }
  } catch (e) {
    return { isMerging: false, isRebasing: false, isCherryPicking: false }
  }
}

/**
 * Parse `git status --porcelain=v1` output into staged / unstaged entries.
 */
export async function getLocalChanges(repoPath: string): Promise<LocalChangesData & { isMerging: boolean, isRebasing: boolean, isCherryPicking: boolean }> {
  const [result, state] = await Promise.all([
    runGit(repoPath, ['status', '--porcelain=v1', '--untracked-files=all']),
    getRepoState(repoPath)
  ])

  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || 'git status failed')
  }

  const staged: StatusEntry[] = []
  const unstaged: StatusEntry[] = []
  const allPaths = new Set<string>()

  for (const line of result.stdout.split('\n')) {
    if (!line) continue
    const x = line[0] // index status
    const y = line[1] // worktree status
    const rest = line.slice(3)

    // Handle renames: "R  old -> new"
    let filePath = rest
    let oldPath: string | undefined

    const arrowIdx = rest.indexOf(' -> ')
    if (arrowIdx !== -1) {
      oldPath = rest.slice(0, arrowIdx)
      filePath = rest.slice(arrowIdx + 4)
    }

    allPaths.add(filePath)

    // Untracked files
    if (x === '?' && y === '?') {
      unstaged.push({ path: filePath, status: 'untracked', staged: false })
      continue
    }

    // Conflicts (U, AA, DD, etc.)
    const isConflict = (x === 'U' || y === 'U' || (x === 'A' && y === 'A') || (x === 'D' && y === 'D'))
    if (isConflict) {
      unstaged.push({
        path: filePath,
        status: 'conflict',
        staged: false
      })
      continue
    }

    // Staged changes (index column)
    if (x !== ' ' && x !== '?') {
      staged.push({
        path: filePath,
        status: mapStatusCode(x) as FileStatus,
        ...(oldPath ? { oldPath } : {}),
        staged: true,
      })
    }

    // Unstaged changes (worktree column)
    if (y !== ' ' && y !== '?') {
      unstaged.push({
        path: filePath,
        status: mapStatusCode(y) as FileStatus,
        ...(oldPath ? { oldPath } : {}),
        staged: false,
      })
    }
  }

  // Check which files are ignored (tracked but match .gitignore)
  if (allPaths.size > 0) {
    const ignoredResult = await runGit(repoPath, ['check-ignore', '--no-index', '--', ...allPaths])
    // check-ignore returns 0 if any files are ignored, 1 if none.
    if (ignoredResult.exitCode === 0) {
      const ignoredPaths = new Set(ignoredResult.stdout.split('\n').map(l => l.trim()).filter(Boolean))
      for (const entry of staged) {
        if (ignoredPaths.has(entry.path)) entry.isIgnored = true
      }
      for (const entry of unstaged) {
        if (ignoredPaths.has(entry.path)) entry.isIgnored = true
      }
    }
  }

  return { 
    staged, 
    unstaged,
    ...state
  }
}
