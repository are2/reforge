import fs from 'node:fs'
import path from 'node:path'
import { runGit, runGitOrThrow } from './gitRunner'
import type { ConflictDetails, StatusEntry, ConflictBlock } from '../../shared/types'
import { getLocalChanges } from './gitStatus'

/**
 * Get all files currently in a conflicted state.
 */
export async function getConflicts(repoPath: string): Promise<StatusEntry[]> {
  const status = await getLocalChanges(repoPath)
  return [...status.staged, ...status.unstaged].filter(entry => entry.status === 'conflict')
}

/**
 * Get the content of a conflicted file from all three sides and parse blocks.
 */
export async function getConflictDetails(
  repoPath: string,
  filePath: string,
): Promise<ConflictDetails> {
  const fullPath = path.join(repoPath, filePath)
  
  try {
    // Read the current file content which has the conflict markers
    const diskContent = await fs.promises.readFile(fullPath, 'utf-8')
    const blocks = parseConflictBlocks(diskContent)

    // Stage indices: 1 = base, 2 = ours, 3 = theirs
    const [base, ours, theirs] = await Promise.all([
      runGit(repoPath, ['show', `:1:${filePath}`]).then(r => r.exitCode === 0 ? r.stdout : ''),
      runGit(repoPath, ['show', `:2:${filePath}`]).then(r => r.exitCode === 0 ? r.stdout : ''),
      runGit(repoPath, ['show', `:3:${filePath}`]).then(r => r.exitCode === 0 ? r.stdout : ''),
    ])

    return {
      path: filePath,
      blocks,
      base,
      ours,
      theirs,
    }
  } catch (err) {
    throw new Error(`Failed to get conflict details for ${filePath}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

/**
 * Parses a file string containing git conflict markers into an array of blocks.
 */
function parseConflictBlocks(content: string): ConflictBlock[] {
  const lines = content.split(/\r?\n/)
  const blocks: ConflictBlock[] = []
  
  let currentStable = ''
  let currentConflict: Partial<ConflictBlock> | null = null
  let mode: 'ours' | 'base' | 'theirs' | null = null

  const flushStable = () => {
    if (currentStable) {
      blocks.push({
        id: Math.random().toString(36).substring(2, 9),
        type: 'stable',
        content: currentStable,
      })
      currentStable = ''
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isLastLine = i === lines.length - 1

    if (line.startsWith('<<<<<<<')) {
      flushStable()
      currentConflict = {
        id: Math.random().toString(36).substring(2, 9),
        type: 'conflict',
        ours: '',
        theirs: '',
        base: '',
        oursHeader: line.slice(7).trim(),
      }
      mode = 'ours'
    } else if (line.startsWith('|||||||')) {
      mode = 'base'
    } else if (line.startsWith('=======')) {
      mode = 'theirs'
    } else if (line.startsWith('>>>>>>>')) {
      if (currentConflict) {
        currentConflict.theirsHeader = line.slice(7).trim()
        // Trim trailing newlines from conflict sections
        if (currentConflict.ours) currentConflict.ours = currentConflict.ours.replace(/\n$/, '')
        if (currentConflict.theirs) currentConflict.theirs = currentConflict.theirs.replace(/\n$/, '')
        if (currentConflict.base) currentConflict.base = currentConflict.base.replace(/\n$/, '')
        
        blocks.push(currentConflict as ConflictBlock)
        currentConflict = null
        mode = null
      }
    } else {
      if (mode === 'ours') {
        currentConflict!.ours += line + '\n'
      } else if (mode === 'base') {
        currentConflict!.base += line + '\n'
      } else if (mode === 'theirs') {
        currentConflict!.theirs += line + '\n'
      } else {
        currentStable += line + (isLastLine ? '' : '\n')
      }
    }
  }

  flushStable()
  return blocks
}

/**
 * Resolve a conflict by writing the final content to the file and staging it.
 */
export async function resolveConflict(
  repoPath: string,
  filePath: string,
  content: string,
): Promise<void> {
  const fullPath = path.join(repoPath, filePath)
  await fs.promises.writeFile(fullPath, content, 'utf-8')
  
  // Stage the file to mark it as resolved
  await runGitOrThrow(repoPath, ['add', filePath])
}
