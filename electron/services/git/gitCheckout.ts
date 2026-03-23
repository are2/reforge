import { runGitOrThrow } from './gitRunner'

/**
 * Checkout a branch by name.
 * Throws if the checkout fails (e.g. uncommitted changes).
 */
export async function checkoutBranch(
  repoPath: string,
  branch: string,
): Promise<void> {
  await runGitOrThrow(repoPath, ['checkout', branch])
}
/**
 * Checkout a remote branch as a local tracking branch.
 */
export async function checkoutRemoteBranch(
  repoPath: string,
  remote: string,
  branch: string,
): Promise<void> {
  // Use --track to create a local branch that tracks the remote branch.
  // This fails if the local branch already exists.
  await runGitOrThrow(repoPath, ['checkout', '--track', `${remote}/${branch}`])
}
