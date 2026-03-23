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

  // Synchronization for side-by-side scrolling is now handled by a single scroll container
  const scrollAreaRef = useRef<HTMLDivElement>(null)

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

  const renderBlockRow = (block: ConflictBlock, idx: number) => {
    const maxLines = block.type === 'conflict' 
      ? Math.max(getLineCount(block.ours), getLineCount(block.theirs))
      : getLineCount(block.content)

    return (
      <div key={block.id + idx} className={`block-row ${block.type}`}>
        {/* Ours side */}
        <div className={`side-pane ours-pane ${block.type === 'conflict' ? (blockResolutions[block.id] === 'ours' ? 'active' : '') : ''}`}>
          {block.type === 'stable' ? (
            <pre className="stable-text">{block.content}</pre>
          ) : (
            <div className={`conflict-side ours ${blockResolutions[block.id] === 'ours' ? 'active' : ''}`}>
              <div className="side-header">
                <span className="label">Ours: {block.oursHeader || 'HEAD'}</span>
                <button 
                  className="select-btn"
                  onClick={() => resolveBlock(block.id, 'ours')}
                >
                  {blockResolutions[block.id] === 'ours' ? 'Selected' : 'Select Ours'}
                </button>
              </div>
              <pre>{padLines(block.ours, maxLines)}</pre>
            </div>
          )}
        </div>

        <div className="vertical-divider" />

        {/* Theirs side */}
        <div className={`side-pane theirs-pane ${block.type === 'conflict' ? (blockResolutions[block.id] === 'theirs' ? 'active' : '') : ''}`}>
          {block.type === 'stable' ? (
            <pre className="stable-text">{block.content}</pre>
          ) : (
            <div className={`conflict-side theirs ${blockResolutions[block.id] === 'theirs' ? 'active' : ''}`}>
              <div className="side-header">
                <span className="label">Theirs: {block.theirsHeader || 'Remote'}</span>
                <button 
                  className="select-btn"
                  onClick={() => resolveBlock(block.id, 'theirs')}
                >
                  {blockResolutions[block.id] === 'theirs' ? 'Selected' : 'Select Theirs'}
                </button>
              </div>
              <pre>{padLines(block.theirs, maxLines)}</pre>
            </div>
          )}
        </div>
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
                  className="px-3 py-1 text-xs font-semibold rounded bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 transition-colors"
                  onClick={useAllTheirs}
                >
                  Accept All Theirs
                </button>
                <button 
                  className="px-3 py-1 text-xs font-semibold rounded bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 transition-colors"
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
            
            <div className="blocks-viewer-container unified-scroll" ref={scrollAreaRef}>
              {details.blocks.map((block, idx) => renderBlockRow(block, idx))}
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
          background: #FFFFFF;
          color: #09090B;
          font-family: var(--font-ui);
        }
        .dark .conflict-tool-layout {
          background: #0F1115;
          color: #F4F4F5;
        }

        .conflict-tool-layout.standalone {
          height: 100%;
          width: 100%;
        }

        .conflict-sidebar {
          width: 250px;
          min-width: 200px;
          border-right: 1px solid #E4E4E7;
          background: #F4F4F5;
          display: flex;
          flex-direction: column;
        }
        .dark .conflict-sidebar {
          border-right-color: #2A2A30;
          background: #17181C;
        }

        .conflict-sidebar h4 {
          padding: 12px 16px;
          margin: 0;
          font-size: 0.65rem;
          color: #71717A;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #E4E4E7;
        }
        .dark .conflict-sidebar h4 {
          color: #A1A1AA;
          border-bottom-color: #2A2A30;
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
          color: #3F3F46;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        .dark .file-item {
          color: #D4D4D8;
          border-bottom-color: rgba(255, 255, 255, 0.03);
        }

        .file-item:hover {
          background: rgba(0, 0, 0, 0.03);
        }
        .dark .file-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .file-item.selected {
          background: rgba(168, 85, 247, 0.1);
          color: #9333EA;
        }
        .dark .file-item.selected {
          background: rgba(233, 168, 245, 0.1);
          color: #E9A8F5;
        }
        
        .conflict-editor-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #FFFFFF;
          min-width: 0;
        }
        .dark .conflict-editor-area {
          background: #0F1115;
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
          border-bottom: 1px solid #E4E4E7;
          display: flex;
          align-items: center;
          background: #F4F4F5;
          z-index: 10;
        }
        .dark .editor-controls {
          border-bottom-color: #2A2A30;
          background: #17181C;
        }

        .control-group {
          display: flex;
          gap: 8px;
        }

        .filename-label {
          font-size: 0.75rem;
          color: #52525B;
          font-family: var(--font-mono);
        }
        .dark .filename-label {
          color: #71717A;
        }
        
        .blocks-viewer-container {
          flex: 2;
          overflow: auto;
          background: #FAFAFA;
          border-bottom: 1px solid #E4E4E7;
          display: flex;
          flex-direction: column;
        }
        .dark .blocks-viewer-container {
          background: #111216;
          border-bottom-color: #2A2A30;
        }
        
        .blocks-viewer-container::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .blocks-viewer-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .blocks-viewer-container::-webkit-scrollbar-thumb {
          background: #D4D4D8;
          border-radius: 4px;
        }
        .dark .blocks-viewer-container::-webkit-scrollbar-thumb {
          background: #2A2A30;
        }
        .blocks-viewer-container::-webkit-scrollbar-thumb:hover {
          background: #A1A1AA;
        }
        .dark .blocks-viewer-container::-webkit-scrollbar-thumb:hover {
          background: #3F3F46;
        }

        .block-row {
          display: flex;
          width: 100%;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          min-width: min-content;
        }
        .dark .block-row {
          border-bottom-color: rgba(255, 255, 255, 0.03);
        }

        .side-pane {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          container-type: inline-size;
        }

        .vertical-divider {
          width: 1px;
          background: #E4E4E7;
          flex-shrink: 0;
        }
        .dark .vertical-divider {
          background: #2A2A30;
        }
        
        .stable-text {
          margin: 0;
          padding: 12px 16px;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: #52525B;
          white-space: pre;
          line-height: 1.6;
        }
        .dark .stable-text {
          color: #71717A;
        }
        
        .conflict-side {
          display: flex;
          flex-direction: column;
          transition: all 0.2s ease;
          opacity: 0.8;
          flex: 1;
          min-height: 80px;
        }
        .conflict-side.ours { background: rgba(168, 85, 247, 0.03); } 
        .conflict-side.theirs { background: rgba(20, 184, 166, 0.03); } 
        
        .side-pane.active {
          opacity: 1;
          background: rgba(168, 85, 247, 0.08);
        }
        .dark .side-pane.active {
          background: rgba(168, 85, 247, 0.12);
        }
        .theirs-pane.active {
          background: rgba(20, 184, 166, 0.08);
        }
        .dark .theirs-pane.active {
          background: rgba(20, 184, 166, 0.12);
        }
        
        .ours.active { border-left: 2px solid #9333ea; }
        .theirs.active { border-left: 2px solid #0d9488; }
        .dark .ours.active { border-left-color: #a855f7; }
        .dark .theirs.active { border-left-color: #14b8a6; }
        
        .side-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #F4F4F5;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          position: sticky;
          top: 0;
          left: 0;
          width: 100cqw;
          z-index: 5;
          box-sizing: border-box;
        }
        .dark .side-header {
          background: #1c1d22;
          border-bottom-color: rgba(255, 255, 255, 0.1);
        }

        .side-header .label {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #71717A;
        }
        .dark .side-header .label {
          color: #a1a1aa;
        }
        
        .select-btn {
          padding: 4px 10px;
          font-size: 0.65rem;
          font-weight: 600;
          border-radius: 4px;
          background: #FFFFFF;
          color: #18181B;
          border: 1px solid #E4E4E7;
          transition: all 0.2s;
        }
        .dark .select-btn {
          background: #27272a;
          color: #f4f4f5;
          border-color: #3f3f46;
        }

        .select-btn:hover {
          background: #F4F4F5;
        }
        .dark .select-btn:hover {
          background: #3f3f46;
        }

        .active .select-btn {
          background: #18181B;
          color: #FFFFFF;
          border-color: #18181B;
        }
        .dark .active .select-btn {
          background: #f4f4f5;
          color: #09090b;
          border-color: #f4f4f5;
        }
        
        .conflict-side pre {
          margin: 0;
          padding: 12px 16px;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          white-space: pre;
          line-height: 1.6;
        }
        
        .resolution-editor {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #FFFFFF;
          min-height: 200px;
        }
        .dark .resolution-editor {
          background: #0F1115;
        }

        .resolution-editor textarea {
          flex: 1;
          width: 100%;
          border: none;
          padding: 16px;
          font-family: var(--font-mono);
          font-size: 0.85rem;
          background: transparent;
          color: #09090B;
          resize: none;
          line-height: 1.6;
        }
        .dark .resolution-editor textarea {
          color: #FAFAFA;
        }

        .resolution-editor textarea:focus {
          outline: none;
        }

        .pane-header {
          padding: 6px 12px;
          background: #F4F4F5;
          font-size: 0.65rem;
          font-weight: 600;
          color: #71717A;
          text-transform: uppercase;
          border-bottom: 1px solid #E4E4E7;
          border-top: 1px solid #E4E4E7;
        }
        .dark .pane-header {
          background: #222228;
          color: #A1A1AA;
          border-bottom-color: #2A2A30;
          border-top-color: #2A2A30;
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
