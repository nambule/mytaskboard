import { WHEN_COLORS, STATUS_COLORS, SIZE_COLORS, COMPARTMENT_COLORS, STATUS_MAPPING, WHEN_MAPPING, DEFAULT_COMPARTMENTS, STATUSES, PRIORITIES } from './constants'

// Fonctions utilitaires pour l'application My Task Board

export const uid = () => Math.random().toString(36).slice(2, 10)

export const todayISO = () => new Date().toISOString().slice(0, 10)

export const formatDateFR = (iso) => 
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })

export const isPast = (iso) => 
  iso && new Date(iso).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)

export const addDaysISO = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// Fonctions de style
export const styleWhen = (value) => ({
  backgroundColor: WHEN_COLORS[value]?.bg || "#F8FAFC",
  color: WHEN_COLORS[value]?.text || "#64748B"
})

export const badgeStyle = (colorConfig) => ({
  backgroundColor: colorConfig.bg,
  color: colorConfig.text,
  borderColor: colorConfig.border
})

export const compStyle = (colorConfig) => ({
  backgroundColor: colorConfig.bg,
  color: colorConfig.text,
  borderColor: colorConfig.border
})

// Conversion des données Supabase vers le format frontend avec normalisation
export const transformTaskFromDB = (dbTask) => {
  if (!dbTask) return null
  
  return {
    id: dbTask.id,
    title: dbTask.title,
    priority: dbTask.priority,
    compartmentId: dbTask.compartment_id || dbTask.compartments?.id,
    compartment: dbTask.compartments?.name || dbTask.compartment, // Use joined compartment name or fallback
    status: STATUS_MAPPING[dbTask.status] || dbTask.status, // Normaliser le statut
    size: dbTask.size,
    note: dbTask.note,
    when: dbTask.planning_excluded ? '' : (WHEN_MAPPING[dbTask.when] || dbTask.when), // Un pense-bête n'a pas de prochaine action
    dueDate: dbTask.due_date,
    startDate: dbTask.start_date,
    planningStartDate: dbTask.planning_start_date,
    planningEndDate: dbTask.planning_end_date,
    planningExcluded: dbTask.planning_excluded || false,
    hours: dbTask.hours,
    timeAllocation: dbTask.time_allocation,
    flagged: dbTask.flagged,
    subtasks: dbTask.subtasks || [],
    completion: dbTask.completion || 0,
    createdAt: dbTask.created_at,
    updatedAt: dbTask.updated_at
  }
}

// Conversion des données frontend vers le format Supabase
export const transformTaskToDB = (task) => {
  return {
    title: task.title,
    priority: task.priority,
    compartment: task.compartment,
    status: task.status,
    size: task.size,
    note: task.note || '',
    when: task.planningExcluded ? '' : (task.when || ''),
    due_date: task.dueDate || null,
    start_date: task.startDate || null,
    planning_start_date: task.planningExcluded ? null : (task.planningStartDate || null),
    planning_end_date: task.planningExcluded ? null : (task.planningEndDate || null),
    planning_excluded: task.planningExcluded || false,
    hours: task.hours ? parseFloat(task.hours) : null,
    time_allocation: task.timeAllocation || 'one shot',
    flagged: task.flagged || false,
    subtasks: task.subtasks || [],
    completion: task.completion || 0
  }
}

// Gestion de l'ordre des colonnes
export const createEmptyOrder = (compartments, priorities, statuses) => {
  return {
    compartment: Object.fromEntries(compartments.map((c) => [c, []])),
    priority: Object.fromEntries(priorities.map((p) => [p, []])),
    status: Object.fromEntries(statuses.map((s) => [s, []]))
  }
}

