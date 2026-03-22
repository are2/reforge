// ── Shared types used across main, preload, and renderer ───────

/** File-status enum used across components. */
export type FileStatus = 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'copied' | 'conflict'

export interface FileChange {
  path: string
  status: FileStatus
  /** Original path when status is 'renamed'. */
  oldPath?: string
}

export interface GitPerson {
  name: string
  email: string
  initials: string
}

export interface GitConfig {
  name: string
  email: string
}

export interface GitVersionInfo {
  path: string
  version: string
}


export interface GitRef {
  name: string
  type: 'local' | 'remote' | 'tag' | 'head'
}

export interface GitCommit {
  hash: string
  shortHash: string
  subject: string
  body: string[]
  author: GitPerson
  committer: GitPerson
  authorDate: string
  commitDate: string
  refs: GitRef[]
  parents: string[]
  files: FileChange[]
}

export interface GitTreeItem {
  path: string
  type: 'blob' | 'tree'
  size?: number
}

export interface FileContent {
  path: string
  content: string // base64 if binary, text otherwise
  isBinary: boolean
  mimeType: string
  size: number
}

export interface GitBranch {
  name: string
  isCurrent: boolean
  /** Hash of the tip commit (undefined for folder/group nodes). */
  tip?: string
  /** Upstream branch name (e.g. 'origin/master'). */
  upstream?: string
  /** Number of commits ahead of remote. */
  ahead?: number
  /** Number of commits behind remote. */
  behind?: number
  children?: GitBranch[]
}

export interface GitRemote {
  name: string
  url?: string
  branches: string[]
}

export interface GitTag {
  name: string
  hash: string
}

export interface GitStash {
  index: number
  message: string
}

export interface GitSubmodule {
  name: string
  path: string
  hash: string
}

export interface GitRefsData {
  branches: GitBranch[]
  remotes: GitRemote[]
  tags: GitTag[]
  stashes: GitStash[]
  submodules: GitSubmodule[]
}

export interface GitRepoData {
  repoName: string
  currentBranch: string
  refs: GitRefsData
  commits: GitCommit[]
  localChangesCount: number
  isPrSupported?: boolean
  isMerging?: boolean
  isRebasing?: boolean
  isCherryPicking?: boolean
}

// ── Local-changes types ────────────────────────────────────────

/** A single entry from `git status --porcelain`. */
export interface StatusEntry {
  path: string
  status: FileStatus
  oldPath?: string
  staged: boolean
  isIgnored?: boolean
}

/** Grouped local changes for the working tree. */
export interface LocalChangesData {
  staged: StatusEntry[]
  unstaged: StatusEntry[]
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context'
  content: string
  oldLineNo?: number
  newLineNo?: number
}

export interface DiffHunk {
  header: string
  lines: DiffLine[]
}

export interface FileDiff {
  path: string
  hunks: DiffHunk[]
  isBinary?: boolean
  mimeType?: string
  size?: number
  binaryContent?: string // base64 for images
}

/** Conflict resolution types */
export interface ConflictBlock {
  id: string
  type: 'stable' | 'conflict'
  content: string // The text if type === 'stable'
  ours?: string   // The text if type === 'conflict'
  theirs?: string // The text if type === 'conflict'
  base?: string   // The text if type === 'conflict' (if diff3)
  oursHeader?: string
  theirsHeader?: string
}

export interface ConflictDetails {
  path: string
  blocks: ConflictBlock[]
  base: string
  ours: string
  theirs: string
}

/** A single workspace tab representing an open repository. */
export interface WorkspaceTab {
  id: string
  repoPath: string
  label: string
}

