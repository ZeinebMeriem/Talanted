import React, { useCallback, useMemo } from 'react'

export type FileNode =
  | { id: string; type: 'file'; name: string }
  | { id: string; type: 'folder'; name: string; open: boolean; children: FileNode[] }

interface CodeViewerProps {
  tree: FileNode[]
  setTree: (tree: FileNode[]) => void
  activeFileId: string | null
  setActiveFileId: (id: string) => void
  effectiveFileContents: Map<string, string>
}

const SYNTAX_HIGHLIGHTING_COLORS: Record<string, string> = {
  jsx: 'text-yellow-300',
  tsx: 'text-blue-300',
  js: 'text-yellow-300',
  ts: 'text-blue-300',
  css: 'text-purple-300',
  html: 'text-red-300',
  json: 'text-green-300',
  md: 'text-gray-300',
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  tree,
  setTree,
  activeFileId,
  setActiveFileId,
  effectiveFileContents,
}) => {
  const toggleFolder = useCallback(
    (id: string) => {
      const toggle = (nodes: FileNode[]): FileNode[] =>
        nodes.map((n) => {
          if (n.type === 'folder' && n.id === id) {
            return { ...n, open: !n.open }
          }
          if (n.type === 'folder') {
            return { ...n, children: toggle(n.children) }
          }
          return n
        })
      setTree(toggle(tree))
    },
    [tree, setTree],
  )

  const renderTreeNodes = useCallback(
    (nodes: FileNode[], prefix: string = ''): JSX.Element => (
      <div>
        {nodes.map((node) => (
          <div key={node.id}>
            {node.type === 'folder' ? (
              <div>
                <button
                  onClick={() => toggleFolder(node.id)}
                  className="w-full text-left px-2 py-1 hover:bg-slate-700 flex items-center gap-1 rounded text-sm text-slate-300"
                >
                  <span>{node.open ? '▼' : '▶'}</span>
                  <span>📁 {node.name}</span>
                </button>
                {node.open && <div className="ml-4">{renderTreeNodes(node.children, prefix + '  ')}</div>}
              </div>
            ) : (
              <button
                onClick={() => setActiveFileId(node.id)}
                className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 transition ${
                  activeFileId === node.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>📄</span>
                <span className={getSyntaxColor(node.name)}>{node.name}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    ),
    [toggleFolder, activeFileId, setActiveFileId],
  )

  const activeFileContent = useMemo(() => {
    return activeFileId ? effectiveFileContents.get(activeFileId) || '' : ''
  }, [activeFileId, effectiveFileContents])

  const activeFileName = useMemo(() => {
    const findName = (nodes: FileNode[]): string | null => {
      for (const n of nodes) {
        if (n.id === activeFileId) {
          return n.type === 'file' ? n.name : null
        }
        if (n.type === 'folder') {
          const result = findName(n.children)
          if (result) return result
        }
      }
      return null
    }
    return findName(tree) || 'Select a file'
  }, [tree, activeFileId])

  return (
    <div className="flex h-full bg-slate-900">
      {/* File Tree */}
      <div className="w-48 bg-slate-800 border-r border-slate-700 overflow-y-auto p-2">
        <div className="text-xs font-semibold text-slate-400 mb-2 px-2">FILES</div>
        {renderTreeNodes(tree)}
      </div>

      {/* Code Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>📄</span>
            <span className="text-sm font-semibold text-white">{activeFileName}</span>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto bg-slate-950 p-4">
          {activeFileContent ? (
            <pre className="text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap word-break">
              <code>{activeFileContent}</code>
            </pre>
          ) : (
            <div className="text-slate-500 text-center mt-8">Select a file to view its contents</div>
          )}
        </div>

        {/* Footer - Line count */}
        <div className="bg-slate-800 border-t border-slate-700 px-4 py-2 text-xs text-slate-400">
          {activeFileContent.split('\n').length} lines
        </div>
      </div>
    </div>
  )
}

function getSyntaxColor(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return SYNTAX_HIGHLIGHTING_COLORS[ext] || 'text-gray-300'
}
