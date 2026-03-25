// ============================================================
// Edge Function: auto-add-college
// Phase 2: Community-sourced college auto-addition
// When parse-education finds no DB match and user confirms,
// this inserts the college as college_type='community'
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });

    // ── Parse body ──────────────────────────────────────────────────────────
    const body = await req.json();
    const {
      institution_name,   // required: exact name as typed/confirmed by student
      city,               // optional
      state,              // optional
      courses = [],       // optional: array of course abbreviations
    } = body;

    if (!institution_name?.trim()) {
      return new Response(JSON.stringify({ error: 'institution_name is required' }), { status: 400, headers: CORS });
    }

    // ── Input length validation ────────────────────────────────────────────────
    if (institution_name.trim().length > 200) {
      return new Response(JSON.stringify({ error: 'institution_name too long (max 200 chars)' }), { status: 400, headers: CORS });
    }
    if (city && city.trim().length > 100) {
      return new Response(JSON.stringify({ error: 'city too long (max 100 chars)' }), { status: 400, headers: CORS });
    }
    if (state && state.trim().length > 100) {
      return new Response(JSON.stringify({ error: 'state too long (max 100 chars)' }), { status: 400, headers: CORS });
    }
    if (!Array.isArray(courses) || courses.length > 50) {
      return new Response(JSON.stringify({ error: 'courses must be an array of max 50 items' }), { status: 400, headers: CORS });
    }
    if (courses.some((c: unknown) => typeof c !== 'string' || c.length > 20)) {
      return new Response(JSON.stringify({ error: 'each course code must be a string ≤20 chars' }), { status: 400, headers: CORS });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // ── Step 1: Check if already exists (similarity > 0.8 = very close match) ──
    const { data: existingMatches } = await supabase.rpc('search_colleges', {
      query: institution_name.trim(),
      limit_count: 1,
    });

    if (existingMatches && existingMatches.length > 0 && existingMatches[0].similarity >= 0.80) {
      // College already in DB — return existing record, don't duplicate
      return new Response(JSON.stringify({
        action: 'found_existing',
        college: existingMatches[0],
        message: 'College already in database',
      }), {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Step 2: Infer state from city if state not provided ─────────────────
    const inferredState = state?.trim() || inferStateFromCity(city?.trim() || '');

    // ── Step 3: Insert community college ────────────────────────────────────
    const { data: newCollege, error: insertError } = await supabase
      .from('colleges')
      .insert({
        name: institution_name.trim(),
        aliases: [],
        city: city?.trim() || 'Unknown',
        state: inferredState || 'India',
        university: null,
        college_type: 'community',   // distinguishes from seeded data
        naac_grade: null,
        courses: courses,
      })
      .select('id, name, city, state')
      .single();

    if (insertError) {
      console.error('[auto-add-college] insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to add college', detail: insertError.message }), {
        status: 500, headers: CORS,
      });
    }

    // ── Step 4: Log community contribution to profiles ───────────────────────
    // Track that this user contributed a new college (gamification ready)
    await supabase
      .from('profiles')
      .update({ parsed_college_id: newCollege.id })
      .eq('id', user.id);

    console.log(`[auto-add-college] Added community college: "${institution_name}" by user ${user.id}`);

    return new Response(JSON.stringify({
      action: 'added',
      college: newCollege,
      message: `"${newCollege.name}" added to EdUsaathiAI's college database 🎉`,
    }), {
      status: 201,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[auto-add-college] unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: CORS });
  }
});

// ── City → State fallback map ────────────────────────────────────────────────
function inferStateFromCity(city: string): string {
  if (!city) return '';
  const c = city.toLowerCase().trim();
  const map: Record<string, string> = {
    ahmedabad: 'Gujarat', surat: 'Gujarat', vadodara: 'Gujarat', rajkot: 'Gujarat',
    gandhinagar: 'Gujarat', anand: 'Gujarat', nadiad: 'Gujarat', mehsana: 'Gujarat',
    mumbai: 'Maharashtra', pune: 'Maharashtra', nagpur: 'Maharashtra', nashik: 'Maharashtra',
    aurangabad: 'Maharashtra', kolhapur: 'Maharashtra', thane: 'Maharashtra', navi_mumbai: 'Maharashtra',
    'new delhi': 'Delhi', delhi: 'Delhi', noida: 'Uttar Pradesh', gurgaon: 'Haryana',
    gurugram: 'Haryana', faridabad: 'Haryana',
    bengaluru: 'Karnataka', bangalore: 'Karnataka', mysuru: 'Karnataka', mysore: 'Karnataka',
    mangaluru: 'Karnataka', manipal: 'Karnataka', hubli: 'Karnataka',
    chennai: 'Tamil Nadu', coimbatore: 'Tamil Nadu', madurai: 'Tamil Nadu',
    tiruchirappalli: 'Tamil Nadu', vellore: 'Tamil Nadu', thanjavur: 'Tamil Nadu',
    hyderabad: 'Telangana', warangal: 'Telangana', karimnagar: 'Telangana',
    visakhapatnam: 'Andhra Pradesh', vijayawada: 'Andhra Pradesh', guntur: 'Andhra Pradesh',
    tirupati: 'Andhra Pradesh', amaravati: 'Andhra Pradesh',
    kolkata: 'West Bengal', howrah: 'West Bengal', durgapur: 'West Bengal',
    jaipur: 'Rajasthan', jodhpur: 'Rajasthan', udaipur: 'Rajasthan', kota: 'Rajasthan',
    lucknow: 'Uttar Pradesh', kanpur: 'Uttar Pradesh', varanasi: 'Uttar Pradesh',
    allahabad: 'Uttar Pradesh', prayagraj: 'Uttar Pradesh', agra: 'Uttar Pradesh',
    indore: 'Madhya Pradesh', bhopal: 'Madhya Pradesh',
    patna: 'Bihar', guwahati: 'Assam', bhubaneswar: 'Odisha',
    thiruvananthapuram: 'Kerala', kochi: 'Kerala', kozhikode: 'Kerala', thrissur: 'Kerala',
    chandigarh: 'Punjab', amritsar: 'Punjab', ludhiana: 'Punjab', patiala: 'Punjab',
    dehradun: 'Uttarakhand', shimla: 'Himachal Pradesh', ranchi: 'Jharkhand',
    raipur: 'Chhattisgarh', panaji: 'Goa', imphal: 'Manipur', agartala: 'Tripura',
    aizawl: 'Mizoram', kohima: 'Nagaland', shillong: 'Meghalaya',
  };
  return map[c] || '';
}
