# Phase 1: Rich Content Rendering in EdUsaathiAI Chat

Three zero-cost capabilities that benefit 18+ Saathis immediately.
The AI outputs structured tags → frontend renders them visually.

## Proposed Changes

### 1. Math Rendering — KaTeX
**Saathis:** MaathSaathi, PhysiSaathi, ChemSaathi, BioSaathi, AeroSaathi, CSSaathi (+8 more)

**How it works:**
- AI outputs standard LaTeX: `$$\int_0^\infty e^{-x^2}dx = \frac{\sqrt{\pi}}{2}$$`
- `MessageBubble.tsx` detects `$$...$$` (block) and `$...$` (inline) and renders with KaTeX
- npm package `katex` + `react-katex` — no API key, no cost

#### [MODIFY] MessageBubble.tsx
- Parse message content for `$$...$$` and `$...$`
- Render those segments with `<InlineMath>` / `<BlockMath>` from `react-katex`

#### [MODIFY] chat/index.ts (Edge Function)
- Add to system prompts for STEM saathis: "Use LaTeX notation for all equations wrapped in `$$`"

---

### 2. Diagram Rendering — Mermaid
**Saathis:** ArchSaathi, CivilSaathi, CSSaathi, BioSaathi, EconSaathi, KanoonSaathi

**How it works:**
- AI outputs fenced code blocks with language `mermaid`
- `MessageBubble.tsx` detects ` ```mermaid ` blocks and renders with `mermaid` npm package
- No API key, no cost

#### [MODIFY] MessageBubble.tsx
- Detect code blocks with `mermaid` language identifier
- Render with `mermaid.render()` into an SVG

#### [MODIFY] chat/index.ts (Edge Function)
- Add to ARCH/BIO/CS system prompts: "For process flows and organism diagrams, use mermaid code blocks"

---

### 3. Molecule Viewer — PubChem
**Saathis:** ChemSaathi, PharmaSaathi, BioSaathi

**How it works:**
- AI outputs: `[MOLECULE: aspirin]` or `[MOLECULE: C9H8O4]`
- Frontend calls `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{query}/PNG`
- Displays the 2D structure image (free, no key)

#### [MODIFY] MessageBubble.tsx
- Detect `[MOLECULE: ...]` tags
- Fetch PNG from PubChem REST API (client-side, CORS-friendly)
- Render as image with compound name caption

#### [MODIFY] chat/index.ts (Edge Function)
- Add to CHEM/PHARMA/BIO system prompts: "For any chemical compound discussed, output `[MOLECULE: compound-name]`"

---

## Verification Plan

### Automated Tests
```bash
npm run build  # zero errors
```

### Manual Verification
1. In MaathSaathi chat: ask "What is the integral of e^-x^2?" → equation renders
2. In ChemSaathi chat: ask "Explain glucose" → `[MOLECULE: glucose]` renders as structure
3. In ArchSaathi chat: ask "Show a simple floor plan workflow" → Mermaid diagram renders

## Implementation Order
1. Install packages (`katex`, `react-katex`, `mermaid`)
2. Rewrite `MessageBubble.tsx` to handle rich content
3. Update STEM/CHEM/ARCH system prompts in Edge Function
4. Build, test, commit, push
