import { runGitOrThrow } from './gitRunner'

export async function stashPush(
  repoPath: string,
  message?: string,
  includeUntracked?: boolean
): Promise<void> {
  const args = ['stash', 'push']
  if (includeUntracked) {
    args.push('--include-untracked')
  }
  if (message) {
    args.push('-m', message)
  }
  await runGitOrThrow(repoPath, args)
}

export async function stashPop(repoPath: string, index?: number): Promise<void> {
  const args = ['stash', 'pop']
  if (index !== undefined) {
    args.push(`stash@{${index}}`)
  }
  await runGitOrThrow(repoPath, args)
}

export async function stashApply(repoPath: string, index?: number): Promise<void> {
  const args = ['stash', 'apply']
  if (index !== undefined) {
    args.push(`stash@{${index}}`)
  }
  await runGitOrThrow(repoPath, args)
}

export async function stashDrop(repoPath: string, index?: number): Promise<void> {
  const args = ['stash', 'drop']
  if (index !== undefined) {
    args.push(`stash@{${index}}`)
  }
  await runGitOrThrow(repoPath, args)
}
