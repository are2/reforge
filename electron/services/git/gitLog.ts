import { runGitOrThrow } from './gitRunner'
import type { GitCommit, GitPerson, GitRef, FileChange, FileStatus, GitStash } from '../../shared/types'
import { getStashes } from './gitRefs'

// ── Format string ──────────────────────────────────────────────
// Each commit is separated by a record-separator (RS, \x1e).
// Fields within a commit are separated by a unit-separator (US, \x1f).

const FIELD_SEP = '\x1f'
const RECORD_SEP = '\x1e'

const LOG_FORMAT = [
  '%H',   // full hash
  '%h',   // short hash
  '%s',   // subject
  '%b',   // body
  '%an',  // author name
  '%ae',  // author email
  '%aI',  // author date ISO
  '%cn',  // committer name
  '%ce',  // committer email
  '%cI',  // committer date ISO
  '%D',   // ref names (decorated)
  '%p',   // parent short hashes (space-separated)
].join(FIELD_SEP)

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

function parseRefDecoration(raw: string): GitRef[] {
  if (!raw.trim()) return []
  return raw.split(',').map((r) => {
    const trimmed = r.trim()
    
    // With --decorate=full:
    // HEAD -> refs/heads/main
    // refs/heads/feature/foo
    // refs/remotes/origin/main
    // tag: refs/tags/v1.0

    if (trimmed.startsWith('HEAD -> ')) {
      const fullRef = trimmed.replace('HEAD -> ', '')
      const name = fullRef.replace(/^refs\/heads\//, '')
      return { name, type: 'head' as const }
    }
    
    if (trimmed.startsWith('tag: ')) {
      const fullRef = trimmed.replace('tag: ', '')
      const name = fullRef.replace(/^refs\/tags\//, '')
      return { name, type: 'tag' as const }
    }

    if (trimmed.startsWith('refs/heads/')) {
      return { name: trimmed.replace('refs/heads/', ''), type: 'local' as const }
    }

    if (trimmed.startsWith('refs/remotes/')) {
      // Keep everything after refs/remotes/ (usually origin/branch)
      return { name: trimmed.replace('refs/remotes/', ''), type: 'remote' as const }
    }

    if (trimmed === 'refs/stash') {
      return { name: 'stash', type: 'stash' as const }
    }

    return { name: trimmed, type: 'local' as const }
  })
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

function parseNameStatus(raw: string): FileChange[] {
  const files: FileChange[] = []
  const lines = raw.split('\n').filter(Boolean)
  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length >= 2) {
      const status = parseFileStatus(parts[0])
      if (status === 'renamed' && parts.length >= 3) {
        files.push({ path: parts[2], status, oldPath: parts[1] })
      } else {
        files.push({ path: parts[1], status })
      }
    }
  }
  return files
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

/**
 * Get the commit log for a repository.
 * Returns commits in topological order (newest first).
 */
export async function getLog(
  repoPath: string,
  limit = 200,
  order: 'topo' | 'date' = 'topo',
  showStashes = false
): Promise<GitCommit[]> {
  const orderFlag = order === 'topo' ? '--topo-order' : '--date-order'
  
  let refsToLog = showStashes ? ['--all'] : ['--branches', '--remotes', '--tags', 'HEAD']
  let allStashes: GitStash[] = []
  
  if (showStashes) {
    try {
      allStashes = await getStashes(repoPath)
      // Add all stash hashes to the log command to ensure they are walked
      const stashHashes = allStashes.map(s => s.hash)
      refsToLog.push(...stashHashes)
    } catch (err) {
      console.error('Failed to get stashes for log:', err)
    }
  }

  const stdout = await runGitOrThrow(repoPath, [
    'log',
    ...refsToLog,
    orderFlag,
    `--max-count=${limit}`,
    `--pretty=format:${RECORD_SEP}${LOG_FORMAT}${FIELD_SEP}`,
    '--decorate=full',
    '--name-status',
  ])

  if (!stdout.trim()) return []

  const records = stdout.split(RECORD_SEP).filter((r) => r.trim())
  const commits: GitCommit[] = []

  for (const record of records) {
    const fields = record.split(FIELD_SEP)
    if (fields.length < 13) continue

    const [
      hash, shortHash, subject, body,
      authorName, authorEmail, authorDateISO,
      committerName, committerEmail, committerDateISO,
      refDecoration, parentStr,
      nameStatusBlock,
    ] = fields

    const bodyLines = body.trim() ? body.trim().split('\n').map((l) => l.trim()) : []
    const parents = parentStr.trim() ? parentStr.trim().split(' ') : []
    const refs = parseRefDecoration(refDecoration)
    const files = parseNameStatus(nameStatusBlock)

    // Manually inject stash names (e.g., stash@{1}) if this commit matches a stash
    if (showStashes && allStashes.length > 0) {
      const matchingStashes = allStashes.filter(s => s.hash === hash)
      for (const s of matchingStashes) {
        // Avoid duplicate stash refs (git might have already added 'refs/stash' for stash@{0})
        const stashRefName = `stash@{${s.index}}`
        if (!refs.some(r => r.name === stashRefName || (r.name === 'stash' && s.index === 0))) {
           refs.push({ name: stashRefName, type: 'stash' })
        }
      }
    }

    commits.push({
      hash,
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
    })
  }

  return commits
}
