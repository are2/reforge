import { runGit, runGitOrThrow } from './gitRunner'

/**
 * Stage a file (add to index).
 */
export async function stageFile(repoPath: string, filePath: string, isIgnored?: boolean): Promise<void> {
  const args = isIgnored ? ['add', '-f', '--', filePath] : ['add', '--', filePath]
  await runGitOrThrow(repoPath, args)
}

/**
 * Unstage a file (remove from index, keep in worktree).
 */
export async function unstageFile(repoPath: string, filePath: string): Promise<void> {
  await runGitOrThrow(repoPath, ['reset', 'HEAD', '--', filePath])
}

/**
 * Discard local changes in a file (restore to HEAD or remove if untracked).
 */
export async function discardFile(repoPath: string, filePath: string): Promise<void> {
  // Always try to reset first in case it's staged
  await runGit(repoPath, ['reset', 'HEAD', '--', filePath])
  // Try to checkout (restore modified/deleted files)
  await runGit(repoPath, ['checkout', 'HEAD', '--', filePath])
  // Try to clean (remove untracked files)
  await runGit(repoPath, ['clean', '-f', '-q', '--', filePath])
}
