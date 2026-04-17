'use client'

import { useCallback, useEffect, useState } from 'react'
import { Tldraw, Editor, TLRecord } from 'tldraw'
import { useRoom } from './liveblocks.config'
import { LiveblocksYjsProvider } from '@liveblocks/yjs'
import * as Y from 'yjs'
import 'tldraw/tldraw.css'

/**
 * tldraw canvas synced in real-time via Liveblocks Yjs.
 *
 * Architecture:
 * - One Yjs document per Liveblocks room (per session)
 * - tldraw records are stored in a Y.Map inside the Yjs doc
 * - Changes propagate via Liveblocks WebSocket — sub-100ms latency
 * - Faculty draws, students see strokes appear in real time
 */
export function CollaborativeCanvas({
  role: _role,
}: {
  role: 'faculty' | 'student'
}) {
  const room = useRoom()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [synced, setSynced] = useState(false)

  // Create Yjs doc + Liveblocks provider on mount
  useEffect(() => {
    if (!editor) return
    const ed = editor // non-null capture for closures

    const yDoc = new Y.Doc()
    const yProvider = new LiveblocksYjsProvider(room, yDoc)
    const yRecords = yDoc.getMap<TLRecord>('tldraw')

    // ── Yjs → tldraw: apply remote changes ──────────────────────────
    function handleYjsUpdate() {
      ed.store.mergeRemoteChanges(() => {
        const yEntries = Object.fromEntries(yRecords.entries())
        const storeRecords = ed.store.allRecords()
        const storeMap = new Map(storeRecords.map((r) => [r.id, r]))

        // Add or update records from Yjs
        const toPut: TLRecord[] = []
        for (const [id, record] of Object.entries(yEntries)) {
          const existing = storeMap.get(id as TLRecord['id'])
          if (!existing || JSON.stringify(existing) !== JSON.stringify(record)) {
            toPut.push(record)
          }
        }
        if (toPut.length > 0) {
          ed.store.put(toPut)
        }

        // Remove records not in Yjs (deleted by remote)
        const yIds = new Set(yRecords.keys())
        const toRemove: TLRecord['id'][] = []
        for (const record of storeRecords) {
          // Don't remove built-in tldraw records (page, camera, etc.)
          if (!yIds.has(record.id) && record.typeName === 'shape') {
            toRemove.push(record.id)
          }
        }
        if (toRemove.length > 0) {
          ed.store.remove(toRemove)
        }
      })
    }

    yRecords.observe(handleYjsUpdate)

    // ── tldraw → Yjs: push local changes ────────────────────────────
    const unsub = ed.store.listen(
      ({ changes }) => {
        yDoc.transact(() => {
          for (const record of Object.values(changes.added)) {
            if (record.typeName === 'shape') {
              yRecords.set(record.id, record)
            }
          }
          for (const [, to] of Object.values(changes.updated)) {
            if (to.typeName === 'shape') {
              yRecords.set(to.id, to)
            }
          }
          for (const record of Object.values(changes.removed)) {
            yRecords.delete(record.id)
          }
        })
      },
      { source: 'user', scope: 'document' }
    )

    // Mark synced once provider connects
    yProvider.on('sync', (isSynced: boolean) => {
      if (isSynced) {
        handleYjsUpdate() // Load initial state
        setSynced(true)
      }
    })

    return () => {
      unsub()
      yRecords.unobserve(handleYjsUpdate)
      yProvider.destroy()
      yDoc.destroy()
    }
  }, [editor, room])

  const handleMount = useCallback((e: Editor) => {
    setEditor(e)
  }, [])

  return (
    <div className="relative h-full w-full">
      {!synced && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center"
          style={{ background: 'var(--bg-base)' }}
        >
          <div className="text-center">
            <div
              className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2"
              style={{ borderColor: 'var(--border-medium)', borderTopColor: 'var(--gold)' }}
            />
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>
              Connecting canvas...
            </p>
          </div>
        </div>
      )}
      <Tldraw
        onMount={handleMount}
        inferDarkMode={false}
        autoFocus
      />
    </div>
  )
}
