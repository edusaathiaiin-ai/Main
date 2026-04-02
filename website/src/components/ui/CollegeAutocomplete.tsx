'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

type CollegeResult = {
  id: string;
  name: string;
  city: string;
  state: string;
  university: string | null;
  naac_grade: string | null;
  college_type: string | null;
  score: number;
};

interface CollegeAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputStyle?: React.CSSProperties;
  className?: string;
}

export default function CollegeAutocomplete({
  value,
  onChange,
  placeholder = 'Start typing your college name…',
  inputStyle,
  className,
}: CollegeAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CollegeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync external value changes
  useEffect(() => { setQuery(value); }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); setOpen(false); return; }
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc('search_colleges', {
      query_text: q,
      result_limit: 6,
    });
    setResults((data as CollegeResult[]) ?? []);
    setOpen(true);
    setLoading(false);
  }, []);

  function handleInput(text: string) {
    setQuery(text);
    onChange(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 250);
  }

  function handleSelect(college: CollegeResult) {
    const display = `${college.name}, ${college.city}`;
    setQuery(display);
    onChange(display);
    setOpen(false);
    setResults([]);
  }

  const defaultInputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        placeholder={placeholder}
        className={className ?? 'w-full rounded-xl px-4 py-3 text-sm outline-none transition-all'}
        style={inputStyle ?? defaultInputStyle}
      />

      {/* Loading indicator */}
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 rounded-full border-2 border-white/10 border-t-[#C9993A] animate-spin" />
        </div>
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-xl"
          style={{
            background: '#0B1F3A',
            border: '1px solid rgba(255,255,255,0.1)',
            maxHeight: '240px',
            overflowY: 'auto',
          }}
        >
          {results.map((college) => (
            <button
              key={college.id}
              type="button"
              onClick={() => handleSelect(college)}
              className="w-full text-left px-4 py-3 transition-colors"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201,153,58,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <p className="text-sm font-semibold text-white truncate">{college.name}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {college.city}, {college.state}
                {college.naac_grade && college.naac_grade !== 'not-accredited' && (
                  <span style={{ marginLeft: '8px', color: 'rgba(201,153,58,0.7)' }}>
                    NAAC {college.naac_grade}
                  </span>
                )}
              </p>
            </button>
          ))}
          {/* Freetext fallback */}
          <div
            className="px-4 py-2.5 text-[10px]"
            style={{ color: 'rgba(255,255,255,0.25)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            Don&apos;t see yours? Keep typing — your input will be saved as-is.
          </div>
        </div>
      )}
    </div>
  );
}
