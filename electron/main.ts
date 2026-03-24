import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { highlightCode, initHighlighter } from './services/syntax/highlighter'
import { getLog } from './services/git/gitLog'
import { getAllRefs } from './services/git/gitRefs'
import { getCommitDetail, getFileTree, getFileContent } from './services/git/gitShow'
import { checkoutBranch, checkoutRemoteBranch } from './services/git/gitCheckout'
import { gitFetch } from './services/git/gitFetch'
import { getLocalChanges } from './services/git/gitStatus'
import { getFileDiff } from './services/git/gitDiff'
import { discardFile, stageFile, unstageFile } from './services/git/gitStage'
import { commit } from './services/git/gitCommit'
import { cherryPick, abortCherryPick, continueCherryPick } from './services/git/gitCherryPick'
import { createBranch, deleteBranch, deleteRemoteBranch, setBranchUpstream, unsetBranchUpstream } from './services/git/gitBranch'
import { gitPush } from './services/git/gitPush'
import { gitPull } from './services/git/gitPull'
import { mergeBranch, abortMerge, continueMerge } from './services/git/gitMerge'
import { rebaseBranch, abortRebase, continueRebase } from './services/git/gitRebase'
import { cloneRepo } from './services/git/gitClone'
import { openPullRequest, isPullRequestSupported } from './services/git/gitPullRequest'
import { getConflicts, getConflictDetails, resolveConflict } from './services/git/gitConflicts'
import { createTag, deleteTag } from './services/git/gitTag'
import { stashPush, stashPop, stashApply, stashDrop } from './services/git/gitStash'
import { getGlobalConfig, setGlobalConfig, getDetectedGitVersions } from './services/git/gitSettings'
import { setGitExecutable, setVerboseLogging } from './services/git/gitRunner'
import { initGitLogger } from './services/git/gitLogger'
import type { GitRepoData } from './shared/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized: boolean
}

interface AppSettings {
  theme: 'light' | 'dark'
  gitPath?: string
  commitSortOrder?: 'topo' | 'date'
  verboseLogging?: boolean
  showStashes?: boolean
  mergeConflictSyntaxHighlighting?: boolean
}

const getWindowStatePath = () => path.join(app.getPath('userData'), 'window-state.json')

function loadWindowState(): WindowState {
  const defaultState: WindowState = {
    width: 1200,
    height: 800,
    isMaximized: false
  }

  try {
    if (fs.existsSync(getWindowStatePath())) {
      const data = fs.readFileSync(getWindowStatePath(), 'utf-8')
      return { ...defaultState, ...JSON.parse(data) }
    }
  } catch (e) {
    console.error('Failed to load window state:', e)
  }
  return defaultState
}

function saveWindowState(window: BrowserWindow) {
  try {
    const isMaximized = window.isMaximized()
    let state: WindowState

    if (isMaximized) {
      // If maximized, we want to keep the previous (unmaximized) bounds if possible
      // But for simplicity, we'll just save the maximized flag.
      // Most users expect the window to return to its previous size when unmaximized.
      const current = loadWindowState()
      state = {
        ...current,
        isMaximized: true
      }
    } else {
      const bounds = window.getBounds()
      state = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized: false
      }
    }

    fs.writeFileSync(getWindowStatePath(), JSON.stringify(state), 'utf-8')
  } catch (e) {
    console.error('Failed to save window state:', e)
  }
}

let saveTimeout: NodeJS.Timeout | null = null
function debounceSaveWindowState(window: BrowserWindow) {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveWindowState(window)
    saveTimeout = null
  }, 500)
}

// ── App Settings Persistence ──────────────────────────────────
const getSettingsPath = () => path.join(app.getPath('userData'), 'settings.json')

