import React, { useState, useMemo, useRef, useEffect } from 'react'
import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import { Plus, MessageCircle } from 'lucide-react'

import { useTasks } from './hooks/useTasks'
import { useQuickTasks } from './hooks/useQuickTasks'
import { useAuth } from './hooks/useAuth'
import { usePlanningPeriods } from './hooks/usePlanningPeriods'
import TaskCard from './components/TaskCard'
import TaskModal from './components/TaskModal'
import QuickTasksModal from './components/QuickTasksModal'
import AuthModal from './components/AuthModal'
import AccountMenu from './components/AccountMenu'
import LandingScreen from './components/LandingScreen'
import BoardToolbar from './components/BoardToolbar'
import StickyBoardScrollbar from './components/StickyBoardScrollbar'
import PlanningView from './components/PlanningView'

import {
  PRIORITIES,
  STATUSES,
  WHEN_OPTIONS,
  PRIORITY_STYLES,
  PRIORITY_DOT,
  STATUS_COLORS,
  COMPARTMENT_COLORS,
  WHEN_ORDER,
  PRIORITY_RANK,
  STATUS_LABELS,
  WHEN_LABELS,
} from './utils/constants'
import { useCompartments } from './hooks/useCompartments'
import { badgeStyle, compStyle, styleWhen } from './utils/helpers'
import { userPreferenceService } from './services/userPreferenceService'

const SESSION_PREFERENCES_KEY = 'kanban-session-preferences'
const DEFAULT_PRIORITY_FILTER = {
  P1: true,
  P2: true,
  P3: true,
  P4: true,
  P5: true,
}
const DEFAULT_STATUS_FILTER = {
  'To Do': true,
  'To Analyze': true,
  'In Progress': true,
  Done: false,
  Cancelled: false,
}
const DEFAULT_UI_PREFERENCES = {
  groupBy: 'compartment',
  viewMode: 'full',
  search: '',
  priorityFilter: DEFAULT_PRIORITY_FILTER,
  statusFilterState: DEFAULT_STATUS_FILTER,
  nextActionFilter: 'All',
  showReminders: true,
  sortBy: 'none',
  currentView: 'board',
  planningZoom: '3m',
  darkMode: false,
  showSchedulingFields: false,
  planningPreferences: {},
}
const PRIORITY_COLUMN_COLORS = {
  P1: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  P2: { bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA' },
  P3: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  P4: { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' },
  P5: { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
}
const STATUS_COLUMN_COLORS = {
  'To Do': STATUS_COLORS['To Do'],
  'To Analyze': STATUS_COLORS['To Analyze'],
  'In Progress': STATUS_COLORS['In Progress'],
  Done: STATUS_COLORS.Done,
  Cancelled: STATUS_COLORS.Cancelled,
}

const restoreBooleanFilter = (savedFilter, defaultFilter) => (
  Object.fromEntries(
    Object.entries(defaultFilter).map(([key, defaultValue]) => [
      key,
      typeof savedFilter?.[key] === 'boolean' ? savedFilter[key] : defaultValue,
    ]),
  )
)

const normalizePreferences = (saved = {}, defaults = DEFAULT_UI_PREFERENCES) => ({
  groupBy: ['compartment', 'priority', 'status'].includes(saved.groupBy) ? saved.groupBy : defaults.groupBy,
  viewMode: ['compact', 'standard', 'full'].includes(saved.viewMode) ? saved.viewMode : defaults.viewMode,
  search: typeof saved.search === 'string' ? saved.search : defaults.search,
  priorityFilter: restoreBooleanFilter(saved.priorityFilter, DEFAULT_PRIORITY_FILTER),
  statusFilterState: restoreBooleanFilter(saved.statusFilterState, DEFAULT_STATUS_FILTER),
  nextActionFilter: ['All', ...WHEN_OPTIONS].includes(saved.nextActionFilter) ? saved.nextActionFilter : defaults.nextActionFilter,
  showReminders: typeof saved.showReminders === 'boolean' ? saved.showReminders : defaults.showReminders,
  sortBy: ['none', 'priorityAsc', 'priorityDesc', 'whenAsc', 'whenDesc'].includes(saved.sortBy) ? saved.sortBy : defaults.sortBy,
  currentView: ['board', 'planning'].includes(saved.currentView) ? saved.currentView : defaults.currentView,
  planningZoom: ['1m', '3m', '6m', '1y', '2y'].includes(saved.planningZoom) ? saved.planningZoom : defaults.planningZoom,
  darkMode: typeof saved.darkMode === 'boolean' ? saved.darkMode : defaults.darkMode,
  showSchedulingFields: typeof saved.showSchedulingFields === 'boolean' ? saved.showSchedulingFields : defaults.showSchedulingFields,
  planningPreferences: saved.planningPreferences && typeof saved.planningPreferences === 'object'
    ? saved.planningPreferences
    : defaults.planningPreferences,
})

const loadSessionPreferences = () => {
  const localDefaults = {
    ...DEFAULT_UI_PREFERENCES,
    darkMode: (() => {
      try { return JSON.parse(localStorage.getItem('kanban-dark-mode') || 'false') } catch (_) { return false }
    })(),
    showSchedulingFields: (() => {
      try { return JSON.parse(localStorage.getItem('kanban-show-scheduling-fields') || 'false') } catch (_) { return false }
    })(),
  }

  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_PREFERENCES_KEY) || '{}')
    return normalizePreferences(saved, localDefaults)
  } catch (error) {
    console.warn('Unable to restore session preferences:', error)
    return localDefaults
  }
}

