'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DataDownloadButtonProps {
  userId: string
}

export default function DataDownloadButton({
  userId,
}: DataDownloadButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const supabase = createClient()

      const [
        { data: profile },
        { data: souls },
        { data: messages },
        { data: checkins },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('student_soul').select('*').eq('user_id', userId),
        supabase
          .from('chat_messages')
          .select('id,role,content,created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('checkin_results').select('*').eq('user_id', userId),
      ])

      const exportData = {
        exported_at: new Date().toISOString(),
        platform: 'EdUsaathiAI',
        data_controller: 'EdUsaathiAI, Gujarat, India',
        dpdp_notice: 'Exported under DPDP Act 2023 Right to Access',
        profile,
        soul_profiles: souls,
        chat_messages_last_100: messages,
        checkin_results: checkins,
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `edusaathiai-my-data-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Data download failed:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-60"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: 'rgba(255,255,255,0.7)',
      }}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
          Preparing your data...
        </>
      ) : (
        <>
          <span>⬇</span>
          Download my data (JSON)
        </>
      )}
    </button>
  )
}
