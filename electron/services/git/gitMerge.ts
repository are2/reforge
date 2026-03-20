import { runGit, runGitOrThrow } from './gitRunner'

/**
 * Merge a branch into the current one.
 */
export async function mergeBranch(
  repoPath: string,
  branch: string,
): Promise<void> {
  await runGitOrThrow(repoPath, ['merge', branch])
}

/**
 * Abort an ongoing merge.
 */
export async function abortMerge(repoPath: string): Promise<void> {
  await runGitOrThrow(repoPath, ['merge', '--abort'])
}

/**
 * Continue an ongoing merge after resolving conflicts.
 */
export async function continueMerge(repoPath: string): Promise<void> {
  // Try merge --continue first (standard for modern Git)
  try {
    await runGit(repoPath, ['merge', '--continue'], { env: { GIT_EDITOR: 'true' } })
  } catch (e) {
    // Fallback to commit if it's an old version or specific state
    await runGitOrThrow(repoPath, ['commit', '--no-edit'])
  }
}
