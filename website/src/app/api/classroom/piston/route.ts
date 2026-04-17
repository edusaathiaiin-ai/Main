import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side proxy for Piston code execution API.
 * Piston is free, open-source, no key needed.
 *
 * POST /api/classroom/piston
 * Body: { language: "python", version: "3.10.0", code: "print('hello')" }
 */

const LANGUAGE_VERSIONS: Record<string, string> = {
  python: '3.10.0',
  javascript: '18.15.0',
  typescript: '5.0.3',
  java: '15.0.2',
  'c++': '10.2.0',
  sql: '3.36.0',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { language, code } = body as { language: string; code: string }

    if (!language || !code) {
      return NextResponse.json({ error: 'Provide language and code' }, { status: 400 })
    }

    // Map language names to Piston identifiers
    const pistonLang = language === 'c++' ? 'c++' : language
    const version = LANGUAGE_VERSIONS[language] ?? '3.10.0'

    const res = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: pistonLang,
        version,
        files: [{ content: code }],
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Execution failed' }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({
      language: data.language,
      version: data.version,
      stdout: data.run?.stdout ?? '',
      stderr: data.run?.stderr ?? '',
      exit_code: data.run?.code ?? 0,
    })
  } catch {
    return NextResponse.json({ error: 'Piston request failed' }, { status: 502 })
  }
}
