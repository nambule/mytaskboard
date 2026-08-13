import { useState, useEffect, useCallback } from 'react'
import { taskService } from '../services/taskService'
import { supabase } from '../services/supabase'
import { transformTaskFromDB, reorganizeTaskOrder, createEmptyOrder } from '../utils/helpers'
import { DEFAULT_COMPARTMENTS, PRIORITIES, STATUSES } from '../utils/constants'

/**
 * Hook personnalisé pour gérer les tâches avec Supabase
 */
export const useTasks = () => {
  const [tasks, setTasks] = useState({})
  const [order, setOrder] = useState(createEmptyOrder(DEFAULT_COMPARTMENTS, PRIORITIES, STATUSES))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Charger toutes les tâches depuis Supabase
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 Tentative de connexion à Supabase...')
      const dbTasks = await taskService.getAllTasks()
      console.log('✅ Connexion réussie, tâches chargées:', dbTasks.length)
      console.log('📋 Raw tasks from DB:', dbTasks)
      
      const tasksMap = {}
      
      dbTasks.forEach(dbTask => {
        console.log('📝 Processing task:', dbTask.title, 'Compartment data:', dbTask.compartments)
        const task = transformTaskFromDB(dbTask)
        console.log('🔄 Transformed task:', task)
        if (task) {
          tasksMap[task.id] = task
        }
      })
      
      setTasks(tasksMap)
      
      // Get compartments for the current user and build order structure
      // Load actual user compartments from database instead of using defaults
      let userCompartmentNames = []
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')
        
        const { data: userCompartments, error } = await supabase
          .from('compartments')
          .select('*')
          .eq('user_id', user.id)
          .is('archived_at', null)
          .order('position', { ascending: true })
        if (error) throw error
        userCompartmentNames = userCompartments?.map(c => c.name) || []
        console.log('📦 User compartments from DB:', userCompartmentNames)
      } catch (err) {
        console.warn('Could not load user compartments, falling back to task-based discovery:', err)
        userCompartmentNames = [...DEFAULT_COMPARTMENTS]
      }
      
      const compartmentNames = new Set([...userCompartmentNames])
      
      // Add any compartment names found in tasks (for safety)
      Object.values(tasksMap).forEach(task => {
        if (task.compartment) compartmentNames.add(task.compartment)
      })
      
      console.log('📋 Final compartment names for order:', Array.from(compartmentNames))
      const order = createEmptyOrder(
        Array.from(compartmentNames),
        PRIORITIES,
        STATUSES
      )
      
      // Populate the order with tasks
      // During migration, tasks might have either compartment names or IDs
      console.log('📦 Order compartments available:', Object.keys(order.compartment))
      Object.values(tasksMap).forEach(task => {
        console.log(`🔍 Assigning task "${task.title}" with compartment "${task.compartment}" to order`)
        // Handle compartments - use compartment name if available, otherwise skip for now
        if (task.compartment && order.compartment[task.compartment]) {
          console.log(`✅ Task "${task.title}" assigned to compartment "${task.compartment}"`)
          order.compartment[task.compartment].push(task.id)
        } else {
          console.log(`❌ Task "${task.title}" compartment "${task.compartment}" not found in order compartments`)
        }
        if (task.priority && order.priority[task.priority]) {
          order.priority[task.priority].push(task.id)
        }
        if (task.status && order.status[task.status]) {
          order.status[task.status].push(task.id)
        }
      })
      
      console.log('📊 Final order structure:', order)
      
      setOrder(order)
    } catch (err) {
      console.error('❌ Erreur lors du chargement des tâches:', err)
      setError(`Erreur de connexion: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  // Charger les tâches au montage, mais seulement si authentifié
  useEffect(() => {
    const checkAuthAndLoadTasks = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          loadTasks()
        } else {
          // User not authenticated yet, wait for auth state change
          setLoading(false)
        }
      } catch (err) {
        console.log('🔄 Auth check failed, will retry when auth state changes:', err.message)
        setLoading(false)
      }
    }
    
    checkAuthAndLoadTasks()
  }, [loadTasks])

  // Listen for auth state changes to load tasks when user becomes authenticated
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('📋 useTasks auth event:', event)
      
      // Ignore token refresh events to prevent unnecessary reloads when switching tabs
      if (event === 'TOKEN_REFRESHED') {
        console.log('📋 Ignoring TOKEN_REFRESHED in useTasks')
        return
      }
      
      // Only reload tasks for genuine sign in events, not tab switches
      if (event === 'SIGNED_IN' && session?.user) {
        // Check if this might be a tab switch (user was already signed in)
        const currentUser = Object.keys(tasks).length > 0 // If we have data, user was likely already signed in
        if (!currentUser) {
          console.log('🔄 New user sign in, loading tasks...')
          loadTasks()
        } else {
          console.log('📋 Skipping tasks reload - likely tab switch')
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('🔄 User signed out, clearing tasks...')
        setTasks({})
        setOrder(createEmptyOrder(DEFAULT_COMPARTMENTS, PRIORITIES, STATUSES))
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadTasks, tasks])

  // Listen for user data seeding events to refresh tasks
  useEffect(() => {
    const handleUserDataSeeded = () => {
      console.log('🔄 User data seeded event received, refreshing tasks...')
      loadTasks()
    }

    window.addEventListener('userDataSeeded', handleUserDataSeeded)
    
    return () => {
      window.removeEventListener('userDataSeeded', handleUserDataSeeded)
    }
  }, [loadTasks])

  // Écouter les changements de compartiments
  useEffect(() => {
    const handleCompartmentUpdate = (event) => {
      console.log('🔄 useTasks received compartmentsUpdated event')
      console.log('📦 Event detail:', event.detail.compartments.map(c => c.name || c))
      const compartmentNames = event.detail.compartments.map(c => c.name || c)
      
      setOrder(prev => {
        // Include all compartments from database + any compartments found in existing tasks
        const allCompartments = new Set([...compartmentNames])
        Object.values(tasks).forEach(task => {
          if (task.compartment) allCompartments.add(task.compartment)
        })
        
        const newOrder = createEmptyOrder(Array.from(allCompartments), PRIORITIES, STATUSES)
        
        // Populate with existing tasks
        Object.values(tasks).forEach(task => {
          if (task.compartment && newOrder.compartment[task.compartment]) {
            newOrder.compartment[task.compartment].push(task.id)
          }
          if (task.priority && newOrder.priority[task.priority]) {
            newOrder.priority[task.priority].push(task.id)
          }
          if (task.status && newOrder.status[task.status]) {
            newOrder.status[task.status].push(task.id)
          }
        })
        
        return newOrder
      })
    }

    window.addEventListener('compartmentsUpdated', handleCompartmentUpdate)
    return () => window.removeEventListener('compartmentsUpdated', handleCompartmentUpdate)
  }, [tasks])

  // Créer une nouvelle tâche
  const createTask = useCallback(async (taskData) => {
    try {
      setError(null)
      const dbTask = await taskService.createTask(taskData)
      const newTask = transformTaskFromDB(dbTask)
      
      if (newTask) {
        // Vérifier si la tâche n'existe pas déjà pour éviter les doublons
        setTasks(prev => {
          if (prev[newTask.id]) {
            console.log('Tâche déjà présente, éviter la duplication:', newTask.id)
            return prev
          }
          return { ...prev, [newTask.id]: newTask }
        })
        
        // Mettre à jour l'ordre
        setOrder(prev => {
          const newOrder = { ...prev }
          
          // Vérifier si l'ID n'est pas déjà dans les listes pour éviter les doublons
          const taskAlreadyInCompartment = newTask.compartment && 
            newOrder.compartment[newTask.compartment] && 
            newOrder.compartment[newTask.compartment].includes(newTask.id)
            
          const taskAlreadyInPriority = newTask.priority && 
            newOrder.priority[newTask.priority] && 
            newOrder.priority[newTask.priority].includes(newTask.id)
            
          const taskAlreadyInStatus = newTask.status && 
            newOrder.status[newTask.status] && 
            newOrder.status[newTask.status].includes(newTask.id)
          
          // Ajouter seulement si pas déjà présent et créer les compartiments manquants
          if (newTask.compartment && !taskAlreadyInCompartment) {
            if (!newOrder.compartment[newTask.compartment]) {
              newOrder.compartment[newTask.compartment] = []
            }
            newOrder.compartment[newTask.compartment].push(newTask.id)
          }
          if (newTask.priority && newOrder.priority[newTask.priority] && !taskAlreadyInPriority) {
            newOrder.priority[newTask.priority].push(newTask.id)
          }
          if (newTask.status && newOrder.status[newTask.status] && !taskAlreadyInStatus) {
            newOrder.status[newTask.status].push(newTask.id)
          }
          
          return newOrder
        })
      }
      
      return newTask
    } catch (err) {
      console.error('Erreur lors de la création de la tâche:', err)
      setError(err.message)
      throw err
    }
  }, [])

  // Mettre à jour une tâche
  const updateTask = useCallback(async (taskId, updates) => {
    try {
      setError(null)
      const dbTask = await taskService.updateTask(taskId, updates)
      const updatedTask = transformTaskFromDB(dbTask)
      
      if (updatedTask) {
        setTasks(prev => ({ ...prev, [taskId]: updatedTask }))
        
        // Si les propriétés de groupement ont changé, réorganiser l'ordre
        if ('priority' in updates || 'compartment' in updates || 'status' in updates) {
          setOrder(prev => {
            const newOrder = JSON.parse(JSON.stringify(prev))
            
            // Sauvegarder les positions actuelles avant de retirer
            const positions = {}
            Object.keys(newOrder).forEach(groupType => {
              Object.keys(newOrder[groupType]).forEach(column => {
                const index = newOrder[groupType][column].indexOf(taskId)
                if (index !== -1) {
                  positions[groupType] = { column, index }
                }
              })
            })
            
            // Retirer de toutes les colonnes
            Object.values(newOrder).forEach(group => {
              Object.keys(group).forEach(column => {
                group[column] = group[column].filter(id => id !== taskId)
              })
            })
            
            // Réajouter dans les bonnes colonnes à la même position si possible
            if (updatedTask.compartment) {
              if (!newOrder.compartment[updatedTask.compartment]) {
                newOrder.compartment[updatedTask.compartment] = []
              }
              const pos = positions.compartment
              if (pos && pos.column === updatedTask.compartment) {
                // Même colonne, remettre à la même position
                newOrder.compartment[updatedTask.compartment].splice(pos.index, 0, taskId)
              } else {
                // Nouvelle colonne, ajouter à la fin
                newOrder.compartment[updatedTask.compartment].push(taskId)
              }
            }
            
            if (updatedTask.priority && newOrder.priority[updatedTask.priority]) {
              const pos = positions.priority
              if (pos && pos.column === updatedTask.priority) {
                newOrder.priority[updatedTask.priority].splice(pos.index, 0, taskId)
              } else {
                newOrder.priority[updatedTask.priority].push(taskId)
              }
            }
            
            if (updatedTask.status && newOrder.status[updatedTask.status]) {
              const pos = positions.status
              if (pos && pos.column === updatedTask.status) {
                newOrder.status[updatedTask.status].splice(pos.index, 0, taskId)
              } else {
                newOrder.status[updatedTask.status].push(taskId)
              }
            }
            
            return newOrder
          })
        }
      }
      
      return updatedTask
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la tâche:', err)
      setError(err.message)
      throw err
    }
  }, [])

  // Supprimer une tâche
  const deleteTask = useCallback(async (taskId) => {
    try {
      setError(null)
      await taskService.deleteTask(taskId)
      
      setTasks(prev => {
        const newTasks = { ...prev }
        delete newTasks[taskId]
        return newTasks
      })
      
      setOrder(prev => {
        const newOrder = JSON.parse(JSON.stringify(prev))
        
        // Retirer de toutes les colonnes
        Object.values(newOrder).forEach(group => {
          Object.keys(group).forEach(column => {
            group[column] = group[column].filter(id => id !== taskId)
          })
        })
        
        return newOrder
      })
    } catch (err) {
      console.error('Erreur lors de la suppression de la tâche:', err)
      setError(err.message)
      throw err
    }
  }, [])

  // Réorganiser les tâches par drag & drop
  const reorderTasks = useCallback((source, destination, draggableId, groupBy, compartments) => {
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    setOrder(prev => {
      const newOrder = JSON.parse(JSON.stringify(prev))
      const fromList = Array.from(newOrder[groupBy][source.droppableId] || [])
      const toList = source.droppableId === destination.droppableId
        ? fromList
        : Array.from(newOrder[groupBy][destination.droppableId] || [])
      
      fromList.splice(source.index, 1)
      toList.splice(destination.index, 0, draggableId)
      
      newOrder[groupBy][source.droppableId] = fromList
      newOrder[groupBy][destination.droppableId] = toList
      
      return newOrder
    })

    // Si changement de colonne, mettre à jour la tâche
    if (source.droppableId !== destination.droppableId) {
      const updates = {}
      if (groupBy === 'compartment') {
        // Map compartment name to ID
        const compartment = compartments.find(c => c.name === destination.droppableId)
        if (compartment) {
          updates.compartmentId = compartment.id
        }
      } else if (groupBy === 'priority') {
        updates.priority = destination.droppableId
      } else {
        updates.status = destination.droppableId
      }
      
      updateTask(draggableId, updates).catch(err => {
        console.error('Erreur lors de la mise à jour après drag & drop:', err)
        // En cas d'erreur, recharger les données
        loadTasks()
      })
    }
  }, [updateTask, loadTasks])

  return {
    tasks,
    order,
    loading,
    error,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks
  }
}
