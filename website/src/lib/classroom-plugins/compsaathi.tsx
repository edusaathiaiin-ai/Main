'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { FullscreenPanel } from '@/components/classroom/FullscreenPanel'
import { ToolContainer } from '@/components/classroom/ToolContainer'
import Editor from '@monaco-editor/react'
import { useRoom } from '@/components/classroom/liveblocks.config'
import { LiveblocksYjsProvider } from '@liveblocks/yjs'
import * as Y from 'yjs'
import { useAutoQueryHandler } from './useAutoQueryHandler'

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Collaborative Monaco Editor with Liveblocks Yjs sync                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

const LANGUAGES = [
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'sql', label: 'SQL' },
] as const

const DEFAULT_CODE: Record<string, string> = {
  python: '# Write Python code here\n\ndef main():\n    print("Hello from EdUsaathiAI!")\n\nmain()\n',
  javascript: '// Write JavaScript code here\n\nfunction main() {\n  console.log("Hello from EdUsaathiAI!");\n}\n\nmain();\n',
  typescript: '// Write TypeScript code here\n\nfunction greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet("EdUsaathiAI"));\n',
  java: '// Write Java code here\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from EdUsaathiAI!");\n    }\n}\n',
  cpp: '// Write C++ code here\n\n#include <iostream>\n\nint main() {\n    std::cout << "Hello from EdUsaathiAI!" << std::endl;\n    return 0;\n}\n',
  sql: '-- Write SQL here\n\nSELECT \'Hello from EdUsaathiAI!\';\n',
}

function CodeEditorPanel({ role }: { role: 'faculty' | 'student' }) {
  const room = useRoom()
  const [language, setLanguage] = useState<string>('python')
  const [code, setCode] = useState(DEFAULT_CODE.python)
  const [output, setOutput] = useState('')

  useAutoQueryHandler('monaco', (params) => {
    if (params.language) setLanguage(String(params.language))
    if (params.starter_code) setCode(String(params.starter_code))
  })
  const [running, setRunning] = useState(false)
  const [synced, setSynced] = useState(false)
  const yDocRef = useRef<Y.Doc | null>(null)
  const yProviderRef = useRef<LiveblocksYjsProvider | null>(null)
  const yTextRef = useRef<Y.Text | null>(null)
  const suppressSync = useRef(false)

  // Liveblocks Yjs sync for code
  useEffect(() => {
    const yDoc = new Y.Doc()
    const yProvider = new LiveblocksYjsProvider(room, yDoc)
    const yText = yDoc.getText('monaco-code')

    yDocRef.current = yDoc
    yProviderRef.current = yProvider
    yTextRef.current = yText

    // Remote → local: update code when Yjs text changes
    const observer = () => {
      if (suppressSync.current) return
      setCode(yText.toString())
    }
    yText.observe(observer)

    yProvider.on('sync', (isSynced: boolean) => {
      if (isSynced) {
        const existing = yText.toString()
        if (existing) {
          setCode(existing)
        } else {
          // First user — seed with default code
          yDoc.transact(() => {
            yText.insert(0, DEFAULT_CODE.python)
          })
        }
        setSynced(true)
      }
    })

    return () => {
      yText.unobserve(observer)
      yProvider.destroy()
      yDoc.destroy()
    }
  }, [room])

  // Local → remote: push code changes to Yjs
  const handleCodeChange = useCallback((value: string | undefined) => {
    if (!value || !yTextRef.current || !yDocRef.current) return
    setCode(value)

    suppressSync.current = true
    yDocRef.current.transact(() => {
      const yText = yTextRef.current!
      yText.delete(0, yText.length)
      yText.insert(0, value)
    })
    suppressSync.current = false
  }, [])

  const handleRun = useCallback(async () => {
    setRunning(true)
    setOutput('')

    try {
      const pistonLang = language === 'cpp' ? 'c++' : language
      const res = await fetch('/api/classroom/piston', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: pistonLang, code }),
      })
      const data = await res.json()

      if (!res.ok) {
        setOutput(`Error: ${data.error}`)
      } else {
        const out = [data.stdout, data.stderr].filter(Boolean).join('\n')
        setOutput(out || '(no output)')
      }
    } catch {
      setOutput('Execution failed — check your connection')
    }
    setRunning(false)
  }, [language, code])

  const handleLanguageChange = useCallback((newLang: string) => {
    setLanguage(newLang)
    const defaultCode = DEFAULT_CODE[newLang] ?? ''
    setCode(defaultCode)

    // Sync language change to Yjs
    if (yTextRef.current && yDocRef.current) {
      suppressSync.current = true
      yDocRef.current.transact(() => {
        const yText = yTextRef.current!
        yText.delete(0, yText.length)
        yText.insert(0, defaultCode)
      })
      suppressSync.current = false
    }
  }, [])

  // Map Monaco language IDs
  const monacoLang = language === 'cpp' ? 'cpp' : language

  return (
    <ToolContainer name="Code Editor" source="Monaco + Piston Runtime" loading={!synced}>
      <div className="flex h-full flex-col">
        {/* Toolbar */}
        <div className="flex shrink-0 items-center gap-2 px-3 py-1.5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <select value={language} onChange={(e) => handleLanguageChange(e.target.value)}
            className="rounded-lg border-0 px-2 py-1 text-xs font-semibold outline-none"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>

          <button onClick={handleRun} disabled={running || !code.trim()}
            className="ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-30"
            style={{ background: 'var(--success)', color: '#fff' }}>
            {running ? 'Running...' : '▶ Run'}
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1" style={{ minHeight: 0 }}>
          <FullscreenPanel label="Code Editor">
          <Editor
            height="100%"
            language={monacoLang}
            value={code}
            onChange={handleCodeChange}
            theme="vs-light"
            options={{
              fontSize: 14,
              fontFamily: 'JetBrains Mono, monospace',
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 4,
              automaticLayout: true,
              readOnly: false,
            }}
          />
          </FullscreenPanel>
        </div>

        {/* Output panel */}
        {output && (
          <div className="shrink-0" style={{ borderTop: '1px solid var(--border-subtle)', maxHeight: '30%' }}>
            <div className="flex items-center justify-between px-3 py-1"
              style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
              <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-ghost)' }}>Output</span>
              <button onClick={() => setOutput('')} className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>&times;</button>
            </div>
            <pre className="overflow-auto px-3 py-2 text-xs"
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                background: 'var(--bg-base)',
                whiteSpace: 'pre-wrap',
                maxHeight: '150px',
              }}>
              {output}
            </pre>
          </div>
        )}
      </div>
    </ToolContainer>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Coding Plugin Component                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

