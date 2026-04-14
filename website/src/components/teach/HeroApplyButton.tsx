'use client'

/**
 * Hero CTA for /teach — gold button that smooth-scrolls to the
 * application form (Section 6, id="apply") instead of navigating away.
 *
 * Extracted as its own client component so the rest of the /teach page
 * stays a server component. Styled identically to the original Link —
 * same padding, radius, shadow, font — so the visual doesn't shift.
 */

export function HeroApplyButton() {
  function handleClick() {
    const target = document.getElementById('apply')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 transition-all duration-200"
      style={{
        background:   '#C9993A',
        color:        '#0F1923',
        padding:      '18px 36px',
        borderRadius: '14px',
        fontSize:     '16px',
        fontWeight:   700,
        boxShadow:    '0 12px 40px rgba(201,153,58,0.25)',
        border:       'none',
        cursor:       'pointer',
        fontFamily:   'inherit',
      }}
    >
      Apply to join our faculty
      <span aria-hidden="true" style={{ fontSize: '18px' }}>&rarr;</span>
    </button>
  )
}
