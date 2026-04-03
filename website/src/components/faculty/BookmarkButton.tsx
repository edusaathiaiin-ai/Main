'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

type Props = {
  facultyId: string;
  facultyName: string;
  size?: 'sm' | 'md';
};

export function BookmarkButton({ facultyId, facultyName, size = 'md' }: Props) {
  const { profile } = useAuthStore();
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();
    supabase
      .from('faculty_bookmarks')
      .select('id')
      .eq('student_id', profile.id)
      .eq('faculty_id', facultyId)
      .maybeSingle()
      .then(({ data }) => setBookmarked(!!data));
  }, [profile, facultyId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!profile || loading) return;
    setLoading(true);
    const supabase = createClient();
    if (bookmarked) {
      await supabase
        .from('faculty_bookmarks')
        .delete()
        .eq('student_id', profile.id)
        .eq('faculty_id', facultyId);
      setBookmarked(false);
      setToast('Removed from saved');
    } else {
      await supabase
        .from('faculty_bookmarks')
        .insert({ student_id: profile.id, faculty_id: facultyId });
      setBookmarked(true);
      setToast(`${facultyName.split(' ')[0]} saved!`);
    }
    setLoading(false);
    setTimeout(() => setToast(null), 2500);
  }

  const isSmall = size === 'sm';

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={toggle}
        disabled={loading}
        aria-label={bookmarked ? 'Remove from saved' : 'Save faculty'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: isSmall ? '32px' : '40px',
          height: isSmall ? '32px' : '40px',
          borderRadius: isSmall ? '8px' : '10px',
          background: bookmarked ? 'rgba(201,153,58,0.15)' : 'rgba(255,255,255,0.06)',
          border: bookmarked
            ? '0.5px solid rgba(201,153,58,0.5)'
            : '0.5px solid rgba(255,255,255,0.12)',
          cursor: loading ? 'default' : 'pointer',
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
      >
        <svg
          width={isSmall ? 14 : 18}
          height={isSmall ? 14 : 18}
          viewBox="0 0 24 24"
          fill={bookmarked ? '#C9993A' : 'none'}
          stroke={bookmarked ? '#C9993A' : 'rgba(255,255,255,0.4)'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {toast && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            fontSize: '11px',
            fontWeight: '600',
            padding: '5px 10px',
            borderRadius: '8px',
            background: '#0B1F3A',
            color: '#C9993A',
            border: '0.5px solid rgba(201,153,58,0.4)',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
