import { useState, useEffect, useCallback } from 'react'
import { compartmentService } from '../services/compartmentService'
import { supabase } from '../services/supabase'

const getActiveCompartments = (compartments) => compartments.filter((compartment) => !compartment.archived_at)

/**
 * Hook pour gérer les compartiments utilisateur
 */
export const useCompartments = () => {
  const [compartments, setCompartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Charger les compartiments de l'utilisateur
  const loadCompartments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 Loading user compartments...')
      const data = await compartmentService.getUserCompartments()
      
      if (data.length === 0) {
        // Aucun compartiment trouvé, essayer de migrer ou initialiser
        console.log('📦 No compartments found, initializing...')
        const initialized = await compartmentService.migrateFromLocalStorage()
        setCompartments(initialized || [])
      } else {
        setCompartments(data)
      }
      
      console.log('✅ Compartments loaded:', data.length)
    } catch (err) {
      console.error('❌ Error loading compartments:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Charger les compartiments au montage, mais seulement si authentifié
  useEffect(() => {
    const checkAuthAndLoadCompartments = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          loadCompartments()
        } else {
          // User not authenticated yet, wait for auth state change
          setLoading(false)
        }
      } catch (err) {
        console.log('🔄 Auth check failed, will retry when auth state changes:', err.message)
        setLoading(false)
      }
    }
    
    checkAuthAndLoadCompartments()
  }, [loadCompartments])

  // Listen for auth state changes to load compartments when user becomes authenticated
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('📦 useCompartments auth event:', event)
      
      // Ignore token refresh and tab switching events to prevent unnecessary reloads
      if (event === 'TOKEN_REFRESHED') {
        console.log('📦 Ignoring TOKEN_REFRESHED in useCompartments')
        return
      }
      
      // Only reload compartments for genuine sign in events, not tab switches
      if (event === 'SIGNED_IN' && session?.user) {
        // Check if this might be a tab switch (user was already signed in)
        const currentUser = compartments.length > 0 // If we have data, user was likely already signed in
        if (!currentUser) {
          console.log('🔄 New user sign in, loading compartments...')
          loadCompartments()
        } else {
          console.log('📦 Skipping compartments reload - likely tab switch')
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('🔄 User signed out, clearing compartments...')
        setCompartments([])
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadCompartments, compartments.length])

  // Listen for user data seeding events to refresh compartments
  useEffect(() => {
    const handleUserDataSeeded = () => {
      console.log('🔄 User data seeded event received, refreshing compartments...')
      loadCompartments()
    }

    window.addEventListener('userDataSeeded', handleUserDataSeeded)
    
    return () => {
      window.removeEventListener('userDataSeeded', handleUserDataSeeded)
    }
  }, [loadCompartments])

  // Créer un nouveau compartiment
  const createCompartment = useCallback(async (name) => {
    try {
      setError(null)
      console.log('🔄 Creating compartment:', name)
      
      const newCompartment = await compartmentService.createCompartment(name)
      const updatedCompartments = [...compartments, newCompartment].sort((a, b) => a.position - b.position)
      setCompartments(updatedCompartments)
      
      // Émettre un événement pour notifier les autres composants
      console.log('🔔 Emitting compartmentsUpdated event with:', updatedCompartments.map(c => c.name))
      window.dispatchEvent(new CustomEvent('compartmentsUpdated', { 
        detail: { compartments: getActiveCompartments(updatedCompartments) }
      }))
      
      console.log('✅ Compartment created:', newCompartment.name)
      return newCompartment
    } catch (err) {
      console.error('❌ Error creating compartment:', err)
      setError(err.message)
      throw err
    }
  }, [compartments])

  // Mettre à jour un compartiment
  const updateCompartment = useCallback(async (id, updates) => {
    try {
      setError(null)
      console.log('🔄 Updating compartment:', id, updates)
      
      const updatedCompartment = await compartmentService.updateCompartment(id, updates)
      setCompartments(prev => prev.map(comp => 
        comp.id === id ? updatedCompartment : comp
      ).sort((a, b) => a.position - b.position))
      
      // Émettre un événement pour notifier les autres composants
      const updatedCompartments = compartments.map(comp => 
        comp.id === id ? updatedCompartment : comp
      ).sort((a, b) => a.position - b.position)
      console.log('🔔 Emitting compartmentsUpdated event (update) with:', updatedCompartments.map(c => c.name))
      window.dispatchEvent(new CustomEvent('compartmentsUpdated', { 
        detail: { compartments: getActiveCompartments(updatedCompartments) }
      }))
      
      console.log('✅ Compartment updated:', updatedCompartment.name)
      return updatedCompartment
    } catch (err) {
      console.error('❌ Error updating compartment:', err)
      setError(err.message)
      throw err
    }
  }, [compartments])

  // Réorganiser les compartiments
  const archiveCompartment = useCallback(async (id) => {
    try {
      setError(null)
      const result = await compartmentService.archiveCompartment(id)
      const updatedCompartments = compartments.map((compartment) => (
        compartment.id === id ? result.compartment : compartment
      ))
      setCompartments(updatedCompartments)
      window.dispatchEvent(new CustomEvent('compartmentsUpdated', {
        detail: { compartments: getActiveCompartments(updatedCompartments) },
      }))
      return result
    } catch (err) {
      console.error('Error archiving compartment:', err)
      setError(err.message)
      throw err
    }
  }, [compartments])

  const restoreCompartment = useCallback(async (id) => {
    try {
      setError(null)
      const restoredCompartment = await compartmentService.restoreCompartment(id)
      const updatedCompartments = compartments.map((compartment) => (
        compartment.id === id ? restoredCompartment : compartment
      )).sort((a, b) => a.position - b.position)
      setCompartments(updatedCompartments)
      window.dispatchEvent(new CustomEvent('compartmentsUpdated', {
        detail: { compartments: getActiveCompartments(updatedCompartments) },
      }))
      return restoredCompartment
    } catch (err) {
      console.error('Error restoring compartment:', err)
      setError(err.message)
      throw err
    }
  }, [compartments])

  const reorderCompartments = useCallback(async (reorderedCompartments) => {
    try {
      setError(null)
      console.log('🔄 Reordering compartments...')
      
      // Mettre à jour l'état local immédiatement pour une meilleure UX
      setCompartments([
        ...reorderedCompartments,
        ...compartments.filter((compartment) => compartment.archived_at),
      ])
      
      // Envoyer les IDs dans le bon ordre au service
      const compartmentIds = reorderedCompartments.map(comp => comp.id)
      await compartmentService.reorderCompartments(compartmentIds)
      
      // Émettre un événement pour notifier les autres composants
      console.log('🔔 Emitting compartmentsUpdated event (reorder) with:', reorderedCompartments.map(c => c.name))
      window.dispatchEvent(new CustomEvent('compartmentsUpdated', { 
        detail: { compartments: reorderedCompartments } 
      }))
      
      console.log('✅ Compartments reordered')
      return true
    } catch (err) {
      console.error('❌ Error reordering compartments:', err)
      setError(err.message)
      // En cas d'erreur, recharger depuis la base de données
      loadCompartments()
      throw err
    }
  }, [loadCompartments, compartments])

  // Obtenir les noms des compartiments pour compatibilité avec l'ancien système
  const getCompartmentNames = useCallback(() => {
    return getActiveCompartments(compartments).map(comp => comp.name)
  }, [compartments])

  const activeCompartments = getActiveCompartments(compartments)
  const archivedCompartments = compartments.filter((compartment) => compartment.archived_at)

  return {
    compartments: activeCompartments,
    archivedCompartments,
    allCompartments: compartments,
    compartmentNames: getCompartmentNames(),
    loading,
    error,
    loadCompartments,
    createCompartment,
    updateCompartment,
    archiveCompartment,
    restoreCompartment,
    reorderCompartments
  }
}
