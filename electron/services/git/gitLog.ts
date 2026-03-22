import { runGitOrThrow } from './gitRunner'
import type { GitCommit, GitPerson, GitRef, FileChange, FileStatus } from '../../shared/types'

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
    if (trimmed.startsWith('HEAD -> ')) {
      return { name: trimmed.replace('HEAD -> ', ''), type: 'head' as const }
    }
    if (trimmed.startsWith('tag: ')) {
      return { name: trimmed.replace('tag: ', ''), type: 'tag' as const }
    }
    if (trimmed.includes('/')) {
      // Could be origin/main etc.
      return { name: trimmed, type: 'remote' as const }
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
  sort: 'topo' | 'date' = 'topo'
): Promise<GitCommit[]> {
  const stdout = await runGitOrThrow(repoPath, [
    'log',
    '--all',
    sort === 'date' ? '--date-order' : '--topo-order',
    `--max-count=${limit}`,
    `--pretty=format:${RECORD_SEP}${LOG_FORMAT}`,
    '--name-status',
  ])

  if (!stdout.trim()) return []

  const records = stdout.split(RECORD_SEP).filter((r) => r.trim())
  const commits: GitCommit[] = []

  for (const record of records) {
    // Split the record into the format-line and the name-status block.
    // The format fields are on the first line(s), then a blank line, then --name-status output.
    const firstNewline = record.indexOf('\n')
    const formatLine = firstNewline === -1 ? record : record.substring(0, firstNewline)
    const nameStatusBlock = firstNewline === -1 ? '' : record.substring(firstNewline + 1)

    const fields = formatLine.split(FIELD_SEP)
    if (fields.length < 12) continue

    const [
      hash, shortHash, subject, body,
      authorName, authorEmail, authorDateISO,
      committerName, committerEmail, committerDateISO,
      refDecoration, parentStr,
    ] = fields

    const bodyLines = body.trim() ? body.trim().split('\n').map((l) => l.trim()) : []
    const parents = parentStr.trim() ? parentStr.trim().split(' ') : []
    const refs = parseRefDecoration(refDecoration)
    const files = parseNameStatus(nameStatusBlock)

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

  // ── Filter out stash helper commits ──────────────────────────
  // Stash HEAD commits are octopus merges. To render a clean graph
  // like standard Git clients, we remove the index and untracked
  // helper commits from the history and reduce the stash commit
  // to a single parent (the commit the stash was placed on).

  const hiddenHashes = new Set<string>()

  for (const commit of commits) {
    const isStash = commit.refs.some(
      (r) => r.name === 'refs/stash' || r.name.startsWith('stash@')
    )
    if (isStash && commit.parents.length >= 2) {
      // The 2nd and (optional) 3rd parents are stash helpers
      hiddenHashes.add(commit.parents[1])
      if (commit.parents[2]) {
        hiddenHashes.add(commit.parents[2])
      }
      // Keep only the 1st parent
      commit.parents = [commit.parents[0]]
    }
  }

  // Also catch edge case where a regular commit might literally be the helper commit itself?
  // They usually start with "index on " or "untracked files on " but filtering by hash is safer.
  const filteredCommits = commits.filter(
    (c) => !hiddenHashes.has(c.shortHash) && !hiddenHashes.has(c.hash)
  )

  return filteredCommits
}