/** Typed contract for the preload bridge exposed as window.git. */
export interface GitAPI {
  getRepoData(repoPath: string): Promise<GitRepoData>
  getCommitDetail(repoPath: string, hash: string): Promise<GitCommit>
  getLog(repoPath: string, limit?: number): Promise<GitCommit[]>
  checkoutBranch(repoPath: string, branch: string): Promise<void>
  fetch(repoPath: string): Promise<void>
  getLocalChanges(repoPath: string): Promise<LocalChangesData>
  getFileDiff(repoPath: string, filePath: string, staged: boolean, amend?: boolean, revision?: string): Promise<FileDiff>
  stageFile(repoPath: string, filePath: string, isIgnored?: boolean): Promise<void>
  unstageFile(repoPath: string, filePath: string): Promise<void>
  discardFile(repoPath: string, filePath: string): Promise<void>
  commit(repoPath: string, message: string, amend?: boolean): Promise<void>
  createBranch(repoPath: string, branch: string): Promise<void>
  push(repoPath: string, branch: string, force: boolean): Promise<void>
  pull(repoPath: string, branch: string, rebase: boolean): Promise<void>
  merge(repoPath: string, branch: string): Promise<void>
  abortMerge(repoPath: string): Promise<void>
  continueMerge(repoPath: string): Promise<void>
  rebase(repoPath: string, branch: string): Promise<void>
  abortRebase(repoPath: string): Promise<void>
  continueRebase(repoPath: string): Promise<void>
  deleteBranch(repoPath: string, branch: string): Promise<void>
  clone(url: string, parentPath: string, name: string): Promise<void>
  openPullRequest(repoPath: string, branch: string): Promise<void>
  getConflicts(repoPath: string): Promise<StatusEntry[]>
  getConflictDetails(repoPath: string, filePath: string): Promise<ConflictDetails>
  resolveConflict(repoPath: string, filePath: string, content: string): Promise<void>
  cherryPick(repoPath: string, hash: string): Promise<void>
  abortCherryPick(repoPath: string): Promise<void>
  continueCherryPick(repoPath: string): Promise<void>
  openMergeTool(repoPath: string): Promise<boolean>
  getFileTree(repoPath: string, hash: string): Promise<GitTreeItem[]>
  getFileContent(repoPath: string, hash: string, filePath: string): Promise<FileContent>
  createTag(repoPath: string, name: string, message: string, hash: string, push: boolean): Promise<void>
  deleteTag(repoPath: string, name: string, push: boolean): Promise<void>
  deleteRemoteBranch(repoPath: string, remote: string, branch: string): Promise<void>
  stashPush(repoPath: string, message?: string, includeUntracked?: boolean): Promise<void>
  stashPop(repoPath: string, index?: number): Promise<void>
  stashApply(repoPath: string, index?: number): Promise<void>
  stashDrop(repoPath: string, index?: number): Promise<void>
  getGlobalConfig(): Promise<GitConfig>
  setGlobalConfig(name: string, email: string): Promise<void>
  getDetectedGitVersions(): Promise<GitVersionInfo[]>
}

/** Application workspace state containing open tabs. */
export interface WorkspaceState {
  tabs: WorkspaceTab[]
  activeTabId: string | null
  historyPaneHeight?: number
  sidebarWidth?: number
}

/** Typed contract for system APIs exposed as window.system. */
export interface SystemAPI {
  selectFolder(): Promise<string | null>
  getWorkspaceState(): Promise<WorkspaceState | null>
  saveWorkspaceState(state: WorkspaceState): void
  getTheme(): Promise<'light' | 'dark'>
  onThemeUpdate(callback: (theme: 'light' | 'dark') => void): void
  quit(): void
  reload(): void
  openAbout(): void
  minimize(): void
  maximize(): void
  close(): void
  zoomIn(): void
  zoomOut(): void
  zoomReset(): void
  toggleFullScreen(): void
  setTheme(theme: 'light' | 'dark'): void
  openSettings(): void
  getCommitSortOrder(): Promise<'topo' | 'date'>
  setCommitSortOrder(order: 'topo' | 'date'): void
  getGitPath(): Promise<string>
  setGitPath(path: string): void
}
