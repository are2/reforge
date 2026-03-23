import { ipcRenderer, contextBridge } from 'electron'
import type { GitAPI, SystemAPI } from './shared/types'

// ── Typed Git API bridge ───────────────────────────────────────
// Expose a narrow, task-specific API instead of raw ipcRenderer.

const gitApi: GitAPI = {
  getRepoData: (repoPath: string) =>
    ipcRenderer.invoke('git:getRepoData', repoPath),

  getCommitDetail: (repoPath: string, hash: string) =>
    ipcRenderer.invoke('git:getCommitDetail', repoPath, hash),

  getLog: (repoPath: string, limit?: number) =>
    ipcRenderer.invoke('git:getLog', repoPath, limit),

  checkoutBranch: (repoPath: string, branch: string) =>
    ipcRenderer.invoke('git:checkoutBranch', repoPath, branch),

  checkoutRemoteBranch: (repoPath: string, remote: string, branch: string) =>
    ipcRenderer.invoke('git:checkoutRemoteBranch', repoPath, remote, branch),

  fetch: (repoPath: string) =>
    ipcRenderer.invoke('git:fetch', repoPath),

  getLocalChanges: (repoPath: string) =>
    ipcRenderer.invoke('git:getLocalChanges', repoPath),

  getFileDiff: (repoPath: string, filePath: string, staged: boolean, amend?: boolean, revision?: string) =>
    ipcRenderer.invoke('git:getFileDiff', repoPath, filePath, staged, amend, revision),

  stageFile: (repoPath: string, filePath: string, isIgnored?: boolean) =>
    ipcRenderer.invoke('git:stageFile', repoPath, filePath, isIgnored),

  unstageFile: (repoPath: string, filePath: string) =>
    ipcRenderer.invoke('git:unstageFile', repoPath, filePath),

  discardFile: (repoPath: string, filePath: string) =>
    ipcRenderer.invoke('git:discardFile', repoPath, filePath),

  commit: (repoPath: string, message: string, amend?: boolean) =>
    ipcRenderer.invoke('git:commit', repoPath, message, amend),
  createBranch: (repoPath: string, branch: string) =>
    ipcRenderer.invoke('git:createBranch', repoPath, branch),
  push: (repoPath: string, branch: string, force: boolean) =>
    ipcRenderer.invoke('git:push', repoPath, branch, force),
  pull: (repoPath: string, branch: string, rebase: boolean) =>
    ipcRenderer.invoke('git:pull', repoPath, branch, rebase),
  setBranchUpstream: (repoPath: string, branch: string, upstream: string) =>
    ipcRenderer.invoke('git:setBranchUpstream', repoPath, branch, upstream),
  unsetBranchUpstream: (repoPath: string, branch: string) =>
    ipcRenderer.invoke('git:unsetBranchUpstream', repoPath, branch),
  merge: (repoPath: string, branch: string) =>
    ipcRenderer.invoke('git:merge', repoPath, branch),

  abortMerge: (repoPath: string) =>
    ipcRenderer.invoke('git:abortMerge', repoPath),
  continueMerge: (repoPath: string) => ipcRenderer.invoke('git:continueMerge', repoPath),

  rebase: (repoPath: string, branch: string) =>
    ipcRenderer.invoke('git:rebase', repoPath, branch),

  abortRebase: (repoPath: string) =>
    ipcRenderer.invoke('git:abortRebase', repoPath),
  continueRebase: (repoPath: string) => ipcRenderer.invoke('git:continueRebase', repoPath),

  deleteBranch: (repoPath: string, branch: string) =>
    ipcRenderer.invoke('git:deleteBranch', repoPath, branch),

  clone: (url: string, parentPath: string, name: string) =>
    ipcRenderer.invoke('git:clone', url, parentPath, name),

  openPullRequest: (repoPath: string, branch: string) =>
    ipcRenderer.invoke('git:openPullRequest', repoPath, branch),

  getConflicts: (repoPath: string) =>
    ipcRenderer.invoke('git:getConflicts', repoPath),

  getConflictDetails: (repoPath: string, filePath: string) =>
    ipcRenderer.invoke('git:getConflictDetails', repoPath, filePath),

  resolveConflict: (repoPath: string, filePath: string, content: string) =>
    ipcRenderer.invoke('git:resolveConflict', repoPath, filePath, content),
  cherryPick: (repoPath: string, hash: string) =>
    ipcRenderer.invoke('git:cherryPick', repoPath, hash),
  abortCherryPick: (repoPath: string) =>
    ipcRenderer.invoke('git:abortCherryPick', repoPath),
  continueCherryPick: (repoPath: string) => ipcRenderer.invoke('git:continueCherryPick', repoPath),
  openMergeTool: (repoPath: string) => ipcRenderer.invoke('git:openMergeTool', repoPath),
  getFileTree: (repoPath: string, hash: string) =>
    ipcRenderer.invoke('git:getFileTree', repoPath, hash),
  getFileContent: (repoPath: string, hash: string, filePath: string) =>
    ipcRenderer.invoke('git:getFileContent', repoPath, hash, filePath),
  createTag: (repoPath: string, name: string, message: string, hash: string, push: boolean) =>
    ipcRenderer.invoke('git:createTag', repoPath, name, message, hash, push),
  deleteTag: (repoPath: string, name: string, push: boolean) =>
    ipcRenderer.invoke('git:deleteTag', repoPath, name, push),
  deleteRemoteBranch: (repoPath: string, remote: string, branch: string) =>
    ipcRenderer.invoke('git:deleteRemoteBranch', repoPath, remote, branch),
  stashPush: (repoPath: string, message?: string, includeUntracked?: boolean) =>
    ipcRenderer.invoke('git:stashPush', repoPath, message, includeUntracked),
  stashPop: (repoPath: string, index?: number) =>
    ipcRenderer.invoke('git:stashPop', repoPath, index),
  stashApply: (repoPath: string, index?: number) =>
    ipcRenderer.invoke('git:stashApply', repoPath, index),
  stashDrop: (repoPath: string, index?: number) =>
    ipcRenderer.invoke('git:stashDrop', repoPath, index),
  getGlobalConfig: () =>
    ipcRenderer.invoke('git:getGlobalConfig'),
  setGlobalConfig: (name: string, email: string) =>
    ipcRenderer.invoke('git:setGlobalConfig', name, email),
  getDetectedGitVersions: () =>
    ipcRenderer.invoke('git:getDetectedGitVersions'),
}