// Réorganise l'ordre des tâches selon leur groupement
export const reorganizeTaskOrder = (tasks, groupBy) => {
  const order = createEmptyOrder(
    DEFAULT_COMPARTMENTS,
    PRIORITIES,
    STATUSES
  )

  Object.values(tasks).forEach(task => {
    if (task.compartment && order.compartment[task.compartment]) {
      order.compartment[task.compartment].push(task.id)
    }
    if (task.priority && order.priority[task.priority]) {
      order.priority[task.priority].push(task.id)
    }
    if (task.status && order.status[task.status]) {
      order.status[task.status].push(task.id)
    }
  })

  return order
}

// Palette de couleurs disponibles pour les nouveaux compartiments
const AVAILABLE_COMPARTMENT_COLORS = [
  // Indigo variations
  { bg: "#EEF2FF", text: "#3730A3", border: "#C7D2FE", name: "indigo-soft" },
  { bg: "#E0E7FF", text: "#3730A3", border: "#A5B4FC", name: "indigo-medium" },
  
  // Cyan/Teal variations  
  { bg: "#ECFEFF", text: "#155E75", border: "#A5F3FC", name: "cyan-soft" },
  { bg: "#CCFBF1", text: "#134E4A", border: "#99F6E4", name: "teal-soft" },
  
  // Red/Pink variations
  { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA", name: "red-soft" },
  { bg: "#FFE4E6", text: "#9F1239", border: "#FECDD3", name: "rose-soft" },
  
  // Purple variations
  { bg: "#FAE8FF", text: "#6B21A8", border: "#F5D0FE", name: "purple-soft" },
  { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE", name: "violet-soft" },
  
  // Green variations
  { bg: "#DCFCE7", text: "#065F46", border: "#BBF7D0", name: "emerald-soft" },
  { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0", name: "green-soft" },
  
  // Blue variations
  { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE", name: "blue-soft" },
  { bg: "#E0F2FE", text: "#075985", border: "#BAE6FD", name: "sky-soft" },
  
  // Yellow/Orange variations
  { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A", name: "amber-soft" },
  { bg: "#FFEDD5", text: "#C2410C", border: "#FED7AA", name: "orange-soft" },
  
  // Slate variations
  { bg: "#F1F5F9", text: "#334155", border: "#CBD5E1", name: "slate-soft" },
  { bg: "#F8FAFC", text: "#475569", border: "#E2E8F0", name: "slate-light" },
]

/**
 * Sélectionne intelligemment une couleur pour un nouveau compartiment
 * en évitant les couleurs déjà utilisées par les compartiments existants
 */
export const selectCompartmentColor = (existingCompartments = []) => {
  // Récupérer les couleurs actuellement utilisées
  const usedColors = new Set()
  
  // Couleurs des compartiments hardcodées
  Object.values(COMPARTMENT_COLORS).forEach(color => {
    usedColors.add(`${color.bg}-${color.text}-${color.border}`)
  })
  
  // Couleurs des compartiments en base de données
  existingCompartments.forEach(compartment => {
    if (compartment.color_bg && compartment.color_text && compartment.color_border) {
      usedColors.add(`${compartment.color_bg}-${compartment.color_text}-${compartment.color_border}`)
    }
  })
  
  console.log('🎨 Used colors:', Array.from(usedColors))
  
  // Trouver la première couleur disponible
  for (const color of AVAILABLE_COMPARTMENT_COLORS) {
    const colorKey = `${color.bg}-${color.text}-${color.border}`
    if (!usedColors.has(colorKey)) {
      console.log('🎨 Selected color for new compartment:', color.name)
      return {
        bg: color.bg,
        text: color.text,
        border: color.border
      }
    }
  }
  
  // Si toutes les couleurs sont prises, utiliser une variation aléatoire
  const randomColor = AVAILABLE_COMPARTMENT_COLORS[
    Math.floor(Math.random() * AVAILABLE_COMPARTMENT_COLORS.length)
  ]
  
  console.log('🎨 All colors used, using random:', randomColor.name)
  return {
    bg: randomColor.bg,
    text: randomColor.text,
    border: randomColor.border
  }
}
