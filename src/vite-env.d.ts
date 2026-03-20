/// <reference types="vite/client" />

interface Window {
  git: import('../electron/shared/types').GitAPI
  system: import('../electron/shared/types').SystemAPI
}