function loadSettings(): AppSettings {
  const defaultSettings: AppSettings = {
    theme: 'dark',
    gitPath: 'system',
    commitSortOrder: 'topo',
    verboseLogging: false,
    showStashes: false,
    mergeConflictSyntaxHighlighting: true
  }

  try {
    if (fs.existsSync(getSettingsPath())) {
      const data = fs.readFileSync(getSettingsPath(), 'utf-8')
      return { ...defaultSettings, ...JSON.parse(data) }
    }
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
  return defaultSettings
}

function saveSettings(settings: AppSettings) {
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}

const currentSettings = loadSettings()
initGitLogger(app.getPath('userData'))
setGitExecutable(currentSettings.gitPath || 'system')
setVerboseLogging(!!currentSettings.verboseLogging)
initHighlighter().catch(console.error) // Initialize syntax highlighter early

function setGitPath(path: string) {
  currentSettings.gitPath = path
  saveSettings(currentSettings)
  setGitExecutable(path || 'system')
}


function setTheme(theme: 'light' | 'dark') {
  currentSettings.theme = theme
  saveSettings(currentSettings)
  
  const isDark = theme === 'dark'
  const overlayOptions = {
    color: isDark ? '#17181C' : '#F4F4F5',
    symbolColor: isDark ? '#A1A1AA' : '#52525B',
    height: 39
  }

  // Notify all windows and update their title bar overlay
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send('system:theme-updated', theme)
    if (process.platform === 'win32') {
      try {
        window.setTitleBarOverlay(overlayOptions)
      } catch (e) {
        // Some windows might not have overlay enabled
      }
    }
  })
  
  // Update the menu to reflect the selection
  const menu = Menu.getApplicationMenu()
  if (menu) {
    const lightItem = menu.getMenuItemById('theme-light')
    const darkItem = menu.getMenuItemById('theme-dark')
    if (lightItem) lightItem.checked = theme === 'light'
    if (darkItem) darkItem.checked = theme === 'dark'
  }
}