const systemApi: SystemAPI = {
  selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
  getWorkspaceState: () => ipcRenderer.invoke('system:getWorkspaceState'),
  saveWorkspaceState: (state) => ipcRenderer.send('system:saveWorkspaceState', state),
  getTheme: () => ipcRenderer.invoke('system:getTheme'),
  onThemeUpdate: (callback) => {
    ipcRenderer.on('system:theme-updated', (_event, theme) => callback(theme))
  },
  quit: () => ipcRenderer.send('system:quit'),
  reload: () => ipcRenderer.send('system:reload'),
  openAbout: () => ipcRenderer.send('system:openAbout'),
  minimize: () => ipcRenderer.send('system:minimize'),
  maximize: () => ipcRenderer.send('system:maximize'),
  close: () => ipcRenderer.send('system:close'),
  zoomIn: () => ipcRenderer.send('system:zoom-in'),
  zoomOut: () => ipcRenderer.send('system:zoom-out'),
  zoomReset: () => ipcRenderer.send('system:zoom-reset'),
  toggleFullScreen: () => ipcRenderer.send('system:toggle-fullscreen'),
  setTheme: (theme) => ipcRenderer.send('system:setTheme', theme),
  openSettings: () => ipcRenderer.send('system:openSettings'),
  getCommitSortOrder: () => ipcRenderer.invoke('system:getCommitSortOrder'),
  setCommitSortOrder: (order) => ipcRenderer.send('system:setCommitSortOrder', order),
  getGitPath: () => ipcRenderer.invoke('system:getGitPath'),
  setGitPath: (path) => ipcRenderer.send('system:setGitPath', path),
}

contextBridge.exposeInMainWorld('git', gitApi)
contextBridge.exposeInMainWorld('system', systemApi)
