'use client'

// ─────────────────────────────────────────────────────────────────────────────
// FacultyToolsButton
//
// Top-bar toggle that opens the FacultyToolDock panel. Matches the visual
// rhythm of the "Email today's chat" and "Guided tour" buttons in
// SaathiHeader. Dispatches the `faculty-dock:toggle` window event the dock
// listens for — avoids prop-drilling across ChatWindow → SaathiHeader.
//
// First-visit sparkle runs for 3s; dismissed via same localStorage key the
// dock uses (`faculty_tools_seen_v1`) so the cues go quiet together.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'

const FIRST_VISIT_KEY = 'faculty_tools_seen_v1'

export function FacultyToolsButton() {
  const [sparkle, setSparkle] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (!localStorage.getItem(FIRST_VISIT_KEY)) {
        setSparkle(true)
        const t = setTimeout(() => setSparkle(false), 3000)
        return () => clearTimeout(t)
      }
    } catch { /* storage unavailable — ignore */ }
  }, [])

  function toggle() {
    window.dispatchEvent(new Event('faculty-dock:toggle'))
    try { localStorage.setItem(FIRST_VISIT_KEY, '1') } catch { /* ignore */ }
    setSparkle(false)
  }

  return (
    <>
      <button
        onClick={toggle}
        title="Your Saathi's research basket — free tools, no limits"
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
          sparkle ? 'faculty-tools-btn-sparkle' : ''
        }`}
        style={{
          background: 'var(--bg-elevated)',
          border:     '1px solid var(--border-medium)',
          color:      'var(--text-secondary)',
          cursor:     'pointer',
          position:   'relative',
        }}
      >
        🔧 Tools
        {sparkle && (
          <span
            aria-hidden="true"
            style={{
              position:  'absolute',
              top:       -4,
              right:     -4,
              background:'#C9993A',
              color:     '#fff',
              fontSize:  8,
              fontWeight:700,
              letterSpacing: 0.3,
              padding:   '2px 5px',
              borderRadius: 6,
              pointerEvents: 'none',
            }}
          >
            NEW
          </span>
        )}
      </button>

      <style jsx>{`
        .faculty-tools-btn-sparkle {
          box-shadow: 0 0 0 0 rgba(201, 153, 58, 0.55);
          animation: facultyToolsBtnPulse 1.6s ease-out 2;
        }
        @keyframes facultyToolsBtnPulse {
          0%   { box-shadow: 0 0 0 0 rgba(201, 153, 58, 0.55); }
          70%  { box-shadow: 0 0 0 8px rgba(201, 153, 58, 0); }
          100% { box-shadow: 0 0 0 0 rgba(201, 153, 58, 0); }
        }
      `}</style>
    </>
  )
}
