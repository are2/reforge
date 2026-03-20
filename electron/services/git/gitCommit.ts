import { runGitOrThrow } from './gitRunner'

export async function commit(repoPath: string, message: string, amend?: boolean): Promise<void> {
  const args = ['commit']
  if (amend) args.push('--amend')
  args.push('-m', message)
  await runGitOrThrow(repoPath, args)
}
