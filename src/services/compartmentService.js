import { supabase } from './supabase'
import { selectCompartmentColor } from '../utils/helpers'

/**
 * Service pour gérer les compartiments utilisateur
 */
export const compartmentService = {
  /**
   * Récupérer tous les compartiments de l'utilisateur connecté
   */
  async getUserCompartments() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('compartments')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Créer un nouveau compartiment
   */
  async createCompartment(name, position = null) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Récupérer tous les compartiments existants pour éviter les couleurs dupliquées
    const existingCompartments = await this.getUserCompartments()

    // Si aucune position spécifiée, mettre à la fin
    if (position === null) {
      const { data: existing } = await supabase
        .from('compartments')
        .select('position')
        .eq('user_id', user.id)
        .order('position', { ascending: false })
        .limit(1)
      
      position = existing && existing.length > 0 ? existing[0].position + 1 : 0
    }

    // Sélectionner intelligemment une couleur unique
    const selectedColor = selectCompartmentColor(existingCompartments)

    const { data, error } = await supabase
      .from('compartments')
      .insert({
        name: name.trim(),
        user_id: user.id,
        position,
        color_bg: selectedColor.bg,
        color_text: selectedColor.text,
        color_border: selectedColor.border
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Mettre à jour un compartiment
   */
  async updateCompartment(id, updates) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('compartments')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async archiveCompartment(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: completedTasks, error } = await supabase
      .rpc('archive_compartment', { p_compartment_id: id })

    if (error) throw error

    const { data: compartment, error: compartmentError } = await supabase
      .from('compartments')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (compartmentError) throw compartmentError
    return { compartment, completedTasks: completedTasks || 0 }
  },

  async restoreCompartment(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .rpc('restore_compartment', { p_compartment_id: id })

    if (error) throw error

    const { data, error: compartmentError } = await supabase
      .from('compartments')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (compartmentError) throw compartmentError
    return data
  },

  /**
   * Réorganiser les positions des compartiments
   */
  async reorderCompartments(compartmentIds) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Strategy: First assign temporary negative positions to avoid conflicts,
    // then assign the final positions
    
    try {
      // Step 1: Assign temporary negative positions to avoid unique constraint conflicts
      const tempUpdates = compartmentIds.map((id, index) =>
        supabase
          .from('compartments')
          .update({ position: -(index + 1) })
          .eq('id', id)
          .eq('user_id', user.id)
      )
      
      await Promise.all(tempUpdates)
      
      // Step 2: Assign final positive positions
      const finalUpdates = compartmentIds.map((id, index) =>
        supabase
          .from('compartments')
          .update({ position: index })
          .eq('id', id)
          .eq('user_id', user.id)
      )
      
      const results = await Promise.all(finalUpdates)
      
      // Check if any final updates failed
      const errors = results.filter(result => result.error)
      if (errors.length > 0) {
        throw new Error(`Failed to update compartment positions: ${errors[0].error.message}`)
      }

      return true
    } catch (error) {
      // If something went wrong, try to restore consistent state by reassigning positions
      console.error('Error during reordering, attempting to restore positions:', error)
      
      // Attempt to fix positions by reassigning them sequentially
      try {
        for (let i = 0; i < compartmentIds.length; i++) {
          await supabase
            .from('compartments')
            .update({ position: i })
            .eq('id', compartmentIds[i])
            .eq('user_id', user.id)
        }
      } catch (recoveryError) {
        console.error('Failed to recover positions:', recoveryError)
      }
      
      throw error
    }
  },

  /**
   * Initialiser les compartiments par défaut pour un nouvel utilisateur
   */
  async initializeDefaultCompartments() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Vérifier si l'utilisateur a déjà des compartiments
    const { data: existing } = await supabase
      .from('compartments')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (existing && existing.length > 0) {
      return // L'utilisateur a déjà des compartiments
    }

    const defaultCompartments = [
      { name: 'PM', position: 0, color_bg: '#EEF2FF', color_text: '#3730A3', color_border: '#C7D2FE' },
      { name: 'CPO', position: 1, color_bg: '#ECFEFF', color_text: '#155E75', color_border: '#A5F3FC' },
      { name: 'FER', position: 2, color_bg: '#FEE2E2', color_text: '#991B1B', color_border: '#FECACA' },
      { name: 'NOVAE', position: 3, color_bg: '#FAE8FF', color_text: '#6B21A8', color_border: '#F5D0FE' },
      { name: 'MRH', position: 4, color_bg: '#DCFCE7', color_text: '#065F46', color_border: '#BBF7D0' },
      { name: 'CDA', position: 5, color_bg: '#FFE4E6', color_text: '#9F1239', color_border: '#FECDD3' }
    ].map(comp => ({ ...comp, user_id: user.id }))

    const { data, error } = await supabase
      .from('compartments')
      .insert(defaultCompartments)
      .select()

    if (error) throw error
    return data
  },

  /**
   * Migrer les compartiments depuis localStorage vers la base de données
   */
  async migrateFromLocalStorage() {
    try {
      const saved = localStorage.getItem('kanban-compartments')
      if (!saved) {
        // Pas de compartiments en localStorage, initialiser les défauts
        return await this.initializeDefaultCompartments()
      }

      const localCompartments = JSON.parse(saved)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Vérifier si l'utilisateur a déjà des compartiments en base
      const { data: existing } = await supabase
        .from('compartments')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (existing && existing.length > 0) {
        return // Déjà migré
      }

      // Créer les compartiments depuis localStorage
      const compartmentsToCreate = localCompartments.map((name, index) => ({
        name,
        position: index,
        user_id: user.id,
        // Utiliser les couleurs par défaut si disponibles
        color_bg: '#F1F5F9',
        color_text: '#334155', 
        color_border: '#CBD5E1'
      }))

      const { data, error } = await supabase
        .from('compartments')
        .insert(compartmentsToCreate)
        .select()

      if (error) throw error

      // Nettoyer localStorage après migration réussie
      localStorage.removeItem('kanban-compartments')
      console.log('✅ Compartments migrated from localStorage to database')

      return data
    } catch (err) {
      console.error('❌ Error migrating compartments from localStorage:', err)
      // En cas d'erreur, initialiser les compartiments par défaut
      return await this.initializeDefaultCompartments()
    }
  }
}
