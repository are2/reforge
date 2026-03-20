import { runGitOrThrow } from './gitRunner'

/**
 * Create a new annotated tag.
 * @param repoPath Path to the repository
 * @param name Tag name
 * @param message Tag message
 * @param hash Commit hash to tag
 * @param push Whether to push the tag to origin
 */
export async function createTag(
  repoPath: string,
  name: string,
  message: string,
  hash: string,
  push: boolean
): Promise<void> {
  // 1. Create the tag
  // -a: annotated tag
  // -m: message
  const args = ['tag', '-a', name, '-m', message || name, hash]
  await runGitOrThrow(repoPath, args)

  // 2. Push if requested
  if (push) {
    await runGitOrThrow(repoPath, ['push', 'origin', name])
  }
}

/**
 * Delete a tag locally and optionally on remote.
 * @param repoPath Path to the repository
 * @param name Tag name
 * @param push Whether to delete the tag from origin
 */
export async function deleteTag(
  repoPath: string,
  name: string,
  push: boolean
): Promise<void> {
  // 1. Delete locally
  await runGitOrThrow(repoPath, ['tag', '-d', name])

  // 2. Delete on remote if requested
  if (push) {
    await runGitOrThrow(repoPath, ['push', 'origin', '--delete', name])
  }
}