type CodingTab = 'canvas' | 'editor'

function CodingPlugin({ role, unlockedTabIds, onShowAllTools }: PluginProps) {
  const [tab, setTab] = useState<CodingTab>('editor') // Default to editor for CS

  const tabs: { id: CodingTab; label: string; sources?: string }[] = [
    { id: 'editor', label: '💻 Code',     sources: 'Monaco Editor + Piston Runtime' },
    { id: 'canvas', label: 'Diagrams' },
  ]

  // Phase I-2 / Classroom #5 — progressive tab reveal.
  const visibleTabs = unlockedTabIds === undefined
    ? tabs
    : tabs.filter((t, i) => i === 0 || unlockedTabIds.includes(t.id))
  const hasLockedTabs = visibleTabs.length < tabs.length

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-1 px-2 py-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {visibleTabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: tab === t.id ? 'var(--bg-elevated)' : 'transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-ghost)',
            }}>
            {t.label}
          </button>
        ))}
        {hasLockedTabs && onShowAllTools && (
          <button
            type="button"
            onClick={() => onShowAllTools(tabs.map((t) => t.id))}
            className="ml-auto rounded-md px-2 py-1 text-[11px] transition-colors hover:opacity-80"
            style={{ background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer' }}
          >
            Show all tools ↓
          </button>
        )}
      </div>
      <div className="relative flex-1">
        {tab === 'editor' && <CodeEditorPanel role={role} />}
        {tab === 'canvas' && <CollaborativeCanvas role={role} />}
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = {
  Component: CodingPlugin,
  sourceLabel: 'Monaco Editor + Piston Runtime',
}

export default plugin
