import { runGitOrThrow } from './gitRunner'

/**
 * Pull changes from origin for the specified branch.
 * @param repoPath Path to the repository.
 * @param branch Name of the branch to pull.
 * @param rebase Whether to perform a rebase instead of a merge.
 */
export async function gitPull(
  repoPath: string,
  branch: string,
  rebase: boolean = false
): Promise<void> {
  const args = ['pull', 'origin', branch]
  if (rebase) {
    args.push('--rebase')
  }

  await runGitOrThrow(repoPath, args)
}
