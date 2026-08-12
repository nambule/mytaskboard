import { useCallback, useEffect, useState } from 'react'
import { planningPeriodService } from '../services/planningPeriodService'
import { supabase } from '../services/supabase'

export const usePlanningPeriods = () => {
  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadPeriods = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setPeriods(await planningPeriodService.getAll())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) loadPeriods()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) loadPeriods()
      if (event === 'SIGNED_OUT') {
        setPeriods([])
        setError(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [loadPeriods])

  const createPeriod = useCallback(async (period) => {
    try {
      setError(null)
      const created = await planningPeriodService.create(period)
      setPeriods((current) => [...current, created].sort((a, b) => a.startDate.localeCompare(b.startDate)))
      return created
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  const updatePeriod = useCallback(async (periodId, updates) => {
    try {
      setError(null)
      const updated = await planningPeriodService.update(periodId, updates)
      setPeriods((current) => current
        .map((period) => period.id === periodId ? updated : period)
        .sort((a, b) => a.startDate.localeCompare(b.startDate)))
      return updated
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  const deletePeriod = useCallback(async (periodId) => {
    try {
      setError(null)
      await planningPeriodService.remove(periodId)
      setPeriods((current) => current.filter((period) => period.id !== periodId))
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  return { periods, loading, error, createPeriod, updatePeriod, deletePeriod }
}
