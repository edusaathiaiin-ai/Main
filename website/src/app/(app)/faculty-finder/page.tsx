'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { SAATHIS } from '@/constants/saathis';
import Link from 'next/link';

type FacultyRow = {
  id: string;
  full_name: string;
  city: string | null;
  primary_saathi_id: string | null;
};

type FacultyProfile = {
  institution_name: string;
  department: string;
  designation: string | null;
  verification_status: string;
  session_bio: string | null;
  expertise_tags: string[];
  session_active: boolean;
  session_fee_doubt: number;
  session_fee_research: number;
  session_fee_deepdive: number;
  offers_doubt_session: boolean;
  offers_research_session: boolean;
  offers_deepdive_session: boolean;
  total_sessions_completed: number;
  average_rating: number;
  total_reviews: number;
  open_to_research: boolean;
  availability_note: string | null;
  faculty_slug: string | null;
  years_experience: number;
  response_rate: number;
  is_emeritus: boolean;
  employment_status: string | null;
  former_institution: string | null;
  retirement_year: number | null;
};

type FacultyListing = FacultyRow & { faculty_profiles: FacultyProfile | null };

function formatFee(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`;
}

function getMinFee(fp: FacultyProfile): number {
  return Math.min(
    fp.offers_doubt_session ? fp.session_fee_doubt : Infinity,
    fp.offers_research_session ? fp.session_fee_research : Infinity,
    fp.offers_deepdive_session ? fp.session_fee_deepdive : Infinity,
  );
}

export default function FacultyFinderPage() {
  const [faculty, setFaculty] = useState<FacultyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSaathi, setFilterSaathi] = useState('all');
  const [filterSession, setFilterSession] = useState('all');
  const [filterTab, setFilterTab] = useState<'all' | 'verified' | 'emeritus'>('all');
  const [sortBy, setSortBy] = useState('rating');

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('profiles')
      .select(`id, full_name, city, primary_saathi_id, faculty_profiles (
        institution_name, department, designation, verification_status,
        session_bio, expertise_tags, session_active,
        session_fee_doubt, session_fee_research, session_fee_deepdive,
        offers_doubt_session, offers_research_session, offers_deepdive_session,
        total_sessions_completed, average_rating, total_reviews,
        open_to_research, availability_note, faculty_slug, years_experience, response_rate,
        is_emeritus, employment_status, former_institution, retirement_year
      )`)
      .eq('role', 'faculty')
      .not('faculty_profiles', 'is', null)
      .order('full_name')
      .then(({ data }) => {
        setFaculty((data ?? []) as unknown as FacultyListing[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    let result = faculty.filter((f) => {
      const fp = f.faculty_profiles;
      if (!fp) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          f.full_name.toLowerCase().includes(q) ||
          fp.institution_name?.toLowerCase().includes(q) ||
          fp.department?.toLowerCase().includes(q) ||
          fp.expertise_tags?.some((t) => t.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (filterSaathi !== 'all' && f.primary_saathi_id !== filterSaathi) return false;
      if (filterSession === 'doubt' && !fp.offers_doubt_session) return false;
      if (filterSession === 'research' && !fp.offers_research_session) return false;
      if (filterSession === 'deepdive' && !fp.offers_deepdive_session) return false;
      if (filterTab === 'verified' && fp.verification_status !== 'verified') return false;
      if (filterTab === 'emeritus' && !fp.is_emeritus) return false;
      return true;
    });

    result.sort((a, b) => {
      const af = a.faculty_profiles!;
      const bf = b.faculty_profiles!;
      if (sortBy === 'rating') return (bf.average_rating ?? 0) - (af.average_rating ?? 0);
      if (sortBy === 'sessions') return (bf.total_sessions_completed ?? 0) - (af.total_sessions_completed ?? 0);
      if (sortBy === 'price_low') return getMinFee(af) - getMinFee(bf);
      if (sortBy === 'experience') return (bf.years_experience ?? 0) - (af.years_experience ?? 0);
      return 0;
    });
    return result;
  }, [faculty, search, filterSaathi, filterSession, filterTab, sortBy]);

  // Emeritus faculty — for featured section
  const emeritusFaculty = useMemo(() =>
    faculty.filter((f) => f.faculty_profiles?.is_emeritus).sort((a, b) => (b.faculty_profiles?.years_experience ?? 0) - (a.faculty_profiles?.years_experience ?? 0)),
    [faculty]);

  const selectStyle: React.CSSProperties = {
    padding: '8px 14px', background: 'rgba(255,255,255,0.06)',
    border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '10px',
    color: '#fff', fontSize: '12px', outline: 'none', cursor: 'pointer',
  };

  return (
    <main className="min-h-screen" style={{ background: '#060F1D' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(180deg, #0B1F3A 0%, #060F1D 100%)', padding: '40px 24px 32px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
            <div>
              <p className="text-[11px] font-bold tracking-[2px] uppercase mb-2" style={{ color: '#C9993A' }}>EdUsaathiAI &middot; Knowledge Marketplace</p>
              <h1 className="font-playfair font-black text-white mb-2.5" style={{ fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: 1.15 }}>
                Find your Expert.<br /><span style={{ color: '#C9993A' }}>Learn from the best.</span>
              </h1>
              <p className="text-base max-w-[520px]" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                Connect with verified Indian academics for 1:1 sessions. Doubt clearing, research guidance, deep dives.
              </p>
            </div>
            <div className="flex gap-6">
              {[
                { num: faculty.length, label: 'Faculty' },
                { num: filtered.filter((f) => f.faculty_profiles?.verification_status === 'verified').length, label: 'Verified' },
                { num: 24, label: 'Subjects' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="font-playfair text-[32px] font-bold" style={{ color: '#C9993A' }}>{s.num}</p>
                  <p className="text-[11px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Search */}
          <div className="relative max-w-[600px]">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-40">&#x1F50D;</span>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, subject, institution..."
              className="w-full py-3.5 pl-12 pr-4 rounded-[14px] text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.5)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
          </div>
        </div>
      </div>

      {/* Filters + Results */}
      <div className="max-w-[1100px] mx-auto p-6">
        {/* Filter tabs: All / Verified / Emeritus */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
          {([
            { id: 'all' as const, label: 'All Faculty' },
            { id: 'verified' as const, label: '\u2713 Verified' },
            { id: 'emeritus' as const, label: '\u2726 Emeritus' },
          ]).map((t) => (
            <button key={t.id} onClick={() => setFilterTab(t.id)}
              className="px-5 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: filterTab === t.id ? (t.id === 'emeritus' ? '#C9993A' : 'rgba(255,255,255,0.12)') : 'transparent',
                color: filterTab === t.id ? (t.id === 'emeritus' ? '#060F1D' : '#fff') : 'rgba(255,255,255,0.4)',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Dropdowns row */}
        <div className="flex flex-wrap gap-2.5 items-center mb-6">
          <select value={filterSaathi} onChange={(e) => setFilterSaathi(e.target.value)} style={selectStyle}>
            <option value="all" style={{ background: '#0B1F3A' }}>All Subjects</option>
            {SAATHIS.map((s) => <option key={s.id} value={s.id} style={{ background: '#0B1F3A' }}>{s.emoji} {s.name}</option>)}
          </select>
          <select value={filterSession} onChange={(e) => setFilterSession(e.target.value)} style={selectStyle}>
            <option value="all" style={{ background: '#0B1F3A' }}>All Session Types</option>
            <option value="doubt" style={{ background: '#0B1F3A' }}>Doubt Clearing</option>
            <option value="research" style={{ background: '#0B1F3A' }}>Research Guidance</option>
            <option value="deepdive" style={{ background: '#0B1F3A' }}>Topic Deep Dive</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selectStyle}>
            <option value="rating" style={{ background: '#0B1F3A' }}>Top Rated</option>
            <option value="sessions" style={{ background: '#0B1F3A' }}>Most Sessions</option>
            <option value="price_low" style={{ background: '#0B1F3A' }}>Price: Low to High</option>
            <option value="experience" style={{ background: '#0B1F3A' }}>Most Experienced</option>
          </select>
          <div className="flex-1" />
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{filtered.length} faculty found</p>
        </div>

        {/* Emeritus featured section */}
        {filterTab === 'all' && emeritusFaculty.length > 0 && (
          <section className="mb-10">
            <div className="rounded-2xl p-6 mb-4" style={{ background: 'linear-gradient(135deg, rgba(201,153,58,0.08), rgba(201,153,58,0.02))', border: '1px solid rgba(201,153,58,0.2)' }}>
              <p className="text-[10px] font-bold uppercase tracking-[2px] mb-2" style={{ color: '#C9993A' }}>{'\u2726'} Emeritus Faculty</p>
              <h2 className="font-playfair text-xl font-bold text-white mb-1">
                India&apos;s greatest professors never really retired.
              </h2>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                They were just waiting for the right classroom.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {emeritusFaculty.slice(0, 3).map((f) => {
                const fp = f.faculty_profiles!;
                const saathi = SAATHIS.find((s) => s.id === f.primary_saathi_id);
                const slug = fp.faculty_slug ?? f.id;
                return (
                  <Link key={f.id} href={`/faculty-finder/${slug}`}
                    className="rounded-xl p-5 transition-all block"
                    style={{
                      background: 'rgba(201,153,58,0.04)',
                      border: '1px solid rgba(201,153,58,0.25)',
                      textDecoration: 'none',
                    }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                        style={{ background: 'rgba(201,153,58,0.2)', border: '2px solid rgba(201,153,58,0.4)' }}>
                        {saathi?.emoji ?? '\u{1F393}'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{f.full_name}</p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          Former {fp.designation}{fp.former_institution ? `, ${fp.former_institution}` : fp.institution_name ? `, ${fp.institution_name}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,153,58,0.2)', color: '#C9993A' }}>{'\u2726'} Emeritus</span>
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{fp.years_experience}+ years experience</span>
                    </div>
                    {fp.expertise_tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {fp.expertise_tags.slice(0, 3).map((t) => (
                          <span key={t} className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,153,58,0.1)', color: '#C9993A' }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[280px] rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">&#x1F50D;</p>
            <h3 className="font-playfair text-2xl text-white mb-2">No faculty found</h3>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Try different filters or search terms</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((f, i) => {
                const fp = f.faculty_profiles!;
                const saathi = SAATHIS.find((s) => s.id === f.primary_saathi_id);
                const color = saathi?.primary ?? '#C9993A';
                const minFee = getMinFee(fp);
                const isVerified = fp.verification_status === 'verified';
                const slug = fp.faculty_slug ?? f.id;

                return (
                  <motion.div key={f.id} layout
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: i * 0.03 }} whileHover={{ y: -4 }}
                    className="rounded-[18px] overflow-hidden flex flex-col cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', transition: 'border-color 0.2s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${color}40`)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                    onClick={() => { window.location.href = `/faculty-finder/${slug}`; }}
                  >
                    {/* Color bar */}
                    <div style={{ height: '5px', background: fp.is_emeritus ? 'linear-gradient(90deg, #C9993A, #E5B86A)' : `linear-gradient(90deg, ${color}, ${color}80)` }} />

                    <div className="p-5 flex-1">
                      {/* Name + rating */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-3 items-start">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0"
                            style={{ background: `${color}20`, border: `2px solid ${color}40` }}>
                            {saathi?.emoji ?? '\u{1F393}'}
                          </div>
                          <div>
                            <p className="text-[15px] font-bold text-white leading-tight">{f.full_name}</p>
                            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{fp.designation}</p>
                          </div>
                        </div>
                        {fp.average_rating > 0 && (
                          <div className="text-right">
                            <p className="text-[15px] font-bold" style={{ color: '#FB923C' }}>{'\u2B50'} {fp.average_rating.toFixed(1)}</p>
                            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{fp.total_reviews} reviews</p>
                          </div>
                        )}
                      </div>

                      {/* Institution */}
                      <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {'\u{1F3DB}\u{FE0F}'} {fp.institution_name}{f.city ? ` \u00B7 ${f.city}` : ''}
                      </p>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {fp.is_emeritus && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(201,153,58,0.2)', color: '#C9993A' }}>{'\u2726'} Emeritus</span>
                        )}
                        {isVerified && !fp.is_emeritus && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ADE80' }}>Verified</span>
                        )}
                        {fp.open_to_research && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.12)', color: '#818CF8' }}>Research</span>
                        )}
                        {fp.years_experience > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{fp.years_experience}y exp</span>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {fp.expertise_tags?.slice(0, 4).map((t) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-lg" style={{ background: `${color}12`, color, border: `0.5px solid ${color}25` }}>{t}</span>
                        ))}
                      </div>

                      {/* Bio */}
                      {fp.session_bio && (
                        <p className="text-xs mb-3 line-clamp-2" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                          &ldquo;{fp.session_bio}&rdquo;
                        </p>
                      )}

                      {/* Session types */}
                      <div className="flex flex-wrap gap-1.5">
                        {fp.offers_doubt_session && <span className="text-[10px] px-2 py-0.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)', color: '#818CF8' }}>Doubt</span>}
                        {fp.offers_research_session && <span className="text-[10px] px-2 py-0.5 rounded-lg" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80' }}>Research</span>}
                        {fp.offers_deepdive_session && <span className="text-[10px] px-2 py-0.5 rounded-lg" style={{ background: 'rgba(251,146,60,0.1)', color: '#FB923C' }}>Deep Dive</span>}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>
                      <div>
                        {minFee < Infinity && (
                          <>
                            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>From</p>
                            <p className="text-lg font-bold text-white">{formatFee(minFee)}<span className="text-[10px] font-normal" style={{ color: 'rgba(255,255,255,0.3)' }}>/session</span></p>
                          </>
                        )}
                      </div>
                      <Link href={`/faculty-finder/${slug}`} onClick={(e) => e.stopPropagation()}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold"
                        style={{ background: color, color: '#0B1F3A', textDecoration: 'none' }}>
                        View &amp; Book &rarr;
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </main>
  );
}
