import { runGit } from './gitRunner'

/**
 * Clone a remote repository into a local folder.
 * @param url Remote repository URL
 * @param parentPath Local parent directory where the repo will be cloned
 * @param name Name of the local repository folder
 */
export async function cloneRepo(url: string, parentPath: string, name: string): Promise<void> {
  const result = await runGit(parentPath, ['clone', url, name])
  
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || `Clone failed with exit code ${result.exitCode}`)
  }
}
