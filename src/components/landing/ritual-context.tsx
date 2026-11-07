'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type RitualModalContextValue = {
  isOpen: boolean
  preselectedSlug: string | null
  openRitual: (slug?: string) => void
  closeRitual: () => void
}

const RitualModalContext = createContext<RitualModalContextValue | null>(null)

export function RitualModalProvider({
  children,
}: {
  children: ReactNode
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [preselectedSlug, setPreselectedSlug] = useState<string | null>(null)

  const openRitual = useCallback((slug?: string) => {
    setPreselectedSlug(slug ?? null)
    setIsOpen(true)
  }, [])

  const closeRitual = useCallback(() => {
    setIsOpen(false)
  }, [])

  const value = useMemo(
    () => ({ isOpen, preselectedSlug, openRitual, closeRitual }),
    [isOpen, preselectedSlug, openRitual, closeRitual],
  )

  return <RitualModalContext.Provider value={value}>{children}</RitualModalContext.Provider>
}

export function useRitualModal(): RitualModalContextValue {
  const ctx = useContext(RitualModalContext)
  if (!ctx) {
    throw new Error('useRitualModal must be used inside RitualModalProvider')
  }
  return ctx
}
