import { useState, useEffect, useRef, useCallback } from 'react'
import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'
import { StatusEntry, ConflictDetails, ConflictBlock } from '../../../electron/shared/types'

interface MergeConflictToolProps {
  isOpen: boolean
  onClose: () => void
  conflicts: StatusEntry[]
  getConflictDetails: (path: string) => Promise<ConflictDetails>
  resolveConflict: (path: string, content: string) => Promise<void>
  standalone?: boolean
}

export function MergeConflictTool({
  isOpen,
  onClose,
  conflicts,
  getConflictDetails,
  resolveConflict,
  standalone = false,
}: MergeConflictToolProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(conflicts[0]?.path || null)
  const [details, setDetails] = useState<ConflictDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [resolvedContent, setResolvedContent] = useState('')
  const [blockResolutions, setBlockResolutions] = useState<Record<string, 'ours' | 'theirs' | 'manual'>>({})

  // Synchronization for side-by-side scrolling
  const oursScrollRef = useRef<HTMLDivElement>(null)
  const theirsScrollRef = useRef<HTMLDivElement>(null)
  const isSyncingRef = useRef(false)

  const handleScroll = (source: 'ours' | 'theirs') => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true

    const sourceEl = source === 'ours' ? oursScrollRef.current : theirsScrollRef.current
    const targetEl = source === 'ours' ? theirsScrollRef.current : oursScrollRef.current

    if (sourceEl && targetEl) {
      targetEl.scrollTop = sourceEl.scrollTop
      targetEl.scrollLeft = sourceEl.scrollLeft
    }

    // Reset flag after browser has handled the scroll
    requestAnimationFrame(() => {
      isSyncingRef.current = false
    })
  }

  // Update selected file when conflicts list changes (e.g. after a resolution)
  useEffect(() => {
    if (conflicts.length > 0 && (!selectedFile || !conflicts.some(c => c.path === selectedFile))) {
      setSelectedFile(conflicts[0].path)
    }
  }, [conflicts, selectedFile])

  const loadDetails = useCallback(async (path: string) => {
    setLoading(true)
    try {
      const data = await getConflictDetails(path)
      setDetails(data)
      setBlockResolutions({})
      
      // Initial build of resolved content (with markers)
      let initialContent = ''
      data.blocks.forEach(block => {
        if (block.type === 'stable') {
          initialContent += block.content
        } else {
          initialContent += `<<<<<<< ${block.oursHeader || 'Ours'}\n${block.ours}${block.ours?.endsWith('\n') ? '' : '\n'}=======\n${block.theirs}${block.theirs?.endsWith('\n') ? '' : '\n'}>>>>>>> ${block.theirsHeader || 'Theirs'}\n`
        }
      })
      setResolvedContent(initialContent)
    } catch (e) {
      console.error('Failed to load conflict details:', e)
    } finally {
      setLoading(false)
    }
  }, [getConflictDetails])

  useEffect(() => {
    if (selectedFile && isOpen) {
      loadDetails(selectedFile)
    }
  }, [selectedFile, isOpen, loadDetails])

  // Update resolved content when blockResolutions change
  useEffect(() => {
    if (!details) return
    
    let content = ''
    details.blocks.forEach(block => {
      if (block.type === 'stable') {
        content += block.content
      } else {
        const res = blockResolutions[block.id]
        if (res === 'ours') {
          content += block.ours + (block.ours?.endsWith('\n') ? '' : '\n')
        } else if (res === 'theirs') {
          content += block.theirs + (block.theirs?.endsWith('\n') ? '' : '\n')
        } else {
          content += `<<<<<<< ${block.oursHeader || 'Ours'}\n${block.ours}${block.ours?.endsWith('\n') ? '' : '\n'}=======\n${block.theirs}${block.theirs?.endsWith('\n') ? '' : '\n'}>>>>>>> ${block.theirsHeader || 'Theirs'}\n`
        }
      }
    })
    setResolvedContent(content)
  }, [blockResolutions, details])

  const handleResolve = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      await resolveConflict(selectedFile, resolvedContent)
    } finally {
      setLoading(false)
    }
  }

  const resolveBlock = (blockId: string, side: 'ours' | 'theirs') => {
    setBlockResolutions(prev => ({ ...prev, [blockId]: side }))
  }

  const useAllOurs = () => {
    if (!details) return
    const newResolutions = { ...blockResolutions }
    details.blocks.filter(b => b.type === 'conflict').forEach(b => {
      newResolutions[b.id] = 'ours'
    })
    setBlockResolutions(newResolutions)
  }

  const useAllTheirs = () => {
    if (!details) return
    const newResolutions = { ...blockResolutions }
    details.blocks.filter(b => b.type === 'conflict').forEach(b => {
      newResolutions[b.id] = 'theirs'
    })
    setBlockResolutions(newResolutions)
  }

  const allResolved = details 
    ? details.blocks.filter(b => b.type === 'conflict').every(b => !!blockResolutions[b.id])
    : false

  const padLines = (text: string | undefined, count: number) => {
    if (!text) text = ''
    const lines = text.split('\n')
    // Remove last empty line if it was just a trailing newline
    if (lines.length > 0 && lines[lines.length - 1] === '' && text.endsWith('\n')) {
      lines.pop()
    }
    while (lines.length < count) {
      lines.push('')
    }
    return lines.join('\n')
  }

  const getLineCount = (text: string | undefined) => {
    if (!text) return 0
    const lines = text.split('\n')
    // Don't count the final empty line from a trailing newline
    if (lines.length > 0 && lines[lines.length - 1] === '' && text.endsWith('\n')) {
      return lines.length - 1
    }
    return lines.length
  }

  const renderSide = (side: 'ours' | 'theirs') => {
    if (!details) return null

    return (
      <div 
        className={`side-pane ${side}-pane`}
        ref={side === 'ours' ? oursScrollRef : theirsScrollRef}
        onScroll={() => handleScroll(side)}
      >
        {details.blocks.map((block: ConflictBlock, idx) => {
          const maxLines = block.type === 'conflict' 
            ? Math.max(getLineCount(block.ours), getLineCount(block.theirs))
            : getLineCount(block.content)

          return (
            <div key={block.id + idx} className={`block-item ${block.type} ${blockResolutions[block.id] === side ? 'active' : ''}`}>
              {block.type === 'stable' ? (
                <pre className="stable-text">{block.content}</pre>
              ) : (
                <div className={`conflict-side ${side} ${blockResolutions[block.id] === side ? 'active' : ''}`}>
                  <div className="side-header">
                    <span className="label">
                      {side === 'ours' 
                        ? `Ours: ${block.oursHeader || 'HEAD'}`
                        : `Theirs: ${block.theirsHeader || 'Remote'}`}
                    </span>
                    <button 
                      className="select-btn"
                      onClick={() => resolveBlock(block.id, side)}
                    >
                      {blockResolutions[block.id] === side ? 'Selected' : `Select ${side === 'ours' ? 'Ours' : 'Theirs'}`}
                    </button>
                  </div>
                  <pre>{padLines(side === 'ours' ? block.ours : block.theirs, maxLines)}</pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const content = (
    <div className={`conflict-tool-layout ${standalone ? 'standalone' : ''}`}>
      <div className="conflict-sidebar">
        <h4>Conflicted Files</h4>
        <div className="file-list">
          {conflicts.map(file => (
            <div
              key={file.path}
              className={`file-item ${selectedFile === file.path ? 'selected' : ''}`}
              onClick={() => setSelectedFile(file.path)}
            >
              <Icon name="git" size={14} className={selectedFile === file.path ? 'text-accent-violet' : 'text-neutral-400'} />
              <div className="flex flex-col min-width-0">
                <span className="truncate">{file.path}</span>
              </div>
            </div>
          ))}
          {conflicts.length === 0 && (
            <div className="p-4 text-xs text-neutral-500 italic">No conflicts remaining.</div>
          )}
        </div>
      </div>
      
      <div className="conflict-editor-area">
        {loading ? (
          <div className="tool-loading">
            <Icon name="git" size={24} className="git-spinner opacity-50" />
            <span className="ml-2">Loading conflict details...</span>
          </div>
        ) : details ? (
          <div className="conflict-editor-container">
            <div className="editor-controls">
              <div className="control-group">
                <button 
                  className="px-3 py-1 text-xs font-semibold rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-colors"
                  onClick={useAllTheirs}
                >
                  Accept All Theirs
                </button>
                <button 
                  className="px-3 py-1 text-xs font-semibold rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-colors"
                  onClick={useAllOurs}
                >
                  Accept All Ours
                </button>
              </div>
              <div className="filename-label truncate ml-4">{details.path}</div>
              {standalone && (
                <button
                  className="ml-auto flex items-center gap-2 px-4 py-1 text-xs font-bold rounded bg-accent-violet text-neutral-950 hover:opacity-90 disabled:opacity-50 transition-all"
                  onClick={handleResolve}
                  disabled={loading || !allResolved}
                >
                  {loading && <Icon name="git" size={12} className="git-spinner" />}
                  <span>Resolve and {conflicts.length > 1 ? 'Next' : 'Finish'}</span>
                </button>
              )}
            </div>
            
            <div className="blocks-viewer-container side-by-side">
              {renderSide('ours')}
              <div className="vertical-spacer" />
              {renderSide('theirs')}
            </div>
            
            <div className="resolution-editor">
              <div className="pane-header">Resolved Result (Live Preview / Edit)</div>
              <textarea
                value={resolvedContent}
                onChange={(e) => setResolvedContent(e.target.value)}
                spellCheck={false}
              />
            </div>
          </div>
        ) : (
          <div className="no-file-selected text-neutral-500">
            <Icon name="alert" size={32} className="opacity-20 mb-2" />
            Select a file to resolve conflicts.
          </div>
        )}
      </div>

      {!standalone && (
        <style>{`
          .conflict-tool-layout {
            display: flex;
            height: 700px;
            margin: -16px;
          }
        `}</style>
      )}

      <style>{`
        .conflict-tool-layout {
          display: flex;
          background: #0F1115;
          color: #F4F4F5;
          font-family: var(--font-ui);
        }
        .conflict-tool-layout.standalone {
          height: 100%;
          width: 100%;
        }
        .conflict-sidebar {
          width: 250px;
          min-width: 200px;
          border-right: 1px solid #2A2A30;
          background: #17181C;
          display: flex;
          flex-direction: column;
        }
        .conflict-sidebar h4 {
          padding: 12px 16px;
          margin: 0;
          font-size: 0.65rem;
          color: #A1A1AA;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #2A2A30;
        }
        .file-list {
          flex: 1;
          overflow-y: auto;
        }
        .file-item {
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 0.8rem;
          color: #D4D4D8;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }
        .file-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .file-item.selected {
          background: rgba(233, 168, 245, 0.1);
          color: #E9A8F5;
        }
        
        .conflict-editor-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #0F1115;
          min-width: 0;
        }
        .tool-loading, .no-file-selected {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          font-size: 0.9rem;
        }
        
        .conflict-editor-container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .editor-controls {
          padding: 10px 16px;
          border-bottom: 1px solid #2A2A30;
          display: flex;
          align-items: center;
          background: #17181C;
          z-index: 10;
        }
        .control-group {
          display: flex;
          gap: 8px;
        }
        .filename-label {
          font-size: 0.75rem;
          color: #71717A;
          font-family: var(--font-mono);
        }
        
        .blocks-viewer-container {
          flex: 2;
          overflow: hidden;
          background: #0F1115;
          border-bottom: 1px solid #2A2A30;
          display: flex;
        }
        
        .side-pane {
          flex: 1;
          overflow: auto;
          display: flex;
          flex-direction: column;
          container-type: inline-size;
        }

        /* Hide scrollbars but keep functionality if needed, or just style them */
        .side-pane::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .side-pane::-webkit-scrollbar-track {
          background: #0F1115;
        }
        .side-pane::-webkit-scrollbar-thumb {
          background: #2A2A30;
          border-radius: 4px;
        }
        .side-pane::-webkit-scrollbar-thumb:hover {
          background: #3F3F46;
        }

        .vertical-spacer {
          width: 2px;
          background: #2A2A30;
          height: 100%;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          position: relative;
          z-index: 15;
        }
        
        .block-item {
          padding: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          min-width: fit-content;
        }
        .stable-text {
          margin: 0;
          padding: 8px 16px;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: #71717A;
          white-space: pre;
          line-height: 1.5;
        }
        
        .conflict-side {
          display: flex;
          flex-direction: column;
          transition: all 0.2s ease;
          opacity: 0.8;
          min-height: 100px;
        }
        .conflict-side.ours { background: rgba(168, 85, 247, 0.05); } /* violet */
        .conflict-side.theirs { background: rgba(20, 184, 166, 0.05); } /* teal */
        
        .conflict-side.active {
          opacity: 1;
          box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
        }
        
        .ours.active { background: rgba(168, 85, 247, 0.15); border-left: 2px solid #a855f7; }
        .theirs.active { background: rgba(20, 184, 166, 0.15); border-left: 2px solid #14b8a6; }
        
        .side-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #1c1d22;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          position: sticky;
          top: 0;
          left: 0;
          width: 100cqw;
          z-index: 10;
          box-sizing: border-box;
        }
        .side-header .label {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #a1a1aa;
        }
        
        .select-btn {
          padding: 4px 10px;
          font-size: 0.65rem;
          font-weight: 600;
          border-radius: 4px;
          background: #27272a;
          color: #f4f4f5;
          border: 1px solid #3f3f46;
          transition: all 0.2s;
        }
        .select-btn:hover {
          background: #3f3f46;
        }
        .active .select-btn {
          background: #f4f4f5;
          color: #09090b;
          border-color: #f4f4f5;
        }
        
        .conflict-side pre {
          margin: 0;
          padding: 16px;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          white-space: pre;
          line-height: 1.6;
        }
        
        .resolution-editor {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #0F1115;
          min-height: 200px;
        }
        .resolution-editor textarea {
          flex: 1;
          width: 100%;
          border: none;
          padding: 16px;
          font-family: var(--font-mono);
          font-size: 0.85rem;
          background: transparent;
          color: #FAFAFA;
          resize: none;
          line-height: 1.6;
        }
        .resolution-editor textarea:focus {
          outline: none;
        }
        .pane-header {
          padding: 6px 12px;
          background: #222228;
          font-size: 0.65rem;
          font-weight: 600;
          color: #A1A1AA;
          text-transform: uppercase;
          border-bottom: 1px solid #2A2A30;
          border-top: 1px solid #2A2A30;
        }
      `}</style>
    </div>
  )

  if (standalone) {
    return content
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resolve Conflicts"
      maxWidth="1200px"
      footer={
        <>
          <button className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button primary"
            onClick={handleResolve}
            disabled={!selectedFile || loading || !allResolved}
          >
            Resolve {conflicts.length > 1 ? `(${conflicts.length - 1} remaining)` : 'and Close'}
          </button>
        </>
      }
    >
      {content}
    </Modal>
  )
}
