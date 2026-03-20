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
