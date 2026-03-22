import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { runGit, runGitOrThrow } from './gitRunner'
import type { GitConfig, GitVersionInfo } from '../../shared/types'

const execAsync = promisify(exec)

export async function getGlobalConfig(): Promise<GitConfig> {
  const config: GitConfig = { name: '', email: '' }

  try {
    const nameResult = await runGit(undefined, ['config', '--global', 'user.name'])
    if (nameResult.exitCode === 0) {
      config.name = nameResult.stdout.trim()
    }
  } catch (e) {
    // ignore
  }

  try {
    const emailResult = await runGit(undefined, ['config', '--global', 'user.email'])
    if (emailResult.exitCode === 0) {
      config.email = emailResult.stdout.trim()
    }
  } catch (e) {
    // ignore
  }

  return config
}

export async function setGlobalConfig(name: string, email: string): Promise<void> {
  if (name.trim()) {
    await runGitOrThrow(undefined, ['config', '--global', 'user.name', name.trim()])
  } else {
    // Unset if empty, though unsetting might throw if it doesn't exist. We cautiously ignore unset errors.
    await runGit(undefined, ['config', '--global', '--unset', 'user.name'])
  }

  if (email.trim()) {
    await runGitOrThrow(undefined, ['config', '--global', 'user.email', email.trim()])
  } else {
    await runGit(undefined, ['config', '--global', '--unset', 'user.email'])
  }
}

export async function getDetectedGitVersions(): Promise<GitVersionInfo[]> {
  const isWin = process.platform === 'win32'
  const command = isWin ? 'where git' : 'which -a git'
  const gitPaths = new Set<string>()

  try {
    const { stdout } = await execAsync(command)
    const lines = stdout.split('\n').map((line) => line.trim()).filter(Boolean)
    for (const line of lines) {
      gitPaths.add(line)
    }
  } catch (e) {
    // If 'where' or 'which' fails, it might mean git is not found at all.
    // We can also fallback to just 'git' to see if it's in PATH anyway.
    gitPaths.add('git')
  }

  // Deduplicate case-insensitively on Windows
  const uniquePaths: string[] = []
  const seenPaths = new Set<string>()
  for (const p of gitPaths) {
    const normalized = isWin ? p.toLowerCase() : p
    if (!seenPaths.has(normalized)) {
      seenPaths.add(normalized)
      uniquePaths.push(p)
    }
  }

  const results: GitVersionInfo[] = []
  for (const gitPath of uniquePaths) {
    try {
      const { stdout } = await execAsync(`"${gitPath}" --version`)
      const versionOutput = stdout.trim()
      if (versionOutput.startsWith('git version')) {
        results.push({
          path: gitPath,
          version: versionOutput.replace('git version', '').trim()
        })
      }
    } catch (e) {
      // ignore invalid paths
    }
  }

  return results
}
