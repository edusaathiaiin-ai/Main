'use client'

import { useEffect, useState } from 'react'
import { TourTooltip } from './TourTooltip'
import { FACULTY_TOUR, INSTITUTION_TOUR, STUDENT_TOUR } from './tourSteps'
import { useAuthStore } from '@/stores/authStore'
import { SAATHIS } from '@/constants/saathis'
import { toSlug } from '@/constants/verticalIds'
import type { TourStep } from './TourTooltip'

const TOUR_KEY = 'edusaathiai_tour_v1'

export function TourManager({ forceShow, onClose }: { forceShow?: boolean; onClose?: () => void } = {}) {
  const { profile } = useAuthStore()
  const [showTour, setShowTour] = useState(false)
  const [steps, setSteps] = useState<TourStep[]>([])

  // Manual trigger via forceShow prop
  useEffect(() => {
    if (forceShow && profile) {
      const role = profile.role ?? 'student'
      setSteps(role === 'faculty' ? FACULTY_TOUR : role === 'institution' ? INSTITUTION_TOUR : STUDENT_TOUR)
      setShowTour(true)
    }
  }, [forceShow, profile])

  useEffect(() => {
    if (!profile || forceShow) return

    const completed = localStorage.getItem(`${TOUR_KEY}_${profile.id}`)
    if (completed) return

    const timer = setTimeout(() => {
      const role = profile.role ?? 'student'

      if (role === 'faculty') {
        setSteps(FACULTY_TOUR)
      } else if (role === 'institution') {
        setSteps(INSTITUTION_TOUR)
      } else {
        setSteps(STUDENT_TOUR)
      }

      setShowTour(true)
    }, 1500)

    return () => clearTimeout(timer)
  }, [profile])

  function handleComplete() {
    setShowTour(false)
    onClose?.()
    if (profile?.id) {
      localStorage.setItem(`${TOUR_KEY}_${profile.id}`, new Date().toISOString())
    }
  }

  const slug = toSlug(profile?.primary_saathi_id ?? '')
  const saathi = SAATHIS.find((s) => s.id === slug)
  const accentColor = saathi?.primary ?? '#C9993A'

  if (!showTour || steps.length === 0) return null

  return (
    <TourTooltip steps={steps} onComplete={handleComplete} accentColor={accentColor} />
  )
}
