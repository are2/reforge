import { spawn } from 'node:child_process'
import { logGitCommand } from './gitLogger'

export interface GitResult {
  stdout: string
  stdoutBuffer: Buffer
  stderr: string
  exitCode: number
}

let currentGitExecutable = 'git'
let isVerboseLoggingEnabled = false

export function setGitExecutable(path: string) {
  currentGitExecutable = path === 'system' ? 'git' : path
}

export function setVerboseLogging(enabled: boolean) {
  isVerboseLoggingEnabled = enabled
}


/**
 * Spawn `git` with the given arguments in the given repo directory.
 * Returns stdout/stderr/exitCode. Never throws on non-zero exit —
 * callers decide how to handle errors.
 */
export async function runGit(
  repoPath: string | undefined,
  args: string[],
  options?: { env?: Record<string, string> }
): Promise<GitResult> {

  const MAX_RETRIES = 5
  const RETRY_DELAY_MS = 100

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await new Promise<GitResult>((resolve, reject) => {
      const child = spawn(currentGitExecutable, args, {
        cwd: repoPath || undefined,
        stdio: ['ignore', 'pipe', 'pipe'],
        // Avoid locale-dependent output
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C', ...options?.env },
      })

      const stdoutChunks: Buffer[] = []
      let stderr = ''

      child.stdout.on('data', (chunk: Buffer) => {
        stdoutChunks.push(chunk)
      })

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
      })

      child.on('error', (err) => {
        reject(new Error(`Failed to spawn git: ${err.message}`))
      })

      child.on('close', (code) => {
        const stdoutBuffer = Buffer.concat(stdoutChunks)
        resolve({ 
          stdout: stdoutBuffer.toString(), 
          stdoutBuffer,
          stderr, 
          exitCode: code ?? -1 
        })
      })
    })

    // If it failed due to an index lock, and we have retries left, wait and retry
    if (result.exitCode !== 0 && result.stderr.includes('index.lock') && attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
      continue
    }

    // Log the command execution if verbose logging is enabled
    if (isVerboseLoggingEnabled) {
      logGitCommand({
        timestamp: new Date().toISOString(),
        repoPath: repoPath,
        command: currentGitExecutable,
        args: args,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
      })
    }

    return result
  }

  throw new Error('Unreachable code in runGit retry loop')
}

/**
 * Run git and throw if the exit code is non-zero.
 */
export async function runGitOrThrow(
  repoPath: string | undefined,
  args: string[],
  options?: { env?: Record<string, string> }
): Promise<string> {
  const result = await runGit(repoPath, args, options)
  if (result.exitCode !== 0) {
    const combined = (result.stdout + '\n' + result.stderr).trim()
    throw new Error(combined || `git ${args[0]} failed with exit code ${result.exitCode}`)
  }
  return result.stdout
}
