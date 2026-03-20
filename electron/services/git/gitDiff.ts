import { runGit } from './gitRunner'
import type { FileDiff, DiffHunk, DiffLine } from '../../shared/types'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Map extension to mime type.
 */
function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    'txt': 'text/plain',
    'md': 'text/markdown',
    'ts': 'text/typescript',
    'tsx': 'text/typescript',
    'js': 'text/javascript',
    'jsx': 'text/javascript',
    'json': 'application/json',
    'html': 'text/html',
    'css': 'text/css',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'sh': 'text/x-shellscript',
    'py': 'text/x-python',
    'go': 'text/x-go',
    'rs': 'text/rust',
    'c': 'text/x-c',
    'cpp': 'text/x-c++',
  }
  return map[ext] || 'application/octet-stream'
}

/**
 * Parse unified-diff output into structured hunks with line numbers.
 */
function parseUnifiedDiff(raw: string, filePath: string): FileDiff {
  const hunks: DiffHunk[] = []
  let currentHunk: DiffHunk | null = null

  // Check if it's a binary diff
  if (raw.includes('Binary files') && raw.includes('differ')) {
    return { path: filePath, hunks: [], isBinary: true }
  }

  for (const line of raw.split('\n')) {
    // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@(.*)/)
    if (hunkMatch) {
      currentHunk = {
        header: line,
        lines: [],
      }
      hunks.push(currentHunk)

      let oldLine = parseInt(hunkMatch[1], 10)
      let newLine = parseInt(hunkMatch[2], 10)

      // Store counters on the hunk object for tracking (we use closure below)
      ;(currentHunk as any)._oldLine = oldLine
      ;(currentHunk as any)._newLine = newLine
      continue
    }

    if (!currentHunk) continue

    let oldLine = (currentHunk as any)._oldLine as number
    let newLine = (currentHunk as any)._newLine as number

    if (line.startsWith('+')) {
      const diffLine: DiffLine = {
        type: 'add',
        content: line.slice(1),
        newLineNo: newLine,
      }
      currentHunk.lines.push(diffLine)
      ;(currentHunk as any)._newLine = newLine + 1
    } else if (line.startsWith('-')) {
      const diffLine: DiffLine = {
        type: 'remove',
        content: line.slice(1),
        oldLineNo: oldLine,
      }
      currentHunk.lines.push(diffLine)
      ;(currentHunk as any)._oldLine = oldLine + 1
    } else if (line.startsWith(' ')) {
      const diffLine: DiffLine = {
        type: 'context',
        content: line.slice(1),
        oldLineNo: oldLine,
        newLineNo: newLine,
      }
      currentHunk.lines.push(diffLine)
      ;(currentHunk as any)._oldLine = oldLine + 1
      ;(currentHunk as any)._newLine = newLine + 1
    }
  }

  return { path: filePath, hunks }
}

/**
 * Helper to fetch binary file info and content (if image).
 */
async function getBinaryFileData(
  repoPath: string,
  filePath: string,
  source: { type: 'disk' } | { type: 'git', hash: string }
): Promise<{ isBinary: boolean, mimeType: string, size: number, binaryContent?: string }> {
  let buffer: Buffer
  if (source.type === 'disk') {
    const fullPath = path.join(repoPath, filePath)
    buffer = await readFile(fullPath)
  } else {
    const result = await runGit(repoPath, ['show', `${source.hash}:${filePath}`])
    if (result.exitCode !== 0) {
      throw new Error(`git show failed for ${filePath} at ${source.hash}`)
    }
    buffer = result.stdoutBuffer
  }

  const isBinary = buffer.includes(0)
  const mimeType = getMimeType(filePath)
  const size = buffer.length
  let binaryContent: string | undefined

  if (mimeType.startsWith('image/')) {
    binaryContent = `data:${mimeType};base64,${buffer.toString('base64')}`
  }

  return { isBinary, mimeType, size, binaryContent }
}

/**
 * Get the diff for a single file.
 *
 * @param staged - If true, returns the staged (cached) diff; otherwise the working-tree diff.
 * @param revision - Optional commit hash. If provided, returns the diff for that commit.
 */
export async function getFileDiff(
  repoPath: string,
  filePath: string,
  staged: boolean,
  amend?: boolean,
  revision?: string,
): Promise<FileDiff> {
  const binaryInfo = async (source: { type: 'disk' } | { type: 'git', hash: string }) => {
    try {
      return await getBinaryFileData(repoPath, filePath, source)
    } catch {
      return null
    }
  }

  // If a revision is provided, we're looking at a historical commit diff
  if (revision) {
    let args = ['diff', `${revision}~1`, revision, '--', filePath]
    let result = await runGit(repoPath, args)

    if (result.exitCode !== 0) {
      const EMPTY_TREE_HASH = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'
      args = ['diff', EMPTY_TREE_HASH, revision, '--', filePath]
      result = await runGit(repoPath, args)
    }

    if (result.exitCode !== 0) {
      throw new Error(result.stderr.trim() || `git diff failed for ${filePath} at ${revision}`)
    }

    const diff = parseUnifiedDiff(result.stdout, filePath)
    if (diff.isBinary) {
      const info = await binaryInfo({ type: 'git', hash: revision })
      if (info) Object.assign(diff, info)
    }
    return diff
  }

  // For untracked files we synthesize a diff showing the full file content
  const statusResult = await runGit(repoPath, ['status', '--porcelain=v1', '--', filePath])
  const isUntracked = statusResult.stdout.startsWith('??')

  if (isUntracked) {
    const fullPath = path.join(repoPath, filePath)
    try {
      const buffer = await readFile(fullPath)
      const isBinary = buffer.includes(0)
      const mimeType = getMimeType(filePath)
      const size = buffer.length

      if (isBinary) {
        return {
          path: filePath,
          hunks: [],
          isBinary: true,
          mimeType,
          size,
          binaryContent: mimeType.startsWith('image/') ? `data:${mimeType};base64,${buffer.toString('base64')}` : undefined
        }
      }

      const content = buffer.toString('utf-8')
      const lines = content.split('\n')
      const diffLines: DiffLine[] = lines.map((line, i) => ({
        type: 'add' as const,
        content: line,
        newLineNo: i + 1,
      }))

      return {
        path: filePath,
        hunks: [
          {
            header: `@@ -0,0 +1,${lines.length} @@ (new file)`,
            lines: diffLines,
          },
        ],
      }
    } catch {
      return { path: filePath, hunks: [] }
    }
  }

  const args = staged
    ? (amend ? ['diff', 'HEAD~1', '--cached', '--', filePath] : ['diff', '--cached', '--', filePath])
    : ['diff', '--', filePath]

  let result = await runGit(repoPath, args)

  if (result.exitCode !== 0 && amend && staged) {
    const fallbackArgs = ['diff', '4b825dc642cb6eb9a060e54bf8d69288fbee4904', '--cached', '--', filePath]
    result = await runGit(repoPath, fallbackArgs)
  }

  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || `git diff failed for ${filePath}`)
  }

  const diff = parseUnifiedDiff(result.stdout, filePath)
  if (diff.isBinary) {
    let source: { type: 'disk' } | { type: 'git', hash: string }
    if (staged) {
      source = { type: 'git', hash: '' } // index
    } else {
      source = { type: 'disk' }
    }
    const info = await binaryInfo(source)
    if (info) Object.assign(diff, info)
  }
  return diff
}
