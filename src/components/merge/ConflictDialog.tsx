import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'

interface ConflictDialogProps {
  isOpen: boolean
  onClose: () => void
  onResolve: () => void
  error?: string
}

export function ConflictDialog({ isOpen, onClose, onResolve, error }: ConflictDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Merge Conflict"
      maxWidth="500px"
      footer={
        <>
          <button className="button secondary" onClick={onClose}>
            Close
          </button>
          <button className="button primary" onClick={onResolve}>
            Resolve
          </button>
        </>
      }
    >
      <div className="conflict-dialog-body">
        <div className="conflict-icon-container">
          <Icon name="alert-triangle" size={32} color="var(--warning-color)" />
        </div>
        <div className="conflict-content">
          <h4 className="conflict-title">Automatic merge failed</h4>
          <p className="conflict-description">
            Conflicts were found in one or more files. You can close this window to resolve them manually later, or click <strong>Resolve</strong> to use the conflict resolution tool.
          </p>
          
          {error && (
            <div className="conflict-error-container">
              <div className="conflict-error-header">
                <Icon name="terminal" size={12} />
                <span>Git Output</span>
              </div>
              <div className="conflict-error-box">
                <code>{error}</code>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .conflict-dialog-body {
          display: flex;
          gap: 16px;
          padding: 4px 0;
        }
        .conflict-icon-container {
          flex-shrink: 0;
          padding-top: 2px;
        }
        .conflict-content {
          flex: 1;
          min-width: 0;
        }
        .conflict-title {
          margin: 0 0 8px 0;
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .conflict-description {
          margin: 0;
          font-size: 0.8125rem;
          line-height: 1.4;
          color: var(--text-secondary);
        }
        .conflict-error-container {
          margin-top: 16px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-secondary);
          overflow: hidden;
        }
        .conflict-error-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.03);
          border-bottom: 1px solid var(--border-color);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          color: var(--text-secondary);
        }
        .dark .conflict-error-header {
          background: rgba(255, 255, 255, 0.03);
        }
        .conflict-error-box {
          padding: 10px;
          max-height: 160px;
          overflow-y: auto;
        }
        .conflict-error-box code {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          line-height: 1.5;
          white-space: pre-wrap;
          color: var(--text-primary);
          display: block;
        }
      `}</style>
    </Modal>
  )
}
