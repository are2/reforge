import { runGitOrThrow } from './gitRunner'

/**
 * Cherry-pick a commit into the current branch.
 */
export async function cherryPick(
  repoPath: string,
  hash: string,
): Promise<void> {
  await runGitOrThrow(repoPath, ['cherry-pick', hash])
}

/**
 * Abort an ongoing cherry-pick.
 */
export async function abortCherryPick(repoPath: string): Promise<void> {
  await runGitOrThrow(repoPath, ['cherry-pick', '--abort'])
}

/**
 * Continue an ongoing cherry-pick after resolving conflicts.
 */
export async function continueCherryPick(repoPath: string): Promise<void> {
  await runGitOrThrow(repoPath, ['cherry-pick', '--continue'], { env: { GIT_EDITOR: 'true' } })
}
