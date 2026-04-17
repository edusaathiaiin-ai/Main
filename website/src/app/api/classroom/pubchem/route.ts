import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side proxy for PubChem REST API.
 * Keeps PubChem calls off the client — avoids CORS and rate-limit issues.
 *
 * GET /api/classroom/pubchem?name=aspirin
 * GET /api/classroom/pubchem?cid=2244
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const name = searchParams.get('name')
  const cid = searchParams.get('cid')

  if (!name && !cid) {
    return NextResponse.json({ error: 'Provide ?name= or ?cid=' }, { status: 400 })
  }

  try {
    // Resolve compound
    const identifier = cid ?? name
    const idType = cid ? 'cid' : 'name'
    const baseUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/${idType}/${encodeURIComponent(identifier!)}`

    // Fetch compound properties
    const propsUrl = `${baseUrl}/property/MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES,InChIKey/JSON`
    const propsRes = await fetch(propsUrl)

    if (!propsRes.ok) {
      return NextResponse.json(
        { error: `Compound "${identifier}" not found` },
        { status: 404 }
      )
    }

    const propsData = await propsRes.json()
    const props = propsData.PropertyTable?.Properties?.[0]

    if (!props) {
      return NextResponse.json({ error: 'No properties found' }, { status: 404 })
    }

    // Fetch 3D conformer SDF for 3Dmol.js rendering
    const sdfUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${props.CID}/record/SDF?record_type=3d`
    const sdfRes = await fetch(sdfUrl)
    const sdf = sdfRes.ok ? await sdfRes.text() : null

    return NextResponse.json({
      cid: props.CID,
      name: identifier,
      formula: props.MolecularFormula,
      molecular_weight: props.MolecularWeight,
      iupac_name: props.IUPACName,
      smiles: props.CanonicalSMILES,
      inchi_key: props.InChIKey,
      sdf,
    })
  } catch {
    return NextResponse.json({ error: 'PubChem request failed' }, { status: 502 })
  }
}
