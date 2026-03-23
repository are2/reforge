import fs from 'node:fs'
import path from 'node:path'

export interface GitLogEntry {
  timestamp: string
  repoPath?: string
  command: string
  args: string[]
  exitCode: number
  stdout: string
  stderr: string
}

let logFilePath: string | null = null

export function initGitLogger(userDataPath: string) {
  logFilePath = path.join(userDataPath, 'git.log')
}

export function logGitCommand(entry: GitLogEntry) {
  if (!logFilePath) return

  const logLine = `[${entry.timestamp}] REPO: ${entry.repoPath || 'N/A'}\n` +
    `COMMAND: git ${entry.args.join(' ')}\n` +
    `EXIT CODE: ${entry.exitCode}\n` +
    `STDOUT: ${entry.stdout.trim() || '(empty)'}\n` +
    `STDERR: ${entry.stderr.trim() || '(empty)'}\n` +
    `--------------------------------------------------------------------------------\n`

  try {
    fs.appendFileSync(logFilePath, logLine, 'utf-8')
  } catch (err) {
    console.error('Failed to write to git.log:', err)
  }
}
