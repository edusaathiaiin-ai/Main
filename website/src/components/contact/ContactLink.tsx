'use client'

import { useState } from 'react'
import { ContactModal } from './ContactModal'

/**
 * Client-only footer "Contact" link.
 * Renders as a button styled like a link so it sits naturally in
 * footer <li> lists. Opens the ContactModal on click.
 */
export function ContactLink({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        {children}
      </button>
      <ContactModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
