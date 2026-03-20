import { runGitOrThrow, runGit } from './gitRunner'
import type { GitCommit, GitPerson, GitRef, FileChange, FileStatus, GitTreeItem, FileContent } from '../../shared/types'

// ── Helpers ────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join('')
}

function makePerson(name: string, email: string): GitPerson {
  return { name, email, initials: initials(name) }
}

function parseFileStatus(code: string): FileStatus {
  switch (code[0]) {
    case 'M': return 'modified'
    case 'A': return 'added'
    case 'D': return 'deleted'
    case 'R': return 'renamed'
    case 'C': return 'copied'
    default: return 'modified'
  }
}

function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate)
    return d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    })
  } catch {
    return isoDate
  }
}

const FIELD_SEP = '\x1f'

const SHOW_FORMAT = [
  '%H', '%h', '%s', '%b',
  '%an', '%ae', '%aI',
  '%cn', '%ce', '%cI',
  '%D', '%P',
].join(FIELD_SEP)

function parseRefDecoration(raw: string): GitRef[] {
  if (!raw.trim()) return []
  return raw.split(',').map((r) => {
    const trimmed = r.trim()
    if (trimmed.startsWith('HEAD -> ')) {
      return { name: trimmed.replace('HEAD -> ', ''), type: 'head' as const }
    }
    if (trimmed.startsWith('tag: ')) {
      return { name: trimmed.replace('tag: ', ''), type: 'tag' as const }
    }
    if (trimmed.includes('/')) {
      return { name: trimmed, type: 'remote' as const }
    }
    return { name: trimmed, type: 'local' as const }
  })
}

/**
 * Get full details for a single commit, including changed files.
 */
export async function getCommitDetail(
  repoPath: string,
  hash: string,
): Promise<GitCommit> {
  if (!hash || typeof hash !== 'string') {
    throw new Error('getCommitDetail: hash must be a non-empty string')
  }

  const stdout = await runGitOrThrow(repoPath, [
    'show',
    hash,
    `--pretty=format:${SHOW_FORMAT}`,
    '--name-status',
  ])

  // The first line contains the formatted fields, followed by file changes
  const firstNewline = stdout.indexOf('\n')
  const formatLine = firstNewline === -1 ? stdout : stdout.substring(0, firstNewline)
  const nameStatusBlock = firstNewline === -1 ? '' : stdout.substring(firstNewline + 1)

  const fields = formatLine.split(FIELD_SEP)
  if (fields.length < 12) {
    throw new Error(`getCommitDetail: unexpected format output for ${hash}`)
  }

  const [
    fullHash, shortHash, subject, body,
    authorName, authorEmail, authorDateISO,
    committerName, committerEmail, committerDateISO,
    refDecoration, parentStr,
  ] = fields

  const bodyLines = body.trim() ? body.trim().split('\n').map((l) => l.trim()) : []
  const parents = parentStr.trim() ? parentStr.trim().split(' ') : []
  const refs = parseRefDecoration(refDecoration)

  // Parse name-status — skip any diff output lines (starts with "diff --git")
  const files: FileChange[] = []
  const nsLines = nameStatusBlock.split('\n').filter(Boolean)
  for (const line of nsLines) {
    // name-status lines start with a status letter followed by a tab
    const parts = line.split('\t')
    if (parts.length >= 2 && /^[MADRC]\d*$/.test(parts[0])) {
      const status = parseFileStatus(parts[0])
      if (status === 'renamed' && parts.length >= 3) {
        files.push({ path: parts[2], status, oldPath: parts[1] })
      } else {
        files.push({ path: parts[1], status })
      }
    }
  }

  return {
    hash: fullHash,
    shortHash,
    subject,
    body: bodyLines,
    author: makePerson(authorName, authorEmail),
    committer: makePerson(committerName, committerEmail),
    authorDate: formatDate(authorDateISO),
    commitDate: formatDate(committerDateISO),
    refs,
    parents,
    files,
  }
}

/**
 * Get the full file tree at a specific commit.
 */
export async function getFileTree(
  repoPath: string,
  hash: string,
): Promise<GitTreeItem[]> {
  const stdout = await runGitOrThrow(repoPath, ['ls-tree', '-r', '--long', hash])
  
  const lines = stdout.split('\n').filter(Boolean)
  const items: GitTreeItem[] = lines.map((line) => {
    // Format: <mode> <type> <hash> <size>\t<path>
    const [meta, path] = line.split('\t')
    const [, type, , sizeStr] = meta.split(/\s+/)
    
    return {
      path,
      type: type as 'blob' | 'tree',
      size: sizeStr === '-' ? undefined : parseInt(sizeStr, 10),
    }
  })

  return items
}

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

export async function getFileContent(
  repoPath: string,
  hash: string,
  filePath: string,
): Promise<FileContent> {
  // Use runGit to get the raw buffer for binary check.
  const result = await runGit(repoPath, ['show', `${hash}:${filePath}`])
  if (result.exitCode !== 0) {
    throw new Error(`Failed to get file content for ${filePath} at ${hash}: ${result.stderr}`)
  }

  const mimeType = getMimeType(filePath)
  const isImage = mimeType.startsWith('image/')
  
  // Detect if binary. A simple way in Node is to check for null bytes.
  const isBinary = result.stdoutBuffer.includes(0)
  
  let content = ''
  if (isImage) {
    content = `data:${mimeType};base64,${result.stdoutBuffer.toString('base64')}`
  } else if (isBinary) {
    content = '' // Don't send raw binary over IPC if not an image
  } else {
    content = result.stdout
  }
  
  return {
    path: filePath,
    content,
    isBinary,
    mimeType,
    size: result.stdoutBuffer.length,
  }
}
