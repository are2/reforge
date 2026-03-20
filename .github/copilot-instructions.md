# Git GUI Desktop App — Repository Instructions for GitHub Copilot

This repository is a cross-platform desktop Git GUI built with Electron and electron-vite.

Understand the app as three layers:
- `src/main`: Electron main process only. App lifecycle, windows, menus, dialogs, filesystem access, Git execution, IPC handlers.
- `src/preload`: narrow, typed bridge between renderer and main.
- `src/renderer`: UI only. No direct Node.js or Electron access.
- `src/shared`: shared contracts, DTOs, and utilities that are safe across layers.

General expectations:
- Prefer TypeScript for new code.
- Follow the repository's existing structure and naming patterns.
- Keep changes incremental and implementation-ready.
- Do not rewrite the renderer stack or introduce large architectural changes unless explicitly asked.

Security and process boundaries:
- Treat the renderer as unprivileged.
- Keep `contextIsolation` enabled.
- Do not expose raw `ipcRenderer`, `fs`, `child_process`, or full Electron modules to the renderer.
- Expose small, task-specific APIs from preload.
- Validate all IPC input in the main process.
- Avoid loading remote content unless explicitly required.

IPC rules:
- Prefer explicit request/response IPC.
- Use a pattern like `window.git.someAction()` in the renderer, implemented through preload and handled in main.
- Keep IPC channel names clear and scoped.
- Keep shared IPC request/response types easy to locate and reuse.

Git integration:
- Run Git from the main process using the system `git` executable.
- Use spawned processes with argument arrays, never shell-concatenated command strings.
- Never pass untrusted input through a shell.
- Normalize Git output into UI-friendly structures before it reaches the renderer.
- Handle common Git failures clearly: missing repo, missing Git, auth errors, conflicts, detached HEAD, non-fast-forward push, and uncommitted changes.

UI and UX direction:
- Build a dense desktop productivity UI, not a mobile-style interface.
- Favor compact toolbars, thin chrome, clear pane separation, and information density.
- The expected mental model is:
  - top menu and toolbar
  - repository/workspace tabs
  - left sidebar for refs and navigation
  - upper pane for commit history and graph
  - lower pane for commit details, changes, and file tree
- Keep the UI neutral-first with restrained color usage.
- Use warm primary accents for graph, branches, and modified state.
- Use secondary green accents for added and success state.
- Keep dark mode and light mode structurally equivalent.

Code quality:
- Prefer readable, focused functions.
- Avoid `any` unless unavoidable.
- Prefer explicit error handling over silent failure.
- Clean up subscriptions, listeners, and timers.
- Avoid hidden side effects.
- Add comments only where intent is not obvious.

Dependencies:
- Prefer the standard library and existing dependencies first.
- Do not add a dependency unless it clearly simplifies the solution.
- If a new dependency is necessary, keep it isolated and minimal.

Validation:
- Inspect the repo before making changes.
- Use the package manager already present in the repo.
- Use only scripts that already exist in `package.json`.
- Prefer the smallest meaningful validation after changes: typecheck, lint, targeted tests, then build if appropriate.

When completing work:
- Summarize what changed.
- State which Electron layer(s) were touched.
- Call out follow-up work or known limitations.
