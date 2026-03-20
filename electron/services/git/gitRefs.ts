import { runGitOrThrow, runGit } from './gitRunner'
import type {
  GitBranch,
  GitRemote,
  GitTag,
  GitStash,
  GitSubmodule,
  GitRefsData,
} from '../../shared/types'

// ── Branches ───────────────────────────────────────────────────

/**
 * Group flat branch names like ["main", "feature/api", "feature/auth"]
 * into a tree structure with folder nodes.
 */
function groupBranchNames(
  branches: {
    name: string
    isCurrent: boolean
    tip: string
    upstream?: string
    ahead?: number
    behind?: number
  }[],
): GitBranch[] {
  const root: GitBranch[] = []

  for (const branch of branches) {
    const parts = branch.name.split('/')
    if (parts.length === 1) {
      // Top-level branch
      root.push({
        name: branch.name,
        isCurrent: branch.isCurrent,
        tip: branch.tip,
        upstream: branch.upstream,
        ahead: branch.ahead,
        behind: branch.behind,
      })
    } else {
      // Nested — find or create folder nodes
      let currentLevel = root
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        if (i === parts.length - 1) {
          // Leaf branch
          currentLevel.push({
            name: part,
            isCurrent: branch.isCurrent,
            tip: branch.tip,
            upstream: branch.upstream,
            ahead: branch.ahead,
            behind: branch.behind,
          })
        } else {
          // Folder node
          let folder = currentLevel.find(
            (b) => b.name === part && b.children !== undefined,
          )
          if (!folder) {
            folder = { name: part, isCurrent: false, children: [] }
            currentLevel.push(folder)
          }
          currentLevel = folder.children!
        }
      }
    }
  }

  return root
}

export async function getBranches(repoPath: string): Promise<{
  branches: GitBranch[]
  currentBranch: string
}> {
  const stdout = await runGitOrThrow(repoPath, [
    'branch',
    '-vv',
    '--no-color',
    '--no-abbrev',
  ])

  let currentBranch = 'HEAD'
  const flatBranches: {
    name: string
    isCurrent: boolean
    tip: string
    upstream?: string
    ahead?: number
    behind?: number
  }[] = []

  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue
    const isCurrent = line.startsWith('* ')
    const rest = line.slice(2).trim()

    // Format: "branch-name  <hash> [<remote>: ahead X, behind Y] <subject>"
    if (rest.startsWith('(HEAD detached')) {
      if (isCurrent) currentBranch = 'HEAD (detached)'
      continue
    }

    const match = rest.match(/^(\S+)\s+([0-9a-f]+)\s+/)
    if (!match) continue

    const name = match[1]
    const tip = match[2]
    if (isCurrent) currentBranch = name

    let ahead = 0
    let behind = 0
    let upstream: string | undefined = undefined

    // Look for [remote: ahead X, behind Y]
    const statusMatch = rest.match(/\[[^\]]+\]/)
    if (statusMatch) {
      const statusText = statusMatch[0]
      // statusText is "[origin/master]" or "[origin/master: ahead 1, behind 2]"
      const upstreamMatch = statusText.match(/^\[([^:\]]+)/)
      if (upstreamMatch) {
        upstream = upstreamMatch[1]
      }
      
      const aheadMatch = statusText.match(/ahead (\d+)/)
      const behindMatch = statusText.match(/behind (\d+)/)
      if (aheadMatch) ahead = parseInt(aheadMatch[1], 10)
      if (behindMatch) behind = parseInt(behindMatch[1], 10)
    }

    flatBranches.push({
      name,
      isCurrent,
      tip,
      upstream,
      ahead: ahead > 0 ? ahead : undefined,
      behind: behind > 0 ? behind : undefined,
    })
  }

  return {
    branches: groupBranchNames(flatBranches),
    currentBranch,
  }
}

// ── Remotes ────────────────────────────────────────────────────

export async function getRemotes(repoPath: string): Promise<GitRemote[]> {
  const remoteResult = await runGit(repoPath, ['remote'])
  if (remoteResult.exitCode !== 0 || !remoteResult.stdout.trim()) return []

  const remoteNames = remoteResult.stdout.trim().split('\n').filter(Boolean)

  // Get remote tracking branches
  const branchResult = await runGit(repoPath, [
    'branch',
    '-r',
    '--no-color',
  ])

  const remoteBranches = branchResult.exitCode === 0
    ? branchResult.stdout.split('\n').map((l) => l.trim()).filter(Boolean)
    : []

  return await Promise.all(remoteNames.map(async (name) => {
    const prefix = `${name}/`
    const branches = remoteBranches
      .filter((b) => b.startsWith(prefix) && !b.includes('->'))
      .map((b) => b.slice(prefix.length))

    // Fetch the URL
    const urlResult = await runGit(repoPath, ['remote', 'get-url', name])
    const url = urlResult.exitCode === 0 ? urlResult.stdout.trim() : undefined

    return { name, branches, url }
  }))
}

// ── Tags ───────────────────────────────────────────────────────

export async function getTags(repoPath: string): Promise<GitTag[]> {
  const result = await runGit(repoPath, [
    'tag',
    '--sort=-creatordate',
    '--format=%(objectname:short)\t%(refname:short)',
  ])

  if (result.exitCode !== 0 || !result.stdout.trim()) return []

  return result.stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, name] = line.split('\t')
      return { name: name || hash, hash }
    })
}

// ── Stashes ────────────────────────────────────────────────────

export async function getStashes(repoPath: string): Promise<GitStash[]> {
  const result = await runGit(repoPath, ['stash', 'list', '--format=%gd\t%gs'])
  if (result.exitCode !== 0 || !result.stdout.trim()) return []

  return result.stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [ref, ...msgParts] = line.split('\t')
      const indexMatch = ref.match(/\{(\d+)\}/)
      return {
        index: indexMatch ? parseInt(indexMatch[1], 10) : 0,
        message: msgParts.join('\t') || ref,
      }
    })
}

// ── Submodules ─────────────────────────────────────────────────

export async function getSubmodules(repoPath: string): Promise<GitSubmodule[]> {
  const result = await runGit(repoPath, ['submodule', 'status'])
  if (result.exitCode !== 0 || !result.stdout.trim()) return []

  return result.stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      // Format: " <hash> <path> (describe)" or "+<hash> <path> (describe)"
      const match = line.match(/^[\s+-]*([0-9a-f]+)\s+(\S+)/)
      if (!match) return null
      const [, hash, subPath] = match
      const name = subPath.split('/').pop() || subPath
      return { name, path: subPath, hash }
    })
    .filter((s): s is GitSubmodule => s !== null)
}

// ── Aggregate ──────────────────────────────────────────────────

export async function getAllRefs(repoPath: string): Promise<{
  refs: GitRefsData
  currentBranch: string
}> {
  const [
    { branches, currentBranch },
    remotes,
    tags,
    stashes,
    submodules,
  ] = await Promise.all([
    getBranches(repoPath),
    getRemotes(repoPath),
    getTags(repoPath),
    getStashes(repoPath),
    getSubmodules(repoPath),
  ])

  return {
    refs: { branches, remotes, tags, stashes, submodules },
    currentBranch,
  }
}
