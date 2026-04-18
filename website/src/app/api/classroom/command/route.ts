import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!

const SAATHI_TOOLS: Record<string, string[]> = {
  physicsaathi:    ['geogebra', 'phet', 'nist', 'wolfram'],
  chemsaathi:      ['pubchem', 'wolfram'],
  biosaathi:       ['rcsb', 'pubmed'],
  biotechsaathi:   ['rcsb', 'pubmed'],
  pharmasaathi:    ['pubchem', 'rcsb', 'pubmed'],
  maathsaathi:     ['geogebra', 'wolfram'],
  kanoonsaathi:    ['indiankanoon'],
  compsaathi:      ['monaco'],
  aerospacesaathi: ['nasa', 'geogebra', 'phet', 'wolfram'],
  archsaathi:      ['leaflet'],
  medicosaathi:    ['pubmed', 'rcsb'],
  nursingsaathi:   ['pubmed'],
}

const SAATHI_NAMES: Record<string, string> = {
  physicsaathi: 'PhysicsSaathi', chemsaathi: 'ChemSaathi', biosaathi: 'BioSaathi',
  biotechsaathi: 'BioTechSaathi', pharmasaathi: 'PharmaSaathi', maathsaathi: 'MaathSaathi',
  kanoonsaathi: 'KanoonSaathi', compsaathi: 'CompSaathi', aerospacesaathi: 'AerospaceSaathi',
  archsaathi: 'ArchSaathi', medicosaathi: 'MedicoSaathi', nursingsaathi: 'NursingSaathi',
}

export async function POST(req: NextRequest) {
  console.log('ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY)
  try {
    // Auth
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { command, saathiSlug, sessionId } = await req.json()
    if (!command || !saathiSlug || !sessionId) {
      return NextResponse.json({ error: 'command, saathiSlug, sessionId required' }, { status: 400 })
    }

    const tools = SAATHI_TOOLS[saathiSlug] ?? ['wolfram', 'pubmed']
    const saathiName = SAATHI_NAMES[saathiSlug] ?? 'Saathi'

    // Call Claude Haiku
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: `You are the classroom teaching assistant for ${saathiName}.
Faculty typed a command. Identify the correct tool to load and extract the query parameters.

Available tools for ${saathiSlug}: ${tools.join(', ')}

Tool parameter schemas:
- geogebra: { "mode": "graphing" | "geometry" | "3d" | "classic", "expression": "optional math expression" }
- pubchem: { "compound_name": "aspirin" }
- phet: { "sim_name": "projectile-motion" }
- wolfram: { "query": "integrate sin(x) dx" }
- rcsb: { "protein_name": "insulin" } or { "pdb_id": "1A2B" }
- indiankanoon: { "query": "Section 498A" }
- monaco: { "language": "python", "starter_code": "optional" }
- pubmed: { "query": "CRISPR gene editing" }
- nist: { "search_term": "speed of light" }
- nasa: { "query": "mars landing", "action": "ntrs" | "images" | "apod" }
- leaflet: { "lat": 41.89, "lng": 12.49, "zoom": 15 }
- none: {} (when no tool matches)

Respond ONLY in JSON — no preamble, no markdown, no explanation:
{"tool":"...","params":{...},"displayText":"Loading ... from ..."}`,
        messages: [{ role: 'user', content: command }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      console.error('[classroom/command] Claude API error:', err)
      return NextResponse.json({ error: 'AI request failed' }, { status: 502 })
    }

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text ?? '{}'

    let result: { tool: string; params: Record<string, unknown>; displayText: string }
    try {
      result = JSON.parse(rawText)
    } catch {
      result = { tool: 'none', params: {}, displayText: 'Could not parse AI response. Try a more specific command.' }
    }

    // Validate tool is in the available list (or none)
    if (result.tool !== 'none' && !tools.includes(result.tool)) {
      result = { tool: 'none', params: {}, displayText: `Tool "${result.tool}" is not available for ${saathiName}. Available: ${tools.join(', ')}` }
    }

    // Log to DB (fire-and-forget)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    admin.from('classroom_commands').insert({
      session_id: sessionId,
      user_id: user.id,
      saathi_slug: saathiSlug,
      command,
      tool: result.tool,
      params: result.params,
      display_text: result.displayText,
    }).then(() => {}, () => {})

    return NextResponse.json(result)
  } catch (err) {
    console.error('[classroom/command] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
