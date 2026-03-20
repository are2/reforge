import { runGitOrThrow } from './gitRunner'

/**
 * Fetch branches and/or tags from one or more other repositories.
 */
export async function gitFetch(repoPath: string): Promise<void> {
  await runGitOrThrow(repoPath, ['fetch', '--all', '--tags'])
}
