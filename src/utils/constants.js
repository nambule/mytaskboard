// Configuration et constantes de l'application My Task Board

// Mapping pour la compatibilité avec les données existantes en français
export const STATUS_MAPPING = {
  "À faire": "To Do",
  "À analyser": "To Analyze", 
  "En cours": "In Progress",
  "Terminé": "Done",
  // Mapping inverse pour la traduction
  "To Do": "To Do",
  "To Analyze": "To Analyze",
  "In Progress": "In Progress", 
  "Done": "Done"
}

export const WHEN_MAPPING = {
  "Aujourd'hui": "Today",
  "Cette semaine": "This Week",
  "Semaine prochaine": "Next Week",
  "Ce mois-ci": "This Month",
  "": "",
  // Mapping inverse
  "Today": "Today",
  "This Week": "This Week", 
  "Next Week": "Next Week",
  "This Month": "This Month"
}

// Default compartments - can be overridden by user settings
export const DEFAULT_COMPARTMENTS = ["PM", "CPO", "FER", "NOVAE", "MRH", "CDA"]

// Function to get current compartments (from localStorage or default) - DEPRECATED
// Use useCompartments hook instead
export const getCompartments = () => {
  console.warn('getCompartments is deprecated. Use useCompartments hook instead.')
  try {
    const saved = localStorage.getItem('kanban-compartments')
    return saved ? JSON.parse(saved) : DEFAULT_COMPARTMENTS
  } catch (e) {
    return DEFAULT_COMPARTMENTS
  }
}

// Legacy export for backward compatibility - DEPRECATED
export const COMPARTMENTS = DEFAULT_COMPARTMENTS
export const PRIORITIES = ["P1", "P2", "P3", "P4", "P5"]
export const STATUSES = ["To Do", "To Analyze", "In Progress", "Done", "Cancelled"]
export const SIZES = ["S", "M", "L", "XL", "XXL"]
export const WHEN_OPTIONS = ["", "Today", "This Week", "Next Week", "This Month", "Next Month"]

export const STATUS_LABELS = {
  "To Do": "À faire",
  "To Analyze": "À analyser",
  "In Progress": "En cours",
  "Done": "Terminée",
  "Cancelled": "Annulée",
}

export const WHEN_LABELS = {
  "": "À planifier",
  "Today": "Aujourd’hui",
  "This Week": "Cette semaine",
  "Next Week": "Semaine prochaine",
  "This Month": "Ce mois-ci",
  "Next Month": "Mois prochain",
}

// Couleurs et styles pour l'interface
export const WHEN_COLORS = {
  "": { bg: "#F8FAFC", text: "#64748B" },               // slate-50 / 500 (very light)
  "Today": { bg: "#FEE2E2", text: "#B91C1C" },    // red-100 / 700
  "This Week": { bg: "#FFEDD5", text: "#C2410C" },  // orange-100 / 700
  "Next Week": { bg: "#FEF9C3", text: "#A16207" }, // amber-100 / 700 (warm yellow)
  "This Month": { bg: "#DBEAFE", text: "#1D4ED8" },     // blue-100 / 700
  "Next Month": { bg: "#EDE9FE", text: "#5B21B6" }, // violet-100 / 700
}

export const WHEN_ORDER = { 
  "Today": 1, 
  "This Week": 2, 
  "Next Week": 3, 
  "This Month": 4, 
  "Next Month": 5, 
  "": 6 
}

export const PRIORITY_STYLES = {
  P1: "bg-red-100 text-red-700 border-red-200",
  P2: "bg-orange-100 text-orange-700 border-orange-200",
  P3: "bg-yellow-100 text-yellow-700 border-yellow-200",
  P4: "bg-emerald-100 text-emerald-700 border-emerald-200",
  P5: "bg-blue-100 text-blue-700 border-blue-200",
}

export const PRIORITY_DOT = { 
  P1: "bg-red-500", 
  P2: "bg-orange-500", 
  P3: "bg-yellow-500", 
  P4: "bg-emerald-500", 
  P5: "bg-blue-500" 
}

export const PRIORITY_RANK = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 }

// Couleurs pour les statuts et les tailles
export const STATUS_COLORS = {
  "To Do":   { bg: "#F1F5F9", text: "#334155", border: "#CBD5E1" }, // slate-100/700/300
  "To Analyze":{ bg: "#E0F2FE", text: "#075985", border: "#BAE6FD" }, // sky-100/800/200
  "In Progress":  { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" }, // amber-100/800/200
  "Done":   { bg: "#DCFCE7", text: "#065F46", border: "#BBF7D0" }, // emerald-100/800/200
  "Cancelled": { bg: "#FEF2F2", text: "#7F1D1D", border: "#FECACA" }, // red-50/900/200
}

export const SIZE_COLORS = {
  S:   { bg: "#DCFCE7", text: "#065F46", border: "#BBF7D0" }, // emerald
  M:   { bg: "#E0F2FE", text: "#075985", border: "#BAE6FD" }, // sky
  L:   { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" }, // violet
  XL:  { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" }, // amber
  XXL: { bg: "#FFE4E6", text: "#9F1239", border: "#FECDD3" }, // rose
}

// Couleurs par compartiment (bandeau en tête de carte)
export const COMPARTMENT_COLORS = {
  PM:   { bg: "#EEF2FF", text: "#3730A3", border: "#C7D2FE" }, // indigo soft
  CPO:  { bg: "#ECFEFF", text: "#155E75", border: "#A5F3FC" }, // cyan soft
  FER:  { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" }, // red soft
  NOVAE:{ bg: "#FAE8FF", text: "#6B21A8", border: "#F5D0FE" }, // purple soft
  MRH:  { bg: "#DCFCE7", text: "#065F46", border: "#BBF7D0" }, // emerald soft
  CDA:  { bg: "#FFE4E6", text: "#9F1239", border: "#FECDD3" }, // rose soft
}