/**
 * Application My Task Board principale avec intégration Supabase
 */
function App() {
  const sessionPreferences = useMemo(loadSessionPreferences, [])

  // État local de l'interface
  const [groupBy, setGroupBy] = useState(sessionPreferences.groupBy)
  const [viewMode, setViewMode] = useState(sessionPreferences.viewMode)
  const [darkMode, setDarkMode] = useState(sessionPreferences.darkMode)
  const [showSchedulingFields, setShowSchedulingFields] = useState(sessionPreferences.showSchedulingFields)
  const [cloudPreferencesReady, setCloudPreferencesReady] = useState(false)
  const [planningPreferences, setPlanningPreferences] = useState(sessionPreferences.planningPreferences)
  const { compartments: compartmentObjects, compartmentNames } = useCompartments()
  const [search, setSearch] = useState(sessionPreferences.search)
  const [priorityFilter, setPriorityFilter] = useState(sessionPreferences.priorityFilter)
  const [statusFilterState, setStatusFilterState] = useState(sessionPreferences.statusFilterState)
  const [nextActionFilter, setNextActionFilter] = useState(sessionPreferences.nextActionFilter)
  const [showReminders, setShowReminders] = useState(sessionPreferences.showReminders)
  const [sortBy, setSortBy] = useState(sessionPreferences.sortBy)
  const [currentView, setCurrentView] = useState(sessionPreferences.currentView)
  const [planningZoom, setPlanningZoom] = useState(sessionPreferences.planningZoom)
  const [activeMobileColumn, setActiveMobileColumn] = useState(null)
  const [modal, setModal] = useState({ 
    open: false, editingId: null, initialColumn: null, prefillTitle: "", fromQuickId: null 
  })
  const [quickOpen, setQuickOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signin')

  // Gestion du mode sombre
  useEffect(() => {
    localStorage.setItem('kanban-dark-mode', JSON.stringify(darkMode))
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem('kanban-show-scheduling-fields', JSON.stringify(showSchedulingFields))
  }, [showSchedulingFields])

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_PREFERENCES_KEY, JSON.stringify({
        groupBy,
        viewMode,
        search,
        priorityFilter,
        statusFilterState,
        nextActionFilter,
        showReminders,
        sortBy,
        currentView,
        planningZoom,
        darkMode,
        showSchedulingFields,
        planningPreferences,
      }))
    } catch (error) {
      console.warn('Unable to save session preferences:', error)
    }
  }, [
    groupBy,
    viewMode,
    search,
    priorityFilter,
    statusFilterState,
    nextActionFilter,
    showReminders,
    sortBy,
    currentView,
    planningZoom,
    darkMode,
    showSchedulingFields,
    planningPreferences,
  ])


  // Hook d'authentification
  const { 
    user, 
    loading: authLoading, 
    error: authError,
    signIn, 
    signUp, 
    signOut, 
    isAuthenticated 
  } = useAuth()

  const currentPreferences = useMemo(() => ({
    groupBy,
    viewMode,
    search,
    priorityFilter,
    statusFilterState,
    nextActionFilter,
    showReminders,
    sortBy,
    currentView,
    planningZoom,
    darkMode,
    showSchedulingFields,
    planningPreferences,
  }), [
    groupBy,
    viewMode,
    search,
    priorityFilter,
    statusFilterState,
    nextActionFilter,
    showReminders,
    sortBy,
    currentView,
    planningZoom,
    darkMode,
    showSchedulingFields,
    planningPreferences,
  ])

  useEffect(() => {
    let cancelled = false
    setCloudPreferencesReady(false)
    if (!user?.id) return () => { cancelled = true }

    const loadCloudPreferences = async () => {
      try {
        const saved = await userPreferenceService.getPreferences(user.id)
        if (cancelled) return
        if (saved) {
          const restored = normalizePreferences(saved, currentPreferences)
          setGroupBy(restored.groupBy)
          setViewMode(restored.viewMode)
          setSearch(restored.search)
          setPriorityFilter(restored.priorityFilter)
          setStatusFilterState(restored.statusFilterState)
          setNextActionFilter(restored.nextActionFilter)
          setShowReminders(restored.showReminders)
          setSortBy(restored.sortBy)
          setCurrentView(restored.currentView)
          setPlanningZoom(restored.planningZoom)
          setDarkMode(restored.darkMode)
          setShowSchedulingFields(restored.showSchedulingFields)
          setPlanningPreferences(restored.planningPreferences)
        }
        setCloudPreferencesReady(true)
      } catch (error) {
        console.warn('Cloud preferences unavailable, keeping local preferences:', error)
      }
    }

    loadCloudPreferences()
    return () => { cancelled = true }
    // Les préférences courantes servent uniquement de valeurs de repli au chargement du compte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (!user?.id || !cloudPreferencesReady) return undefined
    const saveTimer = window.setTimeout(() => {
      userPreferenceService.savePreferences(user.id, currentPreferences).catch((error) => {
        console.warn('Unable to synchronize preferences:', error)
      })
    }, 500)

    return () => window.clearTimeout(saveTimer)
  }, [user?.id, cloudPreferencesReady, currentPreferences])

  // Hooks personnalisés pour les données
  const { 
    tasks, 
    order, 
    loading: tasksLoading, 
    error: tasksError,
    createTask, 
    updateTask, 
    deleteTask, 
    reorderTasks 
  } = useTasks()

  const { 
    quickTasks, 
    loading: quickLoading, 
    error: quickError,
    addQuickTask, 
    removeQuickTask 
  } = useQuickTasks()

  const {
    periods: planningPeriods,
    loading: planningPeriodsLoading,
    error: planningPeriodsError,
    createPeriod,
    updatePeriod,
    deletePeriod,
  } = usePlanningPeriods()

  // Référence pour fermer les filtres et menu visualisation
  const filterRef = useRef(null)
  const viewRef = useRef(null)
  const boardScrollRef = useRef(null)
  const boardHeaderTrackRef = useRef(null)
  const [boardToolbarHeight, setBoardToolbarHeight] = useState(0)

  useEffect(() => {
    const toolbar = document.getElementById('board-toolbar')
    if (!toolbar) return undefined

    const updateToolbarHeight = () => setBoardToolbarHeight(Math.ceil(toolbar.getBoundingClientRect().height))
    updateToolbarHeight()

    const resizeObserver = new ResizeObserver(updateToolbarHeight)
    resizeObserver.observe(toolbar)
    window.addEventListener('resize', updateToolbarHeight)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateToolbarHeight)
    }
  }, [authLoading, tasksLoading, quickLoading])

  const syncBoardHeaderScroll = (event) => {
    if (boardHeaderTrackRef.current) {
      boardHeaderTrackRef.current.style.transform = `translateX(-${event.currentTarget.scrollLeft}px)`
    }
  }

  // Fermer les filtres et menu visualisation au clic extérieur ou Escape
  useEffect(() => {
    function onDocMouseDown(e) {
      const filterEl = filterRef.current
      const viewEl = viewRef.current
      
      if (filterEl && filterEl.open && !filterEl.contains(e.target)) {
        try { filterEl.open = false } catch(_) {}
        filterEl.removeAttribute('open')
      }
      
      if (viewEl && viewEl.open && !viewEl.contains(e.target)) {
        try { viewEl.open = false } catch(_) {}
        viewEl.removeAttribute('open')
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        const filterEl = filterRef.current
        const viewEl = viewRef.current
        
        if (filterEl && filterEl.open) { 
          try { filterEl.open = false } catch(_) {} 
          filterEl.removeAttribute('open') 
        }
        if (viewEl && viewEl.open) { 
          try { viewEl.open = false } catch(_) {} 
          viewEl.removeAttribute('open') 
        }
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  // Colonnes selon le groupement
  const columns = groupBy === "compartment" ? compartmentNames 
    : groupBy === "priority" ? PRIORITIES 
    : STATUSES

  // Filtrage et tri des tâches visibles
  const visibleIdsByColumn = useMemo(() => {
    const current = (order && order[groupBy]) || {}
    const res = {}
    
    columns.forEach((col) => {
      let ids = (current[col] || []).filter((id) => {
        const t = tasks[id]
        if (!t) return false
        
        const matchesSearch = !search || (() => {
          const searchTerm = search.toLowerCase()
          
          // Search in task title
          if (t.title.toLowerCase().includes(searchTerm)) return true
          
          // Search in task notes
          if (t.note && t.note.toLowerCase().includes(searchTerm)) return true
          
          // Search in subtasks
          if (t.subtasks && Array.isArray(t.subtasks)) {
            return t.subtasks.some(subtask => 
              subtask.title && subtask.title.toLowerCase().includes(searchTerm)
            )
          }
          
          return false
        })()
        const matchesPriority = priorityFilter[t.priority]
        const matchesStatus = statusFilterState[t.status]
        
        // Next Action filter logic
        const matchesNextAction = nextActionFilter === "All" || (() => {
          const taskWhen = t.when || ""
          const taskWhenOrder = WHEN_ORDER[taskWhen] || 99
          const filterWhenOrder = WHEN_ORDER[nextActionFilter] || 99
          // Show tasks that have next action timing <= selected filter
          return taskWhenOrder <= filterWhenOrder
        })()
        
        return matchesSearch && matchesPriority && matchesStatus && matchesNextAction
      })
      
      // Fonctions de tri
      const priorityRank = (id) => {
        const prio = tasks[id]?.priority
        return (prio && PRIORITY_RANK[prio]) ? PRIORITY_RANK[prio] : 99
      }
      
      const whenRank = (id) => (WHEN_ORDER[tasks[id]?.when || ""]) || 99
      
      // Appliquer le tri
      if (sortBy === "priorityAsc") {
        ids.sort((a,b) => priorityRank(a) - priorityRank(b))
      } else if (sortBy === "priorityDesc") {
        ids.sort((a,b) => priorityRank(b) - priorityRank(a))
      } else if (sortBy === "whenAsc") {
        ids.sort((a,b) => whenRank(a) - whenRank(b))
      } else if (sortBy === "whenDesc") {
        ids.sort((a,b) => whenRank(b) - whenRank(a))
      }
      
      res[col] = ids
    })
    
    return res
  }, [order, groupBy, columns, tasks, search, priorityFilter, statusFilterState, nextActionFilter, sortBy])

  const planningTasks = useMemo(() => Object.values(tasks).filter((task) => {
    const searchTerm = search.trim().toLowerCase()
    const matchesSearch = !searchTerm
      || task.title?.toLowerCase().includes(searchTerm)
      || task.note?.toLowerCase().includes(searchTerm)
      || task.subtasks?.some((subtask) => subtask.title?.toLowerCase().includes(searchTerm))
    const matchesPriority = priorityFilter[task.priority]
    const matchesStatus = statusFilterState[task.status]
    const matchesReminderType = showReminders || !task.planningExcluded
    const matchesNextAction = nextActionFilter === 'All'
      || (WHEN_ORDER[task.when || ''] || 99) <= (WHEN_ORDER[nextActionFilter] || 99)

    return matchesSearch && matchesPriority && matchesStatus && matchesNextAction && matchesReminderType
  }), [tasks, search, priorityFilter, statusFilterState, nextActionFilter, showReminders])

  // Colonnes affichées (masquer "Terminé" si vide et pas filtré)
  const displayedColumns = useMemo(() => {
    let cols = columns
    if (groupBy === "status") {
      cols = cols.filter(c => !(
        c === "Done" && 
        (!statusFilterState["Done"] || (visibleIdsByColumn[c]?.length || 0) === 0)
      ))
    }
    return cols
  }, [columns, groupBy, statusFilterState, visibleIdsByColumn])

  useEffect(() => {
    if (!displayedColumns.includes(activeMobileColumn)) {
      setActiveMobileColumn(displayedColumns[0] || null)
    }
  }, [activeMobileColumn, displayedColumns])

  useEffect(() => {
    if (currentView !== 'board' || !boardHeaderTrackRef.current) return
    const scrollLeft = boardScrollRef.current?.scrollLeft || 0
    boardHeaderTrackRef.current.style.transform = `translateX(-${scrollLeft}px)`
  }, [currentView, groupBy, displayedColumns])

  const activeFilters = useMemo(() => {
    const filters = []

    PRIORITIES.forEach((priority) => {
      if (!priorityFilter[priority]) {
        filters.push({
          key: `priority-${priority}`,
          label: `Sans ${priority}`,
          onRemove: () => setPriorityFilter((current) => ({ ...current, [priority]: true })),
        })
      }
    })

    STATUSES.forEach((status) => {
      if (statusFilterState[status] !== DEFAULT_STATUS_FILTER[status]) {
        filters.push({
          key: `status-${status}`,
          label: statusFilterState[status]
            ? `Inclut ${STATUS_LABELS[status].toLowerCase()}`
            : `Sans ${STATUS_LABELS[status].toLowerCase()}`,
          onRemove: () => setStatusFilterState((current) => ({
            ...current,
            [status]: DEFAULT_STATUS_FILTER[status],
          })),
        })
      }
    })

    if (nextActionFilter !== 'All') {
      filters.push({
        key: 'next-action',
        label: `Échéance : ${WHEN_LABELS[nextActionFilter]}`,
        onRemove: () => setNextActionFilter('All'),
      })
    }

    if (currentView === 'planning' && !showReminders) {
      filters.push({
        key: 'reminders',
        label: 'Pense-bêtes masqués',
        onRemove: () => setShowReminders(true),
      })
    }

    return filters
  }, [priorityFilter, statusFilterState, nextActionFilter, showReminders, currentView])

  // Check if all compartments are empty (no tasks at all)
  const hasAnyTasks = Object.keys(tasks).length > 0
  const allColumnsEmpty = displayedColumns.every(col => (visibleIdsByColumn[col]?.length || 0) === 0)

  const getColumnHeaderStyle = (column) => {
    if (groupBy === 'compartment') {
      const compartment = compartmentObjects.find((item) => item.name === column)
      const colors = {
        bg: compartment?.color_bg || COMPARTMENT_COLORS[column]?.bg || '#DBEAFE',
        text: compartment?.color_text || COMPARTMENT_COLORS[column]?.text || '#1E40AF',
        border: compartment?.color_border || COMPARTMENT_COLORS[column]?.border || '#BFDBFE',
      }
      return {
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      }
    }

    const colors = groupBy === 'priority'
      ? PRIORITY_COLUMN_COLORS[column]
      : STATUS_COLUMN_COLORS[column]
    return {
      backgroundColor: colors.bg,
      color: colors.text,
      borderColor: colors.border,
    }
  }

  const renderColumnHeader = (column, className = '') => (
    <div
      className={`flex min-w-0 items-center justify-between rounded-xl border px-3 py-3 ${className}`}
      style={getColumnHeaderStyle(column)}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="font-display truncate text-sm font-bold text-current">
          {groupBy === 'status' ? STATUS_LABELS[column] : column}
        </div>
        <span className="shrink-0 rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-semibold text-current shadow-sm">
          {visibleIdsByColumn[column]?.length || 0}
        </span>
      </div>
      <button
        type="button"
        onClick={() => openCreate(column)}
        className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-current transition-colors hover:bg-white/50"
        aria-label={`Ajouter une tâche dans ${groupBy === 'status' ? STATUS_LABELS[column] : column}`}
      >
        <Plus className="h-4 w-4" /> Ajouter
      </button>
    </div>
  )

  // Gestion du drag & drop
  const onDragEnd = (result) => {
    reorderTasks(result.source, result.destination, result.draggableId, groupBy, compartmentObjects)
  }

  // Gestion des modales
  const openCreate = (initialColumn) => {
    setModal({ 
      open: true, editingId: null, initialColumn, prefillTitle: "", fromQuickId: null 
    })
  }

  const openEdit = (id) => {
    setModal({ 
      open: true, editingId: id, initialColumn: null, prefillTitle: "", fromQuickId: null 
    })
  }

  const closeModal = () => {
    setModal({ 
      open: false, editingId: null, initialColumn: null, prefillTitle: "", fromQuickId: null 
    })
  }

  // Sauvegarde d'une tâche
  const handleSaveTask = async (taskData) => {
    // Map compartment name to ID for database operations
    let processedTaskData = { ...taskData }
    if (taskData.compartment && !taskData.compartmentId) {
      console.log(`🔍 Looking for compartment: "${taskData.compartment}"`)
      console.log('Available compartments:', compartmentObjects?.map(c => ({ id: c.id, name: c.name })))
      
      const compartment = compartmentObjects?.find(c => c.name === taskData.compartment)
      if (compartment) {
        processedTaskData.compartmentId = compartment.id
        console.log(`✅ Mapped compartment "${taskData.compartment}" to ID ${compartment.id}`)
      } else {
        console.error(`❌ Could not find compartment with name "${taskData.compartment}"`)
        // Don't proceed without a compartment ID
        alert(`Error: Could not find compartment "${taskData.compartment}". Please try refreshing the page.`)
        return
      }
    }
    
    if (processedTaskData.id) {
      await updateTask(processedTaskData.id, processedTaskData)
    } else {
      await createTask(processedTaskData)
    }
    
    // Supprimer la tâche rapide si applicable
    if (processedTaskData.fromQuickId) {
      await removeQuickTask(processedTaskData.fromQuickId)
    }
    
    closeModal()
  }

  // Classification d'une tâche rapide
  const handleClassifyQuickTask = (quickId) => {
    const quickTask = quickTasks.find(x => x.id === quickId)
    if (!quickTask) return
    
    setModal({ 
      open: true, 
      editingId: null, 
      initialColumn: null, 
      prefillTitle: quickTask.title, 
      fromQuickId: quickId 
    })
    setQuickOpen(false)
  }

  // Réinitialiser les filtres
  const resetFilters = () => {
    setPriorityFilter({ ...DEFAULT_PRIORITY_FILTER })
    setStatusFilterState({ ...DEFAULT_STATUS_FILTER })
    setNextActionFilter('All')
    setShowReminders(true)
  }

  // Affichage du chargement de l'authentification
  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-slate-600 dark:border-t-slate-400 rounded-full animate-spin"></div>
            <div className="w-8 h-8 border-4 border-transparent border-t-blue-500 rounded-full animate-spin absolute top-2 left-2" style={{animationDuration: '0.8s'}}></div>
          </div>
          <div className="text-slate-600 dark:text-slate-400 text-sm">
            Connexion sécurisée<span className="animate-pulse">…</span>
          </div>
        </div>
      </div>
    )
  }

  // Redirection vers l'authentification si pas connecté
  if (!isAuthenticated) {
    return (
      <>
        <LandingScreen
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((current) => !current)}
          onSignIn={() => {
            setAuthMode('signin')
            setAuthOpen(true)
          }}
          onSignUp={() => {
            setAuthMode('signup')
            setAuthOpen(true)
          }}
        />
        {authOpen && (
          <AuthModal
            onClose={() => setAuthOpen(false)}
            onSignIn={signIn}
            onSignUp={signUp}
            loading={authLoading}
            error={authError}
            defaultMode={authMode}
          />
        )}
      </>
    )

    /* Legacy landing kept temporarily for compatibility while the new surface is validated. */
    /* eslint-disable no-unreachable */
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
          <div className="max-w-4xl w-full">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left side - Image and features */}
              <div className="order-2 lg:order-1">
                <div className="relative">
                  {/* Task Board Illustration */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-3 gap-4">
                      {/* Design Column */}
                      <div className="space-y-3">
                        <div className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg text-sm font-medium text-center">
                          Design
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 space-y-2">
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-3/4"></div>
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-1/2"></div>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 space-y-2">
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-2/3"></div>
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-4/5"></div>
                        </div>
                      </div>
                      
                      {/* Development Column */}
                      <div className="space-y-3">
                        <div className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-3 py-2 rounded-lg text-sm font-medium text-center">
                          Development
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 space-y-2">
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-4/5"></div>
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-1/3"></div>
                        </div>
                      </div>
                      
                      {/* Launch Column */}
                      <div className="space-y-3">
                        <div className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-3 py-2 rounded-lg text-sm font-medium text-center">
                          Launch
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 space-y-2">
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-3/5"></div>
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-4/5"></div>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 space-y-2">
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-1/2"></div>
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-2/3"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Floating elements for visual appeal */}
                  <div className="absolute -top-4 -right-4 w-8 h-8 bg-blue-500 rounded-full opacity-60 animate-pulse"></div>
                  <div className="absolute -bottom-6 -left-6 w-12 h-12 bg-emerald-500 rounded-full opacity-40 animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
                
                {/* Features list */}
                <div className="mt-8 space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Start simple, grow complex</h3>
                  
                  <div className="grid gap-2">
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Drag & drop simplicity</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span>Customize everything</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Power features when you need them</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                      <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                      <span>Your workflow, your way</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right side - Sign in content */}
              <div className="order-1 lg:order-2 text-center lg:text-left space-y-8">
                <div>
                  <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                    <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white">My Task Board</h1>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                      FREE
                    </span>
                  </div>
                  <p className="text-xl text-slate-600 dark:text-slate-400 mb-2">Task management that adapts to your workflow</p>
                  <p className="text-lg text-slate-600 dark:text-slate-400 mb-3">As simple or as powerful as you need it to be</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500">✨ Completely free to use • No limits • No ads</p>
                </div>
                
                <div className="space-y-6">
                  {/* Primary CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => {
                        setAuthMode('signup')
                        setAuthOpen(true)
                      }}
                      className="flex-1 px-6 py-3 rounded-xl bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 font-semibold text-base transition-all duration-200 transform hover:scale-105 shadow-lg"
                    >
                      Sign Up Free
                    </button>
                    <button 
                      onClick={() => {
                        setAuthMode('signin')
                        setAuthOpen(true)
                      }}
                      className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-base transition-all duration-200"
                    >
                      Sign In
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center">No credit card required • Get started in seconds</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {authOpen && (
          <AuthModal
            onClose={() => setAuthOpen(false)}
            onSignIn={signIn}
            onSignUp={signUp}
            loading={authLoading}
            error={authError}
            defaultMode={authMode}
          />
        )}
      </div>
    )
  }

  // Affichage du chargement des tâches
  if (tasksLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
            <div className="w-10 h-10 border-4 border-transparent border-t-blue-500 rounded-full animate-spin absolute top-3 left-3" style={{animationDuration: '1.5s', animationDirection: 'reverse'}}></div>
            <div className="w-4 h-4 bg-purple-500 rounded-full animate-pulse absolute top-6 left-6"></div>
          </div>
          <div className="text-slate-600 dark:text-slate-400 text-sm font-medium">
            Préparation de votre tableau<span className="animate-pulse">…</span>
          </div>
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
          </div>
        </div>
      </div>
    )
  }

  // Affichage des erreurs
  if (tasksError || quickError) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-6 dark:bg-slate-900">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm dark:border-red-900 dark:bg-slate-800">
          <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white">Le tableau ne peut pas être chargé</h1>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{tasksError || quickError}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-[#172033] px-4 py-2 text-sm font-semibold text-white dark:bg-[#356AE6]">
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#F6F7F9] text-[#172033] transition-colors dark:bg-slate-950 dark:text-slate-100">
      <BoardToolbar
        user={user}
        activeView={currentView}
        onViewChange={setCurrentView}
        search={search}
        onSearchChange={setSearch}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={(priority) => setPriorityFilter((current) => ({
          ...current,
          [priority]: !current[priority],
        }))}
        statusFilter={statusFilterState}
        onStatusFilterChange={(status) => setStatusFilterState((current) => ({
          ...current,
          [status]: !current[status],
        }))}
        nextActionFilter={nextActionFilter}
        onNextActionFilterChange={setNextActionFilter}
        showReminders={showReminders}
        onShowRemindersChange={setShowReminders}
        onResetFilters={resetFilters}
        activeFilterCount={activeFilters.length}
        activeFilters={activeFilters}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((current) => !current)}
        quickTaskCount={quickTasks.length}
        onOpenQuickTasks={() => setQuickOpen(true)}
        onSignOut={signOut}
        showSchedulingFields={showSchedulingFields}
        onToggleSchedulingFields={setShowSchedulingFields}
        filterRef={filterRef}
        viewRef={viewRef}
      />

      {/* Barre supérieure */}
      {false && (<header className="sticky top-0 z-20 backdrop-blur bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">My Task Board</div>

          <div className="ml-auto flex items-center gap-2">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search…"
                className="pl-8 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 border border-transparent focus:border-slate-300 dark:focus:border-slate-600 outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" 
              />
            </div>

            {/* Filtres */}
            <details ref={filterRef} className="relative">
              <summary className="list-none select-none inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm cursor-pointer text-slate-900 dark:text-white">
                <FilterIcon className="h-4 w-4" /> Filters <ChevronDown className="h-4 w-4" />
              </summary>
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-xl z-30">
                <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400 mb-2">Priority</div>
                {PRIORITIES.map((p) => (
                  <label key={p} className="flex items-center gap-2 py-1 text-sm">
                    <input 
                      type="checkbox" 
                      checked={priorityFilter[p]} 
                      onChange={() => setPriorityFilter(s => ({ ...s, [p]: !s[p] }))} 
                    />
                    <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-md border text-xs ${PRIORITY_STYLES[p]}`}>
                      <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[p]}`}></span>
                      {p}
                    </span>
                  </label>
                ))}
                
                <div className="text-xs font-medium uppercase text-slate-500 mt-3 mb-2">Status</div>
                {STATUSES.map((s) => (
                  <label key={s} className="flex items-center gap-2 py-1 text-sm">
                    <input 
                      type="checkbox" 
                      checked={statusFilterState[s]} 
                      onChange={() => setStatusFilterState(x => ({ ...x, [s]: !x[s] }))} 
                    />
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" 
                      style={badgeStyle(STATUS_COLORS[s])}
                    >
                      {s}
                    </span>
                  </label>
                ))}

                <div className="text-xs font-medium uppercase text-slate-500 mt-3 mb-2">Next Action</div>
                <div className="space-y-1">
                  {/* All option */}
                  <label className="flex items-center gap-2 py-1 text-sm">
                    <input 
                      type="radio" 
                      name="nextActionFilter"
                      checked={nextActionFilter === "All"} 
                      onChange={() => setNextActionFilter("All")} 
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      All tasks
                    </span>
                  </label>
                  
                  {/* When options */}
                  {WHEN_OPTIONS.filter(opt => opt !== "").map((opt) => (
                    <label key={opt} className="flex items-center gap-2 py-1 text-sm">
                      <input 
                        type="radio" 
                        name="nextActionFilter"
                        checked={nextActionFilter === opt} 
                        onChange={() => setNextActionFilter(opt)} 
                      />
                      <span 
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" 
                        style={styleWhen(opt)}
                      >
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
                
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-slate-500">Reset filters</div>
                  <button 
                    onClick={resetFilters} 
                    className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </details>

            {/* Groupement */}
            <div className="inline-flex items-center gap-2 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Group by</span>
              <select 
                value={groupBy} 
                onChange={(e) => setGroupBy(e.target.value)} 
                className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white"
              >
                <option value="compartment">Compartment</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
              </select>
            </div>

            {/* Tri */}
            <div className="inline-flex items-center gap-2 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Sort</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)} 
                className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white"
              >
                <option value="none">None</option>
                <option value="priorityAsc">P1→P5</option>
                <option value="priorityDesc">P5→P1</option>
                <option value="whenAsc">When↑</option>
                <option value="whenDesc">When↓</option>
              </select>
            </div>

            {/* View Mode & Dark Mode */}
            <details ref={viewRef} className="relative">
              <summary className="list-none select-none inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm cursor-pointer text-slate-900 dark:text-white">
                <Eye className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span>View</span>
                <ChevronDown className="h-4 w-4" />
              </summary>
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-xl z-50">
                <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400 mb-2">Display Mode</div>
                <div className="space-y-2 mb-4">
                  {[
                    { value: "compact", label: "Compact", desc: "Title + Priority only" },
                    { value: "standard", label: "Standard", desc: "Everything except when selector" },
                    { value: "full", label: "Full", desc: "All elements visible" }
                  ].map((mode) => (
                    <label key={mode.value} className="flex items-start gap-2 py-1 cursor-pointer">
                      <input 
                        type="radio" 
                        name="viewMode" 
                        value={mode.value}
                        checked={viewMode === mode.value}
                        onChange={(e) => setViewMode(e.target.value)}
                        className="mt-0.5"
                      />
                      <div className="text-sm">
                        <div className="font-medium text-slate-900 dark:text-white">{mode.label}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{mode.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                  <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400 mb-2">Theme</div>
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-sm transition-colors"
                  >
                    {darkMode ? (
                      <>
                        <Sun className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        <span className="text-slate-900 dark:text-white">Switch to Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-900">Switch to Dark Mode</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </details>

            {/* Tâche rapide */}
            <button 
              onClick={() => setQuickOpen(true)} 
              className="relative inline-flex items-center gap-1 text-sm px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
            >
Quick Task
              {quickTasks.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                  {quickTasks.length}
                </span>
              )}
            </button>

            {/* Menu compte utilisateur */}
            <AccountMenu 
              user={user} 
              onSignOut={signOut} 
              showSchedulingFields={showSchedulingFields}
              onToggleSchedulingFields={setShowSchedulingFields}
            />
          </div>
        </div>
      </header>)}

      {currentView === 'planning' ? (
        <PlanningView
          tasks={planningTasks}
          compartments={compartmentObjects}
          periods={planningPeriods}
          periodsLoading={planningPeriodsLoading}
          periodsError={planningPeriodsError}
          zoom={planningZoom}
          onZoomChange={setPlanningZoom}
          onUpdateTask={updateTask}
          onOpenTask={openEdit}
          onCreatePeriod={createPeriod}
          onUpdatePeriod={updatePeriod}
          onDeletePeriod={deletePeriod}
          syncedPreferences={planningPreferences}
          onPreferencesChange={setPlanningPreferences}
        />
      ) : (
      <>
      {/* Tableau des tâches */}
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 md:hidden" role="tablist" aria-label="Colonnes du tableau">
          {displayedColumns.map((column) => (
            <button
              key={column}
              type="button"
              role="tab"
              aria-selected={activeMobileColumn === column}
              onClick={() => setActiveMobileColumn(column)}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                activeMobileColumn === column
                  ? 'bg-[#172033] text-white dark:bg-[#356AE6]'
                  : 'border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {groupBy === 'status' ? STATUS_LABELS[column] : column}
              <span className="ml-1.5 opacity-60">{visibleIdsByColumn[column]?.length || 0}</span>
            </button>
          ))}
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div
            className="sticky z-40 bg-[#F6F7F9] pb-2 dark:bg-slate-950 md:hidden"
            style={{ top: boardToolbarHeight }}
          >
            {activeMobileColumn && renderColumnHeader(activeMobileColumn)}
          </div>

          <div
            className="sticky z-40 -mx-4 hidden overflow-hidden bg-[#F6F7F9] px-4 pb-2 dark:bg-slate-950 sm:-mx-6 sm:px-6 md:block"
            style={{ top: boardToolbarHeight }}
          >
            <div
              ref={boardHeaderTrackRef}
              className="board-grid gap-4"
              style={{ '--board-columns': displayedColumns.length, willChange: 'transform' }}
            >
              {displayedColumns.map((column) => (
                <div key={column} className="min-w-0">
                  {renderColumnHeader(column)}
                </div>
              ))}
            </div>
          </div>

          <div
            ref={boardScrollRef}
            onScroll={syncBoardHeaderScroll}
            className="board-scroll scrollbar-subtle overflow-x-auto pb-3"
          >
          <div
            className="board-grid gap-4"
            style={{ '--board-columns': displayedColumns.length }}
          >
            {displayedColumns.map((col) => (
              <div
                key={col}
                role="tabpanel"
                className={`${activeMobileColumn === col ? 'flex' : 'hidden'} min-w-0 flex-col md:flex`}
              >
                <div className="mb-2 min-w-0">
                  {/* Zone de drop */}
                  <Droppable droppableId={col}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                        className={`relative min-h-[180px] rounded-2xl border border-slate-200 p-2.5 transition-colors dark:border-slate-700 ${
                          snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-950/40' : 'bg-slate-100/70 dark:bg-slate-900/60'
                        }`}
                        style={{ overflow: 'visible' }}
                      >
                        {(visibleIdsByColumn[col] || []).map((id, index) => (
                          <TaskCard 
                            key={id} 
                            id={id} 
                            index={index} 
                            task={tasks[id]} 
                            onEdit={() => openEdit(id)} 
                            onUpdate={updateTask}
                            groupBy={groupBy}
                            viewMode={viewMode}
                          />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            ))}
          </div>
          </div>
        </DragDropContext>

        <StickyBoardScrollbar
          targetRef={boardScrollRef}
          contentKey={`${groupBy}-${displayedColumns.length}`}
          ariaLabel="Défilement horizontal du tableau"
        />

        {/* Empty State Guide - shown when no tasks exist */}
        {!hasAnyTasks && (
          <div className="mt-8 text-center">
            <div className="max-w-2xl mx-auto bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Votre tableau est prêt.
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Créez une première tâche, puis organisez-la au rythme de votre travail.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 text-left">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 text-sm font-semibold">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white mb-1">Créer une tâche</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Utilisez <strong>Ajouter</strong> dans la colonne qui correspond à votre besoin.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <span className="text-green-600 dark:text-green-400 text-sm font-semibold">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white mb-1">Organiser</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Déplacez les tâches entre les colonnes et ajustez leur priorité.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
                      <span className="text-cyan-600 dark:text-cyan-400 text-sm font-semibold">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white mb-1">Adapter les compartiments</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Ouvrez votre profil puis <strong>Paramètres</strong> pour personnaliser les noms et couleurs.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                      <span className="text-purple-600 dark:text-purple-400 text-sm font-semibold">4</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white mb-1">Suivre l’avancement</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Utilisez la progression et les sous-tâches pour garder une vue juste du travail restant.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                      <span className="text-orange-600 dark:text-orange-400 text-sm font-semibold">5</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white mb-1">Collecter rapidement</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Capturez une idée dans <strong>Collecte rapide</strong>, puis classez-la plus tard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Astuce : utilisez <strong>Affichage</strong> pour regrouper le tableau par compartiment, priorité ou statut.
                </p>
                <button 
                  onClick={() => openCreate(displayedColumns[0])} 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" />
                      Créer ma première tâche
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* Modale de tâche */}
      {modal.open && (
        <TaskModal
          onClose={closeModal}
          onSave={handleSaveTask}
          onDelete={deleteTask}
          tasks={tasks}
          editingId={modal.editingId}
          initialColumn={modal.initialColumn}
          groupBy={groupBy}
          compartments={compartmentNames}
          prefillTitle={modal.prefillTitle}
          fromQuickId={modal.fromQuickId}
          loading={false}
          showSchedulingFields={showSchedulingFields}
        />
      )}

      {/* Modale des tâches rapides */}
      {quickOpen && (
        <QuickTasksModal
          onClose={() => setQuickOpen(false)}
          onAdd={addQuickTask}
          onRemove={removeQuickTask}
          onClassify={handleClassifyQuickTask}
          quickTasks={quickTasks}
          loading={quickLoading}
        />
      )}

      {/* Floating Feedback Button */}
      <button
        onClick={() => window.open('https://forms.gle/kYEEkbSznQYqZunu7', '_blank', 'noopener,noreferrer')}
        className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-30 group"
        title="Donner mon avis"
        aria-label="Donner mon avis"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="absolute right-14 bottom-3 bg-slate-900 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          Donner mon avis
        </span>
      </button>
    </div>
  )
}

export default App
