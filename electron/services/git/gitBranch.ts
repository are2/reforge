import { runGitOrThrow } from './gitRunner'

/**
 * Create a new branch by name.
 * Throws if the branch creation fails (e.g. branch already exists).
 */
export async function createBranch(
  repoPath: string,
  branch: string,
): Promise<void> {
  await runGitOrThrow(repoPath, ['branch', branch])
}

/**
 * Delete a branch by name.
 * Uses -d (safe delete).
 */
export async function deleteBranch(
  repoPath: string,
  branch: string,
): Promise<void> {
  await runGitOrThrow(repoPath, ['branch', '-d', branch])
}
/**
 * Delete a remote branch.
 * Uses git push <remote> --delete <branch>.
 */
export async function deleteRemoteBranch(
  repoPath: string,
  remote: string,
  branch: string,
): Promise<void> {
  await runGitOrThrow(repoPath, ['push', remote, '--delete', branch])
}

/**
 * Configure tracking reference (upstream) for a branch.
 */
export async function setBranchUpstream(
  repoPath: string,
  branch: string,
  upstream: string,
): Promise<void> {
  await runGitOrThrow(repoPath, ['branch', '--set-upstream-to', upstream, branch])
}

/**
 * Remove tracking reference (upstream) from a branch.
 */
export async function unsetBranchUpstream(
  repoPath: string,
  branch: string,
): Promise<void> {
  await runGitOrThrow(repoPath, ['branch', '--unset-upstream', branch])
}
