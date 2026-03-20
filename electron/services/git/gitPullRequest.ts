import { shell } from 'electron'
import { runGit } from './gitRunner'

/**
 * Identify the hosting service from a remote URL and open the PR creation page.
 */
export async function openPullRequest(repoPath: string, branch: string): Promise<void> {
  const remoteUrl = await getPrimaryRemoteUrl(repoPath)
  if (!remoteUrl) {
    throw new Error('No remote URL found')
  }

  const prUrl = getPullRequestUrl(remoteUrl, branch)
  if (!prUrl) {
    throw new Error('Hosting service not supported for Pull Requests')
  }

  await shell.openExternal(prUrl)
}

/**
 * Check if the repository has a supported remote hosting service for PRs.
 */
export async function isPullRequestSupported(repoPath: string): Promise<boolean> {
  try {
    const remoteUrl = await getPrimaryRemoteUrl(repoPath)
    if (!remoteUrl) return false
    return getPullRequestUrl(remoteUrl, 'preview') !== null
  } catch (e) {
    return false
  }
}

async function getPrimaryRemoteUrl(repoPath: string): Promise<string | null> {
  const remoteResult = await runGit(repoPath, ['remote', '-v'])
  if (remoteResult.exitCode !== 0) return null

  const lines = remoteResult.stdout.trim().split('\n')
  
  // Try origin first
  const originLine = lines.find(l => l.startsWith('origin\t') && l.endsWith('(fetch)'))
  if (originLine) {
    return originLine.split('\t')[1].split(' ')[0]
  }
  
  // Fallback to any first remote
  if (lines.length > 0) {
    const parts = lines[0].split('\t')
    if (parts.length > 1) {
      return parts[1].split(' ')[0]
    }
  }

  return null
}

function getPullRequestUrl(remoteUrl: string, branch: string): string | null {
  let url = remoteUrl.trim()
  
  // Remove .git suffix
  url = url.replace(/\.git$/, '')

  // Handle SSH: git@github.com:owner/repo -> https://github.com/owner/repo
  if (url.startsWith('git@')) {
    // Replace the colon after the domain with a slash
    url = url.replace(':', '/').replace('git@', 'https://')
  } else if (url.startsWith('ssh://git@')) {
    url = url.replace('ssh://git@', 'https://')
  }

  // GitHub
  if (url.includes('github.com')) {
    return `${url}/compare/${encodeURIComponent(branch)}?expand=1`
  }

  // GitLab
  if (url.includes('gitlab.com')) {
    return `${url}/-/merge_requests/new?merge_request%5Bsource_branch%5D=${encodeURIComponent(branch)}`
  }

  // Azure DevOps (dev.azure.com or visualstudio.com)
  if (url.includes('dev.azure.com') || url.includes('visualstudio.com')) {
    // Format: https://dev.azure.com/{org}/{project}/_git/{repo}
    // PR URL: https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequestcreate?sourceRef={branch}
    return `${url}/pullrequestcreate?sourceRef=${encodeURIComponent(branch)}`
  }

  // Bitbucket
  if (url.includes('bitbucket.org')) {
    return `${url}/pull-requests/new?source=${encodeURIComponent(branch)}`
  }

  return null
}
