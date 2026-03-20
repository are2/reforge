import { useState, useMemo } from 'react'
import type { GitTreeItem } from '../../../electron/shared/types'
import { Icon } from '../ui/Icon'

interface TreeNode {
  name: string
  path: string
  type: 'blob' | 'tree'
  size?: number
  children?: TreeNode[]
}

interface FileTreeViewProps {
  items: GitTreeItem[]
  selectedPath: string | null
  onSelect: (path: string, type: 'blob' | 'tree') => void
}

function buildTree(items: GitTreeItem[]): TreeNode[] {
  const root: TreeNode[] = []
  const map: Record<string, TreeNode> = {}

  for (const item of items) {
    const parts = item.path.split('/')
    let currentLevel = root
    let fullPath = ''

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      fullPath = fullPath ? `${fullPath}/${part}` : part
      const isLast = i === parts.length - 1

      let node = map[fullPath]
      if (!node) {
        node = {
          name: part,
          path: fullPath,
          type: isLast ? item.type : 'tree',
          size: isLast ? item.size : undefined,
          children: isLast && item.type === 'blob' ? undefined : [],
        }
        map[fullPath] = node
        currentLevel.push(node)
      }
      if (node.children) {
        currentLevel = node.children
      }
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'tree' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
    nodes.forEach((n) => {
      if (n.children) sortNodes(n.children)
    })
  }

  sortNodes(root)
  return root
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
  expandedPaths,
  toggleExpand,
}: {
  node: TreeNode
  depth: number
  selectedPath: string | null
  onSelect: (path: string, type: 'blob' | 'tree') => void
  expandedPaths: Set<string>
  toggleExpand: (path: string) => void
}) {
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = selectedPath === node.path

  return (
    <div className="flex flex-col">
      <button
        onClick={() => {
          if (node.type === 'tree') {
            toggleExpand(node.path)
          }
          onSelect(node.path, node.type)
        }}
        className={`group flex h-6 w-full items-center gap-1.5 rounded-sm px-1 text-left text-xs transition-colors ${
          isSelected
            ? 'bg-accent-violet/10 text-accent-violet'
            : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <span className="flex w-3 shrink-0 items-center justify-center">
          {node.type === 'tree' && (
            <Icon
              name={isExpanded ? 'chevron-down' : 'chevron'}
              size={10}
              className={isExpanded ? '' : '-rotate-90'}
            />
          )}
        </span>
        <Icon
          name={node.type === 'tree' ? (isExpanded ? 'folder-open' : 'folder') : 'file'}
          size={14}
          className={isSelected ? 'text-accent-violet' : 'text-neutral-400 dark:text-neutral-500'}
        />
        <span className="truncate">{node.name}</span>
        {node.size !== undefined && (
          <span className="ml-auto hidden text-[0.625rem] text-neutral-400 group-hover:inline dark:text-neutral-500">
            {(node.size / 1024).toFixed(1)} KB
          </span>
        )}
      </button>

      {node.type === 'tree' && isExpanded && node.children && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              expandedPaths={expandedPaths}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTreeView({ items, selectedPath, onSelect }: FileTreeViewProps) {
  const tree = useMemo(() => buildTree(items), [items])
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-xs text-neutral-400">
        No files in this commit
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto py-2">
      {tree.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
          expandedPaths={expandedPaths}
          toggleExpand={toggleExpand}
        />
      ))}
    </div>
  )
}
