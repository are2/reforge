import React, { useEffect } from 'react'
import { Icon } from './Icon'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = '600px' }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-button close-button" onClick={onClose} title="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: modalFadeIn 0.2s ease-out;
        }
        .modal-content {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          width: 90%;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          animation: modalSlideIn 0.2s ease-out;
        }
        .modal-header {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .modal-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
        }
        .modal-body {
          padding: 16px;
          overflow-y: auto;
          flex: 1;
        }
        .modal-footer {
          padding: 12px 16px;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: var(--bg-secondary);
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
        }
        
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