function createWindow() {
  const state = loadWindowState()

  win = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    icon: path.join(process.env.VITE_PUBLIC, 'app_icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: currentSettings.theme === 'dark' ? '#17181C' : '#F4F4F5',
      symbolColor: currentSettings.theme === 'dark' ? '#A1A1AA' : '#52525B',
      height: 39
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  if (state.isMaximized) {
    win.maximize()
  }

  // Register window state listeners
  win.on('resize', () => debounceSaveWindowState(win!))
  win.on('move', () => debounceSaveWindowState(win!))
  win.on('maximize', () => debounceSaveWindowState(win!))
  win.on('unmaximize', () => debounceSaveWindowState(win!))

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// ── IPC Handlers ───────────────────────────────────────────────

function validatePath(repoPath: unknown): asserts repoPath is string {
  if (!repoPath || typeof repoPath !== 'string') {
    throw new Error('Invalid repository path')
  }
}

function validateHash(hash: unknown): asserts hash is string {
  if (!hash || typeof hash !== 'string') {
    throw new Error('Invalid commit hash')
  }
}

app.whenReady().then(() => {
  const isMac = process.platform === 'darwin'
  const template: any = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
          ]
        }]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => createSettingsWindow()
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [
                  { role: 'startSpeaking' },
                  { role: 'stopSpeaking' }
                ]
              }
            ]
          : [
              { role: 'delete' },
              { type: 'separator' },
              { role: 'selectAll' }
            ])
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: 'Theme',
          submenu: [
            {
              id: 'theme-light',
              label: 'Light Mode',
              type: 'radio',
              checked: currentSettings.theme === 'light',
              click: () => setTheme('light')
            },
            {
              id: 'theme-dark',
              label: 'Dark Mode',
              type: 'radio',
              checked: currentSettings.theme === 'dark',
              click: () => setTheme('dark')
            }
          ]
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' }
            ]
          : [
              { role: 'close' }
            ])
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'About',
          click: async () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About Reforge',
              message: `Reforge v${app.getVersion()}`,
              detail: 'A cross-platform desktop Git GUI'
            })
          }
        }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))

  // ── System: directory picker ─────────────────────────────────
  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory']
    })
    if (canceled) {
      return null
    } else {
      return filePaths[0]
    }
  })

  // ── System: workspace state ──────────────────────────────────
  const getWorkspaceStatePath = () => path.join(app.getPath('userData'), 'workspace-state.json')

  ipcMain.handle('system:getWorkspaceState', async () => {
    try {
      if (fs.existsSync(getWorkspaceStatePath())) {
        const data = fs.readFileSync(getWorkspaceStatePath(), 'utf-8')
        return JSON.parse(data)
      }
      return null
    } catch (e) {
      console.error('Failed to load workspace state:', e)
      return null
    }
  })

  ipcMain.on('system:saveWorkspaceState', (_event, state) => {
    try {
      fs.writeFileSync(getWorkspaceStatePath(), JSON.stringify(state), 'utf-8')
    } catch (e) {
      console.error('Failed to save workspace state:', e)
    }
  })

  // ── System: theme & gitPath ──────────────────────────────────
  ipcMain.handle('system:getTheme', () => {
    return currentSettings.theme
  })

  ipcMain.handle('system:getCommitSortOrder', () => {
    return currentSettings.commitSortOrder || 'topo'
  })

  ipcMain.on('system:setCommitSortOrder', (_event, order: 'topo' | 'date') => {
    currentSettings.commitSortOrder = order
    saveSettings(currentSettings)
  })

  ipcMain.handle('system:getGitPath', () => {
    return currentSettings.gitPath || 'system'
  })

  ipcMain.on('system:setGitPath', (_event, gitPath: string) => {
    setGitPath(gitPath)
  })
  
  ipcMain.handle('system:getVerboseLogging', () => {
    return !!currentSettings.verboseLogging
  })

  ipcMain.on('system:setVerboseLogging', (_event, enabled: boolean) => {
    currentSettings.verboseLogging = enabled
    saveSettings(currentSettings)
    setVerboseLogging(enabled)
  })

  ipcMain.handle('system:getShowStashes', () => {
    return !!currentSettings.showStashes
  })

  ipcMain.on('system:setShowStashes', (_event, enabled: boolean) => {
    currentSettings.showStashes = enabled
    saveSettings(currentSettings)
  })
  
  ipcMain.handle('system:getMergeConflictSyntaxHighlighting', () => {
    return !!currentSettings.mergeConflictSyntaxHighlighting
  })

  ipcMain.on('system:setMergeConflictSyntaxHighlighting', (_event, enabled: boolean) => {
    currentSettings.mergeConflictSyntaxHighlighting = enabled
    saveSettings(currentSettings)
  })

  ipcMain.handle('system:highlightCode', (_event, code: string, lang: string, theme: string) => {
    return highlightCode(code, lang, theme as 'light' | 'dark')
  })

  ipcMain.on('system:quit', () => {
    app.quit()
  })

  ipcMain.on('system:openGitLog', () => {
    const logPath = path.join(app.getPath('userData'), 'git.log')
    if (fs.existsSync(logPath)) {
      shell.openPath(logPath)
    } else {
      dialog.showErrorBox('File not found', 'The git.log file does not exist yet. Try performing some git operations first.')
    }
  })

  ipcMain.on('system:reload', () => {
    win?.webContents.reloadIgnoringCache()
  })

  ipcMain.on('system:openAbout', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'About Reforge',
      message: `Reforge v${app.getVersion()}`,
      detail: 'A cross-platform desktop Git GUI'
    })
  })


  ipcMain.on('system:minimize', () => {
    win?.minimize()
  })

  ipcMain.on('system:maximize', () => {
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.on('system:close', () => {
    win?.close()
  })

  ipcMain.on('system:setTheme', (_event, theme: 'light' | 'dark') => {
    setTheme(theme)
  })

  ipcMain.on('system:openSettings', () => {
    createSettingsWindow()
  })

  ipcMain.on('system:zoom-in', () => {
    const level = win?.webContents.getZoomLevel() ?? 0
    win?.webContents.setZoomLevel(level + 0.5)
  })

  ipcMain.on('system:zoom-out', () => {
    const level = win?.webContents.getZoomLevel() ?? 0
    win?.webContents.setZoomLevel(level - 0.5)
  })

  ipcMain.on('system:zoom-reset', () => {
    win?.webContents.setZoomLevel(0)
  })

  ipcMain.on('system:toggle-fullscreen', () => {
    const isFullScreen = win?.isFullScreen()
    win?.setFullScreen(!isFullScreen)
  })


  // ── Git: load full repository data ───────────────────────────
  ipcMain.handle('git:getRepoData', async (_event, repoPath: unknown) => {
    validatePath(repoPath)

    const order = currentSettings.commitSortOrder || 'topo'
    const showStashes = !!currentSettings.showStashes
    const [refsResult, commits, localChanges, isPrSupported] = await Promise.all([
      getAllRefs(repoPath),
      getLog(repoPath, 200, order, showStashes),
      getLocalChanges(repoPath),
      isPullRequestSupported(repoPath),
    ])

    // Count uncommitted changes from porcelain output
    const localChangesCount = localChanges.staged.length + localChanges.unstaged.length

    // Extract repo name from the path
    const repoName = path.basename(repoPath)

    const data: GitRepoData = {
      repoName,
      currentBranch: refsResult.currentBranch,
      refs: refsResult.refs,
      commits,
      localChangesCount,
      isPrSupported,
      isMerging: localChanges.isMerging,
      isRebasing: localChanges.isRebasing,
      isCherryPicking: localChanges.isCherryPicking,
    }

    return data
  })

  // ── Git: get single commit detail ────────────────────────────
  ipcMain.handle('git:getCommitDetail', async (_event, repoPath: unknown, hash: unknown) => {
    validatePath(repoPath)
    validateHash(hash)
    return await getCommitDetail(repoPath, hash)
  })
  
  // ── Git: get file tree at commit ─────────────────────────────
  ipcMain.handle('git:getFileTree', async (_event, repoPath: unknown, hash: unknown) => {
    validatePath(repoPath)
    validateHash(hash)
    return await getFileTree(repoPath, hash)
  })

  // ── Git: get file content at commit ──────────────────────────
  ipcMain.handle('git:getFileContent', async (_event, repoPath: unknown, hash: unknown, filePath: unknown) => {
    validatePath(repoPath)
    validateHash(hash)
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path')
    }
    return await getFileContent(repoPath, hash, filePath)
  })
  
  // ── Git: create tag ──────────────────────────────────────────
  ipcMain.handle('git:createTag', async (_event, repoPath: unknown, name: unknown, message: unknown, hash: unknown, push: unknown) => {
    validatePath(repoPath)
    if (!name || typeof name !== 'string') {
      throw new Error('Invalid tag name')
    }
    if (typeof message !== 'string') {
      throw new Error('Invalid tag message')
    }
    validateHash(hash)
    await createTag(repoPath, name, message, hash, push === true)
  })

  ipcMain.handle('git:deleteTag', async (_event, repoPath: unknown, name: unknown, push: unknown) => {
    validatePath(repoPath)
    if (!name || typeof name !== 'string') {
      throw new Error('Invalid tag name')
    }
    await deleteTag(repoPath, name, push === true)
  })


  // ── Git: get commit log ──────────────────────────────────────
  ipcMain.handle('git:getLog', async (_event, repoPath: unknown, limit?: unknown) => {
    validatePath(repoPath)
    const maxCount = typeof limit === 'number' && limit > 0 ? limit : 200
    const order = currentSettings.commitSortOrder || 'topo'
    return await getLog(repoPath, maxCount, order)
  })

  // ── Git: checkout branch ─────────────────────────────────────
  ipcMain.handle('git:checkoutBranch', async (_event, repoPath: unknown, branch: unknown) => {
    validatePath(repoPath)
    if (!branch || typeof branch !== 'string') {
      throw new Error('Invalid branch name')
    }
    await checkoutBranch(repoPath, branch)
  })

  ipcMain.handle('git:checkoutRemoteBranch', async (_event, repoPath: unknown, remote: unknown, branch: unknown) => {
    validatePath(repoPath)
    if (!remote || typeof remote !== 'string') {
      throw new Error('Invalid remote name')
    }
    if (!branch || typeof branch !== 'string') {
      throw new Error('Invalid branch name')
    }
    await checkoutRemoteBranch(repoPath, remote, branch)
  })

  // ── Git: fetch ───────────────────────────────────────────────
  ipcMain.handle('git:fetch', async (_event, repoPath: unknown) => {
    validatePath(repoPath)
    await gitFetch(repoPath)
  })

  // ── Git: local changes (status) ─────────────────────────────
  ipcMain.handle('git:getLocalChanges', async (_event, repoPath: unknown) => {
    validatePath(repoPath)
    return await getLocalChanges(repoPath)
  })

  // ── Git: file diff ──────────────────────────────────────────
  ipcMain.handle('git:getFileDiff', async (_event, repoPath: unknown, filePath: unknown, staged: unknown, amend: unknown, revision: unknown) => {
    validatePath(repoPath)
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path')
    }
    return await getFileDiff(
      repoPath, 
      filePath, 
      staged === true, 
      amend === true, 
      typeof revision === 'string' ? revision : undefined
    )
  })

  // ── Git: stage file ─────────────────────────────────────────
  ipcMain.handle('git:stageFile', async (_event, repoPath: unknown, filePath: unknown, isIgnored?: unknown) => {
    validatePath(repoPath)
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path')
    }
    await stageFile(repoPath, filePath, isIgnored === true)
  })

  // ── Git: unstage file ───────────────────────────────────────
  ipcMain.handle('git:unstageFile', async (_event, repoPath: unknown, filePath: unknown) => {
    validatePath(repoPath)
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path')
    }
    await unstageFile(repoPath, filePath)
  })

  // ── Git: discard file ───────────────────────────────────────
  ipcMain.handle('git:discardFile', async (_event, repoPath: unknown, filePath: unknown) => {
    validatePath(repoPath)
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path')
    }
    await discardFile(repoPath, filePath)
  })

  // ── Git: commit ─────────────────────────────────────────────
  ipcMain.handle('git:commit', async (_event, repoPath: unknown, message: unknown, amend: unknown) => {
    validatePath(repoPath)
    if (!message || typeof message !== 'string') {
      throw new Error('Invalid commit message')
    }
    await commit(repoPath, message, amend === true)
  })
  
  // ── Git: create branch ──────────────────────────────────────
  ipcMain.handle('git:createBranch', async (_event, repoPath: unknown, branch: unknown) => {
    validatePath(repoPath)
    if (!branch || typeof branch !== 'string') {
      throw new Error('Invalid branch name')
    }
    await createBranch(repoPath, branch)
  })

  // ── Git: delete branch ──────────────────────────────────────
  ipcMain.handle('git:deleteBranch', async (_event, repoPath: unknown, branch: unknown) => {
    validatePath(repoPath)
    if (!branch || typeof branch !== 'string') {
      throw new Error('Invalid branch name')
    }
    await deleteBranch(repoPath, branch)
  })
  
  ipcMain.handle('git:deleteRemoteBranch', async (_event, repoPath: unknown, remote: unknown, branch: unknown) => {
    validatePath(repoPath)
    if (!remote || typeof remote !== 'string') {
      throw new Error('Invalid remote name')
    }
    if (!branch || typeof branch !== 'string') {
      throw new Error('Invalid branch name')
    }
    await deleteRemoteBranch(repoPath, remote, branch)
  })

  // ── Git: branch tracking ────────────────────────────────────
  ipcMain.handle('git:setBranchUpstream', async (_event, repoPath: unknown, branch: unknown, upstream: unknown) => {
    validatePath(repoPath)
    if (!branch || typeof branch !== 'string') {
      throw new Error('Invalid branch name')
    }
    if (!upstream || typeof upstream !== 'string') {
      throw new Error('Invalid upstream name')
    }
    await setBranchUpstream(repoPath, branch, upstream)
  })

  ipcMain.handle('git:unsetBranchUpstream', async (_event, repoPath: unknown, branch: unknown) => {
    validatePath(repoPath)
    if (!branch || typeof branch !== 'string') {
      throw new Error('Invalid branch name')
    }
    await unsetBranchUpstream(repoPath, branch)
  })

  // ── Git: push ───────────────────────────────────────────────
  ipcMain.handle('git:push', async (_event, repoPath: unknown, branch: unknown, force: unknown) => {
    validatePath(repoPath)
    if (!branch || typeof branch !== 'string') {
      throw new Error('Invalid branch name')
    }
    await gitPush(repoPath, branch, force === true)
  })

  // ── Git: pull ───────────────────────────────────────────────
  ipcMain.handle('git:pull', async (_event, repoPath: unknown, branch: unknown, rebase: unknown) => {
    validatePath(repoPath)
    if (!branch || typeof branch !== 'string') {
      throw new Error('Invalid branch name')
    }
    await gitPull(repoPath, branch, rebase === true)
  })
  
  // ── Git: merge ──────────────────────────────────────────────
  ipcMain.handle('git:merge', async (_event, repoPath: unknown, branch: unknown) => {
    validatePath(repoPath)
    if (!branch || typeof branch !== 'string') {
      throw new Error('Invalid branch name')
    }
    await mergeBranch(repoPath, branch)
  })

  // ── Git: abort merge ────────────────────────────────────────
  ipcMain.handle('git:abortMerge', async (_event, repoPath: unknown) => {
    validatePath(repoPath)
    return await abortMerge(repoPath)
  })

  ipcMain.handle('git:continueMerge', async (_event, repoPath: unknown) => {
    validatePath(repoPath)
    return await continueMerge(repoPath)
  })

  // ── Git: rebase ─────────────────────────────────────────────
  ipcMain.handle('git:rebase', async (_event, repoPath: unknown, branch: unknown) => {
    validatePath(repoPath)
    if (!branch || typeof branch !== 'string') {
      throw new Error('Invalid branch name')
    }
    await rebaseBranch(repoPath, branch)
  })

  ipcMain.handle('git:abortRebase', async (_event, repoPath: unknown) => {
    validatePath(repoPath)
    return await abortRebase(repoPath)
  })

  ipcMain.handle('git:continueRebase', async (_event, repoPath: unknown) => {
    validatePath(repoPath)
    return await continueRebase(repoPath)
  })

  // ── Git: cherry-pick ─────────────────────────────────────────
  ipcMain.handle('git:cherryPick', async (_event, repoPath: unknown, hash: unknown) => {
    validatePath(repoPath)
    validateHash(hash)
    await cherryPick(repoPath, hash)
  })

  ipcMain.handle('git:abortCherryPick', async (_event, repoPath: unknown) => {
    validatePath(repoPath)
    return await abortCherryPick(repoPath)
  })

  ipcMain.handle('git:continueCherryPick', async (_event, repoPath: unknown) => {
    validatePath(repoPath)
    return await continueCherryPick(repoPath)
  })

  // ── Git: clone ──────────────────────────────────────────────
  ipcMain.handle('git:clone', async (_event, url: unknown, parentPath: unknown, name: unknown) => {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid repository URL')
    }
    if (!parentPath || typeof parentPath !== 'string') {
      throw new Error('Invalid parent path')
    }
    if (!name || typeof name !== 'string') {
      throw new Error('Invalid repository name')
    }
    await cloneRepo(url, parentPath, name)
  })
  
  // ── Git: open pull request ──────────────────────────────────
  ipcMain.handle('git:openPullRequest', async (_event, repoPath: unknown, branch: unknown) => {
    validatePath(repoPath)
    if (!branch || typeof branch !== 'string') {
      throw new Error('Invalid branch name')
    }
    await openPullRequest(repoPath, branch)
  })
  
  // ── Git: stash ───────────────────────────────────────────────
  ipcMain.handle('git:stashPush', async (_event, repoPath: unknown, message: unknown, includeUntracked: unknown) => {
    validatePath(repoPath)
    await stashPush(repoPath, typeof message === 'string' ? message : undefined, includeUntracked === true)
  })

  ipcMain.handle('git:stashPop', async (_event, repoPath: unknown, index: unknown) => {
    validatePath(repoPath)
    await stashPop(repoPath, typeof index === 'number' ? index : undefined)
  })

  ipcMain.handle('git:stashApply', async (_event, repoPath: unknown, index: unknown) => {
    validatePath(repoPath)
    await stashApply(repoPath, typeof index === 'number' ? index : undefined)
  })

  ipcMain.handle('git:stashDrop', async (_event, repoPath: unknown, index: unknown) => {
    validatePath(repoPath)
    await stashDrop(repoPath, typeof index === 'number' ? index : undefined)
  })

  // ── Git: conflicts ──────────────────────────────────────────
  ipcMain.handle('git:getConflicts', async (_event, repoPath: unknown) => {
    validatePath(repoPath)
    return await getConflicts(repoPath)
  })

  // ── Git: global config and settings ─────────────────────────
  ipcMain.handle('git:getGlobalConfig', async () => {
    return await getGlobalConfig()
  })

  ipcMain.handle('git:setGlobalConfig', async (_event, name: unknown, email: unknown) => {
    if (typeof name !== 'string' || typeof email !== 'string') {
      throw new Error('Invalid name or email')
    }
    await setGlobalConfig(name, email)
  })

  ipcMain.handle('git:getDetectedGitVersions', async () => {
    return await getDetectedGitVersions()
  })


  ipcMain.handle('git:getConflictDetails', async (_event, repoPath: unknown, filePath: unknown) => {
    validatePath(repoPath)
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path')
    }
    return await getConflictDetails(repoPath, filePath)
  })

  ipcMain.handle('git:resolveConflict', async (_event, repoPath: unknown, filePath: unknown, content: unknown) => {
    validatePath(repoPath)
    if (typeof filePath !== 'string' || typeof content !== 'string') throw new Error('Invalid arguments')
    return await resolveConflict(repoPath, filePath, content)
  })

  ipcMain.handle('git:openMergeTool', async (_event, repoPath: unknown) => {
    validatePath(repoPath)
    
    const width = 1100
    const height = 700
    const mainBounds = win?.getBounds()
    
    let x: number | undefined
    let y: number | undefined
    
    if (mainBounds) {
      x = Math.floor(mainBounds.x + (mainBounds.width - width) / 2)
      y = Math.floor(mainBounds.y + (mainBounds.height - height) / 2)
    }

    const mergeWin = new BrowserWindow({
      width,
      height,
      x,
      y,
      title: `Merge Conflict - ${path.basename(repoPath)}`,
      icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.mjs'),
      },
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: currentSettings.theme === 'dark' ? '#17181C' : '#F4F4F5',
        symbolColor: currentSettings.theme === 'dark' ? '#A1A1AA' : '#52525B',
        height: 39
      },
      // Remove menu for the merge tool
      autoHideMenuBar: true
    })

    const url = VITE_DEV_SERVER_URL 
      ? `${VITE_DEV_SERVER_URL}?merge=true&repoPath=${encodeURIComponent(repoPath)}`
      : `file://${path.join(RENDERER_DIST, 'index.html')}?merge=true&repoPath=${encodeURIComponent(repoPath)}`

    if (VITE_DEV_SERVER_URL) {
      mergeWin.loadURL(url)
    } else {
      mergeWin.loadURL(url)
    }

    return true
  })

  function createSettingsWindow() {
    const width = 800
    const height = 600
    const mainBounds = win?.getBounds()
    
    let x: number | undefined
    let y: number | undefined
    
    if (mainBounds) {
      x = Math.floor(mainBounds.x + (mainBounds.width - width) / 2)
      y = Math.floor(mainBounds.y + (mainBounds.height - height) / 2)
    }

    const settingsWin = new BrowserWindow({
      width,
      height,
      x,
      y,
      title: 'Settings',
      icon: path.join(process.env.VITE_PUBLIC, 'app_icon.png'),
      resizable: true,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.mjs'),
      },
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: currentSettings.theme === 'dark' ? '#17181C' : '#F4F4F5',
        symbolColor: currentSettings.theme === 'dark' ? '#A1A1AA' : '#52525B',
        height: 39
      },
    })

    const url = VITE_DEV_SERVER_URL 
      ? `${VITE_DEV_SERVER_URL}?settings=true`
      : `file://${path.join(RENDERER_DIST, 'index.html')}?settings=true`

    settingsWin.loadURL(url)
  }

  createWindow()
})
