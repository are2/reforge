import { useState, useEffect } from 'react'
import type { GitCommit } from '../../../electron/shared/types'
import { Avatar } from '../ui/Avatar'
import { BranchChip } from '../ui/BranchChip'
import { FileStatusBadge } from '../ui/FileStatusBadge'
import { Icon } from '../ui/Icon'
import { Skeleton } from '../ui/Skeleton'
import { CommitChangesView } from './CommitChangesView'
import { FileTreeView } from './FileTreeView'
import { FileContentView } from './FileContentView'
import type { FileDiff, GitTreeItem, FileContent } from '../../../electron/shared/types'


interface DetailsPaneProps {
  repoPath: string | null
  selectedCommit: GitCommit | null
  detailLoading?: boolean
  selectedDiff: FileDiff | null
  diffLoading?: boolean
  onSelectFile: (filePath: string, revision: string) => void
}

type DetailTab = 'commit' | 'changes' | 'filetree'

const tabs: { id: DetailTab; label: string }[] = [
  { id: 'commit', label: 'Commit' },
  { id: 'changes', label: 'Changes' },
  { id: 'filetree', label: 'File Tree' },
]

// ── Author / Committer block ──────────────────────────────────

function PersonBlock({
  label,
  name,
  email,
  date,
  initials,
  variant,
}: {
  label: string
  name: string
  email: string
  date: string
  initials: string
  variant: 'primary' | 'secondary'
}) {
  return (
    <div className="flex items-start gap-2">
      <Avatar initials={initials} variant={variant} />
      <div className="min-w-0">
        <div className="text-[0.625rem] font-semibold tracking-widest text-neutral-400 uppercase dark:text-neutral-500">
          {label}
        </div>
        <div className="flex flex-wrap items-baseline gap-1">
          <span className="text-xs font-medium text-neutral-900 dark:text-neutral-50">
            {name}
          </span>
          <span className="text-[0.6875rem] text-neutral-400 dark:text-neutral-500">
            &lt;{email}&gt;
          </span>
        </div>
        <div className="text-[0.6875rem] text-neutral-400 dark:text-neutral-500">
          {date}
        </div>
      </div>
    </div>
  )
}

// ── Commit detail tab ─────────────────────────────────────────

