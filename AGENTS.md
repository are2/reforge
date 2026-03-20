# Git GUI Desktop App — Agent Instructions

## Project purpose
- This repository is a cross-platform desktop Git GUI for Windows, macOS, and Linux.
- The project is scaffolded with `electron-vite` and should stay aligned with Electron's three-process model: **main**, **preload**, and **renderer**.
- Optimize for a polished desktop experience, predictable behavior, and safe process boundaries.

## Core architecture
- Keep a strict separation of concerns:
  - **main**: app lifecycle, windows, menus, native dialogs, filesystem access, Git execution, IPC handlers.
  - **preload**: narrow, typed bridge exposed to the renderer.
  - **renderer**: UI only. No direct Node.js or Electron access.
- Prefer **TypeScript** for new code.
- Preserve the existing renderer framework chosen by the scaffold. Do not rewrite the project to a different UI framework.
- Reuse the current project structure where possible. If new folders are needed, keep them obvious and consistent.

## Security rules
- Assume the renderer is unprivileged.
- Keep `contextIsolation` enabled.
- Do not enable broad renderer access to Node.js APIs.
- Expose only minimal, task-specific APIs from preload using a small surface area.
- Do not expose raw `ipcRenderer`, `fs`, `child_process`, or full Electron modules to the renderer.
- Validate all IPC input in the main process.
- Avoid loading remote content unless the task explicitly requires it.

## IPC conventions
- Use narrow request/response channels with clear names.
- Prefer a pattern like:
  - preload exposes `window.git.*`
  - renderer calls `window.git.someAction()`
  - preload forwards to main
  - main validates input and calls a service
- Keep shared DTOs and IPC contracts typed and easy to find.
- If an IPC method is only needed by one screen, still keep the API explicit rather than generic.

## Git integration rules
- Prefer using the **system `git` executable** from the main process.
- Use spawned processes with argument arrays. Do not build shell command strings by concatenation.
- Never pass untrusted input through a shell.
- Keep Git operations out of the renderer.
- Normalize Git output into UI-friendly data structures in the main process or a dedicated service layer.
- Handle common Git errors gracefully: missing repo, missing Git executable, auth failures, merge conflicts, detached HEAD, non-fast-forward push, uncommitted changes, and timeouts/cancellation.
- Keep cross-platform behavior in mind for file paths, environment variables, and process spawning.

## UI and UX direction
- This app is a **dense desktop productivity tool**, not a mobile-style interface.
- Favor information density, thin chrome, compact rows, and clear pane separation.
- The default mental model is:
  - top menu/toolbar
  - repo/workspace tabs
  - left sidebar for repository navigation and refs
  - upper main pane for commit history and graph
  - lower pane for commit details, changes, and file tree
- Prefer a **neutral-first** visual design with restrained accents.
- Use color mainly for state and Git semantics:
  - warm primary accents for graph, branches, modified state
  - secondary green accents for added/success state
  - minimal extra accent use for selection and metadata
- Keep dark mode and light mode equivalent in structure and hierarchy.
- Small radii, thin dividers, minimal shadows.

## Feature design principles
- Build features in a way that maps cleanly across the three Electron layers.
- For any new Git feature, think through:
  1. shared types/contracts
  2. preload API
  3. main IPC handler
  4. Git service / parser / state logic
  5. renderer UI
- Prefer incremental features over giant abstractions.
- Avoid speculative architecture unless there is repeated evidence it is needed.

## Code style
- Keep functions focused and readable.
- Prefer descriptive names over clever abstractions.
- Avoid `any` unless there is a strong reason.
- Add comments only where intent is not obvious from code.
- Prefer explicit error handling over silent failure.
- Clean up listeners, timers, and subscriptions.
- Keep state predictable and avoid hidden side effects.

## File and module guidance
- Good places for code usually look like:
  - `src/main/...` for main-process code
  - `src/preload/...` for preload bridge code
  - `src/renderer/...` for UI code
  - `src/shared/...` for types/contracts reused across layers
- If the current scaffold uses a different but similar layout, follow the repository's existing convention.

## Cross-platform expectations
- Do not hardcode OS-specific paths.
- Use path utilities instead of manual path concatenation.
- Do not assume Bash-specific behavior.
- Design file watching, spawning, opening paths, and shortcuts with Windows/macOS/Linux in mind.
- Treat packaging and native integration as cross-platform concerns by default.

## Performance expectations
- Keep the renderer responsive during long Git operations.
- Prefer async flows and cancellation where practical.
- Avoid doing heavy parsing or filesystem work in the renderer.
- Large histories, diffs, and file trees should degrade gracefully.

## Dependency policy
- Prefer the standard library and existing project dependencies first.
- Do not add a new dependency when the task can be solved cleanly without one.
- If a dependency is necessary, choose a small, well-maintained option and keep its usage isolated.

## Validation and completion
- Before making changes, inspect the repository's current structure and scripts.
- Use the package manager already used by the repo.
- Prefer running the smallest meaningful validation after changes:
  - typecheck if present
  - lint if present
  - targeted tests if present
  - build as a final confidence check when appropriate
- Do not invent scripts. Use only scripts that already exist in `package.json`.
- When finishing a task, summarize:
  - what changed
  - which layer(s) were touched
  - any follow-up work or known limitations

## When generating code for this repository
- Default to implementation-ready code, not pseudocode.
- Match the repository's naming, imports, and formatting style.
- If a task is ambiguous, prefer the safest implementation that preserves architecture and security.
- If a request would violate the process boundary rules, propose the safe version instead.
