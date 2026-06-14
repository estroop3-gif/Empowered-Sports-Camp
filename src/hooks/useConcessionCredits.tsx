'use client'

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'

interface CampBalance {
  campId: string
  campName: string
  balanceCents: number
}

interface Transaction {
  id: string
  type: string
  amount_cents: number
  balance_after_cents: number
  description: string | null
  performer_name: string | null
  created_at: string
}

interface CreditDetail {
  balanceCents: number
  transactions: Transaction[]
}

interface AthleteBalance {
  total: number
  camps: CampBalance[]
}

interface ConcessionCreditContextValue {
  getAthleteBalance: (athleteId: string) => number
  getAthleteCamps: (athleteId: string) => CampBalance[]
  getCreditDetail: (athleteId: string, campId: string) => CreditDetail | null
  fetchBalances: (athleteIds: string[], force?: boolean) => Promise<void>
  fetchDetail: (athleteId: string, campId: string, force?: boolean) => Promise<void>
  deductCredits: (params: { athleteId: string; campId: string; amountCents: number; description?: string }) => Promise<{ ok: boolean; error?: string }>
  adjustCredits: (params: { athleteId: string; campId: string; amountCents: number; description?: string }) => Promise<{ ok: boolean; error?: string }>
  invalidateAthlete: (athleteId: string) => Promise<void>
}

const ConcessionCreditContext = createContext<ConcessionCreditContextValue | null>(null)

export function ConcessionCreditProvider({ children }: { children: ReactNode }) {
  const [balances, setBalances] = useState<Record<string, AthleteBalance>>({})
  const [details, setDetails] = useState<Record<string, CreditDetail>>({})
  // Track in-flight fetches to avoid duplicate requests
  const inflightBalances = useRef<Record<string, Promise<void>>>({})
  const inflightDetails = useRef<Record<string, Promise<void>>>({})

  const fetchBalancesForAthlete = useCallback(async (athleteId: string) => {
    try {
      const res = await fetch(`/api/concession-credits?athleteId=${athleteId}`)
      const result = await res.json()
      if (result.data) {
        const camps: CampBalance[] = result.data.map((c: { camp_id: string; balance_cents: number; camp?: { name: string } }) => ({
          campId: c.camp_id,
          campName: c.camp?.name || 'Camp',
          balanceCents: c.balance_cents,
        }))
        const total = camps.reduce((sum, c) => sum + c.balanceCents, 0)
        setBalances(prev => ({ ...prev, [athleteId]: { total, camps } }))
      }
    } catch {
      // Non-critical
    }
  }, [])

  const fetchBalances = useCallback(async (athleteIds: string[], force = false) => {
    const toFetch = athleteIds.filter(id => {
      if (id in inflightBalances.current) return false
      return force || !(id in balances)
    })
    if (toFetch.length === 0) return

    const promises = toFetch.map(id => {
      const p = fetchBalancesForAthlete(id).finally(() => {
        delete inflightBalances.current[id]
      })
      inflightBalances.current[id] = p
      return p
    })
    await Promise.all(promises)
  }, [balances, fetchBalancesForAthlete])

  const fetchDetail = useCallback(async (athleteId: string, campId: string, force = false) => {
    const key = `${athleteId}:${campId}`
    if (key in inflightDetails.current) return
    if (!force && key in details) return

    const p = (async () => {
      try {
        const res = await fetch(`/api/concession-credits?athleteId=${athleteId}&campId=${campId}`)
        const result = await res.json()
        if (result.data) {
          const txns: Transaction[] = (result.data.transactions || []).map((t: any) => ({
            id: t.id,
            type: t.type,
            amount_cents: t.amount_cents,
            balance_after_cents: t.balance_after_cents,
            description: t.description,
            performer_name: t.performer_name || null,
            created_at: t.created_at,
          }))
          setDetails(prev => ({
            ...prev,
            [key]: { balanceCents: result.data.balance_cents ?? 0, transactions: txns },
          }))
        }
      } catch {
        // Non-critical
      }
    })()

    inflightDetails.current[key] = p
    await p.finally(() => { delete inflightDetails.current[key] })
  }, [details])

  const invalidateAthlete = useCallback(async (athleteId: string) => {
    // Re-fetch balances
    await fetchBalancesForAthlete(athleteId)
    // Re-fetch any loaded details for this athlete
    const detailKeys = Object.keys(details).filter(k => k.startsWith(`${athleteId}:`))
    await Promise.all(
      detailKeys.map(key => {
        const campId = key.split(':')[1]
        return fetchDetail(athleteId, campId, true)
      })
    )
  }, [details, fetchBalancesForAthlete, fetchDetail])

  const deductCredits = useCallback(async (params: { athleteId: string; campId: string; amountCents: number; description?: string }) => {
    try {
      const res = await fetch('/api/concession-credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: params.athleteId,
          campId: params.campId,
          amountCents: params.amountCents,
          description: params.description || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to process' }
      }
      await invalidateAthlete(params.athleteId)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Network error' }
    }
  }, [invalidateAthlete])

  const adjustCredits = useCallback(async (params: { athleteId: string; campId: string; amountCents: number; description?: string }) => {
    try {
      const res = await fetch('/api/concession-credits/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: params.athleteId,
          campId: params.campId,
          amountCents: params.amountCents,
          description: params.description || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to process' }
      }
      await invalidateAthlete(params.athleteId)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Network error' }
    }
  }, [invalidateAthlete])

  const getAthleteBalance = useCallback((athleteId: string) => {
    return balances[athleteId]?.total ?? 0
  }, [balances])

  const getAthleteCamps = useCallback((athleteId: string) => {
    return balances[athleteId]?.camps ?? []
  }, [balances])

  const getCreditDetail = useCallback((athleteId: string, campId: string) => {
    return details[`${athleteId}:${campId}`] ?? null
  }, [details])

  return (
    <ConcessionCreditContext.Provider value={{
      getAthleteBalance,
      getAthleteCamps,
      getCreditDetail,
      fetchBalances,
      fetchDetail,
      deductCredits,
      adjustCredits,
      invalidateAthlete,
    }}>
      {children}
    </ConcessionCreditContext.Provider>
  )
}

export function useConcessionCredits() {
  const ctx = useContext(ConcessionCreditContext)
  if (!ctx) throw new Error('useConcessionCredits must be used within ConcessionCreditProvider')
  return ctx
}