function CommitDetail({ 
  commit, 
  onFileClick 
}: { 
  commit: GitCommit, 
  onFileClick: (filePath: string) => void 
}) {
  const [filesExpanded, setFilesExpanded] = useState(true)

  return (
    <div className="flex flex-col gap-3 overflow-y-auto p-3">
      {/* Author / Committer header */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <PersonBlock
          label="Author"
          name={commit.author.name}
          email={commit.author.email}
          date={commit.authorDate}
          initials={commit.author.initials}
          variant="primary"
        />
        {(commit.author.name !== commit.committer.name ||
          commit.author.email !== commit.committer.email ||
          commit.authorDate !== commit.commitDate) && (
          <PersonBlock
            label="Committer"
            name={commit.committer.name}
            email={commit.committer.email}
            date={commit.commitDate}
            initials={commit.committer.initials}
            variant="primary"
          />
        )}
      </div>

      {/* Refs / SHA / Parents */}
      <div className="flex flex-col gap-1 border-t border-neutral-200 pt-2 dark:border-neutral-600">
        {/* Refs */}
        {commit.refs.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="w-14 shrink-0 text-right text-[0.625rem] font-semibold tracking-widest text-neutral-400 uppercase dark:text-neutral-500">
              Refs
            </span>
            <div className="flex flex-wrap gap-1">
              {commit.refs.map((ref) => (
                <BranchChip key={ref.name} name={ref.name} type={ref.type === 'head' ? 'local' : ref.type === 'tag' ? 'local' : ref.type} />
              ))}
            </div>
          </div>
        )}

        {/* SHA */}
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-right text-[0.625rem] font-semibold tracking-widest text-neutral-400 uppercase dark:text-neutral-500">
            SHA
          </span>
          <span className="font-mono text-[0.6875rem] text-accent-blue">
            {commit.hash}
          </span>
          <button className="rounded-sm p-0.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50">
            <Icon name="copy" size={10} />
          </button>
        </div>

        {/* Parents */}
        {commit.parents.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-right text-[0.625rem] font-semibold tracking-widest text-neutral-400 uppercase dark:text-neutral-500">
              Parents
            </span>
            <div className="flex gap-1">
              {commit.parents.map((p) => (
                <span key={p} className="font-mono text-[0.6875rem] text-accent-blue">
                  {p.substring(0, 7)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Commit message */}
      <div className="border-t border-neutral-200 pt-2 dark:border-neutral-600">
        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-50">
          {commit.subject}
        </p>
        {commit.body.length > 0 && (
          <div className="mt-1.5 flex flex-col gap-1">
            {commit.body.map((line, i) => (
              <p key={i} className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-300">
                {line}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Changed files */}
      <div className="border-t border-neutral-200 pt-2 dark:border-neutral-600">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setFilesExpanded(!filesExpanded)}
            className="flex items-center gap-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400"
          >
            <Icon name={filesExpanded ? 'chevron-down' : 'chevron'} size={10} />
            Changed files
            <span className="text-[0.625rem] font-normal text-neutral-400 dark:text-neutral-500">
              ({commit.files.length})
            </span>
          </button>
          <button className="text-[0.625rem] text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-50">
            Expand All
          </button>
        </div>

        {filesExpanded && (
          <div className="mt-1 flex flex-col">
            {commit.files.map((file) => (
              <button
                key={file.path}
                onClick={() => onFileClick(file.path)}
                className="flex w-full items-center gap-2 rounded-sm py-0.5 pl-4 pr-2 text-xs text-neutral-500 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <FileStatusBadge status={file.status} />
                <span className="truncate">{file.path}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CommitDetailSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="flex items-start gap-2">
          <Skeleton circle width={32} height={32} />
          <div className="flex flex-col gap-1.5 flex-1">
            <Skeleton className="h-2 w-12" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2 w-1/2" />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Skeleton circle width={32} height={32} />
          <div className="flex flex-col gap-1.5 flex-1">
            <Skeleton className="h-2 w-12" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2 w-1/2" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-neutral-200 pt-2 dark:border-neutral-600">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="border-t border-neutral-200 pt-2 dark:border-neutral-600">
        <Skeleton className="h-4 w-full" />
        <div className="mt-2 space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
      </div>
    </div>
  )
}

// ── Details pane container ────────────────────────────────────

export function DetailsPane({ 
  repoPath,
  selectedCommit, 
  detailLoading, 
  selectedDiff, 
  diffLoading, 
  onSelectFile,
}: DetailsPaneProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('commit')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  // Reset selection and tab when commit changes
  useEffect(() => {
    setSelectedPath(null)
    setActiveTab('commit')
  }, [selectedCommit?.hash])

  const handleFileNavigation = (filePath: string) => {
    setSelectedPath(filePath)
    setActiveTab('changes')
    if (selectedCommit) {
      onSelectFile(filePath, selectedCommit.hash)
    }
  }

  const handleChangesSelectFile = (filePath: string, hash: string) => {
    setSelectedPath(filePath)
    onSelectFile(filePath, hash)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tab navigation */}
      <div className="flex h-7 shrink-0 items-center gap-4 border-b border-neutral-200 px-3 dark:border-neutral-600">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative pb-1 text-[0.6875rem] font-medium ${
              activeTab === tab.id
                ? 'text-accent-violet after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-accent-violet'
                : 'text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
        {detailLoading && (
          <span className="ml-auto text-[0.625rem] text-neutral-400 dark:text-neutral-500">
            Loading…
          </span>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {detailLoading && !selectedCommit && <CommitDetailSkeleton />}
        {activeTab === 'commit' && selectedCommit && (
          <CommitDetail 
            commit={selectedCommit} 
            onFileClick={handleFileNavigation} 
          />
        )}
        {!detailLoading && activeTab === 'commit' && !selectedCommit && (
          <div className="flex items-center justify-center p-8 text-xs text-neutral-400">
            Select a commit to view details
          </div>
        )}
        {activeTab === 'changes' && selectedCommit && (
          <CommitChangesView
            commit={selectedCommit}
            selectedDiff={selectedDiff}
            loading={diffLoading}
            selectedPath={selectedPath}
            onSelectFile={handleChangesSelectFile}
          />
        )}
        {activeTab === 'changes' && !selectedCommit && (
          <div className="flex items-center justify-center p-8 text-xs text-neutral-400">
            Select a commit to view changes
          </div>
        )}
        {activeTab === 'filetree' && selectedCommit && repoPath && (
          <FileTreeTabContent 
            repoPath={repoPath}
            commit={selectedCommit}
          />
        )}
        {activeTab === 'filetree' && !selectedCommit && (
          <div className="flex items-center justify-center p-8 text-xs text-neutral-400">
            Select a commit to view the file tree
          </div>
        )}
      </div>
    </div>
  )
}

// ── File Tree tab content ─────────────────────────────────────

function FileTreeTabContent({ 
  repoPath, 
  commit 
}: { 
  repoPath: string, 
  commit: GitCommit 
}) {
  const [treeItems, setTreeItems] = useState<GitTreeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [content, setContent] = useState<FileContent | null>(null)
  const [contentLoading, setContentLoading] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    window.git.getFileTree(repoPath, commit.hash)
      .then(items => {
        if (active) {
          setTreeItems(items)
          setLoading(false)
        }
      })
      .catch(err => {
        console.error('Failed to load file tree:', err)
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [repoPath, commit.hash])

  const handleSelect = async (path: string, type: 'blob' | 'tree') => {
    if (type === 'tree') return
    
    setSelectedPath(path)
    setContentLoading(true)
    try {
      const data = await window.git.getFileContent(repoPath, commit.hash, path)
      setContent(data)
    } catch (err) {
      console.error('Failed to load file content:', err)
    } finally {
      setContentLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-xs text-neutral-400">
        Loading file tree…
      </div>
    )
  }

  return (
    <div className="flex h-full divide-x divide-neutral-200 dark:divide-neutral-700">
      <div className="w-1/3 min-w-[200px] overflow-hidden">
        <FileTreeView 
          items={treeItems} 
          selectedPath={selectedPath} 
          onSelect={handleSelect} 
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <FileContentView 
          content={content} 
          loading={contentLoading} 
        />
      </div>
    </div>
  )
}
