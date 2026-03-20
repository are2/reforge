import { runGitOrThrow } from './gitRunner'

/**
 * Rebase the current branch onto another branch.
 */
export async function rebaseBranch(
  repoPath: string,
  branch: string,
): Promise<void> {
  await runGitOrThrow(repoPath, ['rebase', branch])
}

/**
 * Abort an ongoing rebase.
 */
export async function abortRebase(repoPath: string): Promise<void> {
  await runGitOrThrow(repoPath, ['rebase', '--abort'])
}

/**
 * Continue an ongoing rebase after resolving conflicts.
 */
export async function continueRebase(repoPath: string): Promise<void> {
  await runGitOrThrow(repoPath, ['rebase', '--continue'], { env: { GIT_EDITOR: 'true' } })
}
