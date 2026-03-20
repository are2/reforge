import { runGitOrThrow } from './gitRunner'

/**
 * Push the specified branch to origin.
 * @param repoPath Path to the repository.
 * @param branch Name of the local branch to push.
 * @param force Whether to perform a force push.
 */
export async function gitPush(
  repoPath: string,
  branch: string,
  force: boolean = false
): Promise<void> {
  const args = ['push', 'origin', branch]
  if (force) {
    args.push('--force')
  }

  await runGitOrThrow(repoPath, args)
}
