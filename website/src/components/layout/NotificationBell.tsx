'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  action_url: string | null
  is_read: boolean
  created_at: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function typeIcon(type: string): string {
  const icons: Record<string, string> = {
    board_answered: '✦',
    session_accepted: '📅',
    session_paid: '💳',
    lecture_booked: '🎓',
    intent_fulfilled: '🎯',
    application_update: '📋',
  }
  return icons[type] ?? '🔔'
}

export function NotificationBell() {
  const { profile } = useAuthStore()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    // Initial fetch — 10 most recent
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        const rows = (data ?? []) as Notification[]
        setNotifications(rows)
        setUnread(rows.filter((n) => !n.is_read).length)
      })

    // Realtime — new notifications
    const channel = supabase
      .channel(`notif-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const n = payload.new as Notification
          setNotifications((prev) => [n, ...prev].slice(0, 10))
          setUnread((c) => c + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleOpen() {
    setOpen((v) => !v)
    if (!open && unread > 0 && profile) {
      // Mark all as read
      const supabase = createClient()
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnread(0)
    }
  }

  function handleNotifClick(n: Notification) {
    setOpen(false)
    if (n.action_url) router.push(n.action_url)
  }

  return (
    <div
      ref={dropdownRef}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {/* Bell button */}
      <button
        onClick={handleOpen}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: open ? 'var(--border-medium)' : 'var(--bg-elevated)',
          border: '0.5px solid var(--border-medium)',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-secondary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              minWidth: '16px',
              height: '16px',
              borderRadius: '8px',
              background: '#EF4444',
              color: '#fff',
              fontSize: '9px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '1.5px solid #060F1D',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '320px',
              borderRadius: '16px',
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border-medium)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              zIndex: 200,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 16px 10px',
                borderBottom: '0.5px solid var(--bg-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                Notifications
              </p>
              {notifications.length > 0 && (
                <span
                  style={{ fontSize: '10px', color: 'var(--text-ghost)' }}
                >
                  {notifications.length} recent
                </span>
              )}
            </div>

            {/* List */}
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: '24px', margin: '0 0 8px' }}>🔔</p>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-ghost)',
                    margin: 0,
                  }}
                >
                  No notifications yet
                </p>
              </div>
            ) : (
              <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      display: 'block',
                      padding: '12px 16px',
                      border: 'none',
                      borderBottom: '0.5px solid var(--bg-elevated)',
                      background: n.is_read
                        ? 'transparent'
                        : 'rgba(201,153,58,0.05)',
                      cursor: n.action_url ? 'pointer' : 'default',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (n.action_url)
                        e.currentTarget.style.background =
                          'var(--bg-elevated)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = n.is_read
                        ? 'transparent'
                        : 'rgba(201,153,58,0.05)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '16px',
                          flexShrink: 0,
                          marginTop: '1px',
                        }}
                      >
                        {typeIcon(n.type)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: n.is_read ? 'var(--text-secondary)' : '#fff',
                            margin: '0 0 2px',
                            lineHeight: 1.4,
                          }}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-ghost)',
                              margin: '0 0 4px',
                              lineHeight: 1.4,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {n.body}
                          </p>
                        )}
                        <p
                          style={{
                            fontSize: '10px',
                            color: 'var(--text-ghost)',
                            margin: 0,
                          }}
                        >
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#C9993A',
                            flexShrink: 0,
                            marginTop: '5px',
                          }}
                        />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Footer */}
            <div
              style={{
                padding: '10px 16px',
                borderTop: '0.5px solid var(--bg-elevated)',
                textAlign: 'center',
              }}
            >
              <button
                onClick={() => setOpen(false)}
                style={{
                  fontSize: '11px',
                  color: 'var(--text-ghost)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
