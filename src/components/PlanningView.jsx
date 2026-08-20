import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarRange,
  CalendarX,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  LocateFixed,
  Plus,
  ArrowUpDown,
  StickyNote,
} from 'lucide-react'
import StickyBoardScrollbar from './StickyBoardScrollbar'
import PlanningPeriodModal from './PlanningPeriodModal'
import { PRIORITY_RANK, STATUS_LABELS } from '../utils/constants'

const DAY_MS = 24 * 60 * 60 * 1000
const ZOOM_CONFIG = {
  '1m': { label: '1 mois', weeks: 6, step: 4, weekWidth: 132 },
  '3m': { label: '3 mois', weeks: 14, step: 13, weekWidth: 88 },
  '6m': { label: '6 mois', weeks: 27, step: 26, weekWidth: 58 },
  '1y': { label: '1 an', weeks: 53, step: 52, weekWidth: 34 },
  '2y': { label: '2 ans', weeks: 105, step: 104, weekWidth: 22 },
}
const parseDate = (value) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const toISODate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatWeekStart = (date) => {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}`
}

const startOfWeek = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value) : parseDate(value)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return date
}

const endOfWeek = (value) => {
  const date = startOfWeek(value)
  date.setDate(date.getDate() + 6)
  return date
}

const addDays = (value, days) => {
  const date = value instanceof Date ? new Date(value) : parseDate(value)
  date.setDate(date.getDate() + days)
  return date
}

const addWeeks = (value, weeks) => addDays(value, weeks * 7)

const diffDays = (start, end) => Math.round((end - start) / DAY_MS)

const getDurationWeeks = (task) => {
  if (!task.planningStartDate || !task.planningEndDate) return 1
  return Math.max(1, Math.ceil((diffDays(
    startOfWeek(task.planningStartDate),
    endOfWeek(task.planningEndDate),
  ) + 1) / 7))
}

const formatWeekRange = (startValue, endValue) => {
  if (!startValue || !endValue) return 'À planifier'
  const start = parseDate(startValue)
  const end = parseDate(endValue)
  const formatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
  return `${formatter.format(start)} → ${formatter.format(end)}`
}

const PlanningView = ({
  tasks,
  compartments,
  periods = [],
  periodsLoading,
  periodsError,
  zoom,
  onZoomChange,
  onUpdateTask,
  onOpenTask,
  onCreatePeriod,
  onUpdatePeriod,
  onDeletePeriod,
  syncedPreferences = {},
  onPreferencesChange,
}) => {
  const timelineScrollRef = useRef(null)
  const calendarTrackRef = useRef(null)
  const resizeRef = useRef(null)
  const periodResizeRef = useRef(null)
  const applyingSyncedPreferencesRef = useRef(false)
  const [resizeDraft, setResizeDraft] = useState(null)
  const [periodResizeDraft, setPeriodResizeDraft] = useState(null)
  const [periodEditor, setPeriodEditor] = useState(null)
  const [toolbarHeight, setToolbarHeight] = useState(0)
  const [planningTaskSort, setPlanningTaskSort] = useState(() => {
    try {
      const saved = sessionStorage.getItem('kanban-planning-task-sort')
      return ['startDate', 'alphabetical', 'priority'].includes(saved) ? saved : 'startDate'
    } catch (_) {
      return 'startDate'
    }
  })
  const [remindersCollapsed, setRemindersCollapsed] = useState(() => {
    try {
      const saved = sessionStorage.getItem('kanban-planning-reminders-collapsed')
      const parsed = saved === null ? true : JSON.parse(saved)
      return typeof parsed === 'boolean' ? parsed : true
    } catch (_) {
      return true
    }
  })
  const [unplannedCollapsed, setUnplannedCollapsed] = useState(() => {
    try {
      const saved = sessionStorage.getItem('kanban-planning-unplanned-collapsed')
      const parsed = saved === null ? true : JSON.parse(saved)
      return typeof parsed === 'boolean' ? parsed : true
    } catch (_) {
      return true
    }
  })
  const [collapsedCompartments, setCollapsedCompartments] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('kanban-planning-collapsed-compartments') || '[]')
      return new Set(Array.isArray(saved) ? saved : [])
    } catch (_) {
      return new Set()
    }
  })
  const [viewStart, setViewStart] = useState(() => {
    try {
      const saved = sessionStorage.getItem('kanban-planning-start')
      return saved ? startOfWeek(saved) : addWeeks(startOfWeek(), -1)
    } catch (_) {
      return addWeeks(startOfWeek(), -1)
    }
  })

  const config = ZOOM_CONFIG[zoom] || ZOOM_CONFIG['3m']
  const weeks = useMemo(() => (
    Array.from({ length: config.weeks }, (_, index) => addWeeks(viewStart, index))
  ), [config.weeks, viewStart])
  const timelineWidth = config.weeks * config.weekWidth
  const visibleEnd = endOfWeek(weeks[weeks.length - 1])

  useEffect(() => {
    const toolbar = document.getElementById('board-toolbar')
    if (!toolbar) return undefined

    const updateToolbarHeight = () => setToolbarHeight(Math.ceil(toolbar.getBoundingClientRect().height))
    updateToolbarHeight()

    const resizeObserver = new ResizeObserver(updateToolbarHeight)
    resizeObserver.observe(toolbar)
    window.addEventListener('resize', updateToolbarHeight)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateToolbarHeight)
    }
  }, [])

  const syncCalendarScroll = (event) => {
    if (calendarTrackRef.current) {
      calendarTrackRef.current.style.transform = `translateX(-${event.currentTarget.scrollLeft}px)`
    }
  }

  useEffect(() => {
    try {
      sessionStorage.setItem('kanban-planning-start', toISODate(viewStart))
    } catch (_) {
      // La timeline reste utilisable même si le stockage de session est indisponible.
    }
  }, [viewStart])

  useEffect(() => {
    try {
      sessionStorage.setItem(
        'kanban-planning-collapsed-compartments',
        JSON.stringify(Array.from(collapsedCompartments)),
      )
    } catch (_) {
      // Le repli reste utilisable même si le stockage de session est indisponible.
    }
  }, [collapsedCompartments])

  useEffect(() => {
    try {
      sessionStorage.setItem('kanban-planning-task-sort', planningTaskSort)
    } catch (_) {
      // Le tri reste utilisable même si le stockage de session est indisponible.
    }
  }, [planningTaskSort])

  useEffect(() => {
    try {
      sessionStorage.setItem('kanban-planning-reminders-collapsed', JSON.stringify(remindersCollapsed))
    } catch (_) {
      // Le tiroir reste utilisable même si le stockage de session est indisponible.
    }
  }, [remindersCollapsed])

  useEffect(() => {
    try {
      sessionStorage.setItem('kanban-planning-unplanned-collapsed', JSON.stringify(unplannedCollapsed))
    } catch (_) {
      // Le tiroir reste utilisable même si le stockage de session est indisponible.
    }
  }, [unplannedCollapsed])

  useEffect(() => {
    const {
      taskSort,
      remindersAreCollapsed,
      unplannedAreCollapsed,
      collapsedCompartmentNames,
      startDate,
    } = syncedPreferences

    const validStartDate = typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate)
      ? startOfWeek(startDate)
      : null
    const nextCollapsedCompartments = Array.isArray(collapsedCompartmentNames)
      ? new Set(collapsedCompartmentNames)
      : null
    const preferencesWillChange = (
      (['startDate', 'alphabetical', 'priority'].includes(taskSort) && taskSort !== planningTaskSort)
      || (typeof remindersAreCollapsed === 'boolean' && remindersAreCollapsed !== remindersCollapsed)
      || (typeof unplannedAreCollapsed === 'boolean' && unplannedAreCollapsed !== unplannedCollapsed)
      || (nextCollapsedCompartments && (
        collapsedCompartments.size !== nextCollapsedCompartments.size
        || Array.from(collapsedCompartments).some((name) => !nextCollapsedCompartments.has(name))
      ))
      || (validStartDate && !Number.isNaN(validStartDate.getTime())
        && toISODate(viewStart) !== toISODate(validStartDate))
    )

    if (preferencesWillChange) applyingSyncedPreferencesRef.current = true

    if (['startDate', 'alphabetical', 'priority'].includes(taskSort)) {
      setPlanningTaskSort((current) => current === taskSort ? current : taskSort)
    }
    if (typeof remindersAreCollapsed === 'boolean') {
      setRemindersCollapsed((current) => (
        current === remindersAreCollapsed ? current : remindersAreCollapsed
      ))
    }
    if (typeof unplannedAreCollapsed === 'boolean') {
      setUnplannedCollapsed((current) => (
        current === unplannedAreCollapsed ? current : unplannedAreCollapsed
      ))
    }
    if (nextCollapsedCompartments) {
      setCollapsedCompartments((current) => {
        const unchanged = current.size === nextCollapsedCompartments.size
          && Array.from(current).every((name) => nextCollapsedCompartments.has(name))
        return unchanged ? current : nextCollapsedCompartments
      })
    }
    if (validStartDate && !Number.isNaN(validStartDate.getTime())) {
      setViewStart((current) => (
        toISODate(current) === toISODate(validStartDate) ? current : validStartDate
      ))
    }
    // Les valeurs locales sont volontairement lues uniquement lorsqu'une version distante arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncedPreferences])

  useEffect(() => {
    if (applyingSyncedPreferencesRef.current) {
      applyingSyncedPreferencesRef.current = false
      return
    }
    onPreferencesChange?.({
      taskSort: planningTaskSort,
      remindersAreCollapsed: remindersCollapsed,
      unplannedAreCollapsed: unplannedCollapsed,
      collapsedCompartmentNames: Array.from(collapsedCompartments),
      startDate: toISODate(viewStart),
    })
  }, [
    planningTaskSort,
    remindersCollapsed,
    unplannedCollapsed,
    collapsedCompartments,
    viewStart,
    onPreferencesChange,
  ])

  const toggleCompartment = (compartmentName) => {
    setCollapsedCompartments((current) => {
      const next = new Set(current)
      if (next.has(compartmentName)) next.delete(compartmentName)
      else next.add(compartmentName)
      return next
    })
  }

  const plannedTasks = useMemo(() => tasks
    .filter((task) => !task.planningExcluded && task.planningStartDate && task.planningEndDate), [tasks])
  const unplannedTasks = useMemo(() => tasks
    .filter((task) => (
      task.status !== 'Done'
      && task.status !== 'Cancelled'
      && !task.planningExcluded
      && (!task.planningStartDate || !task.planningEndDate)
    )), [tasks])
  const reminderTasks = useMemo(() => tasks
    .filter((task) => task.planningExcluded)
    .sort((first, second) => first.title.localeCompare(second.title, 'fr', { sensitivity: 'base' })), [tasks])

  const groups = useMemo(() => {
    const groupMap = new Map()
    compartments.forEach((compartment) => groupMap.set(compartment.name, []))
    plannedTasks.forEach((task) => {
      const name = task.compartment || 'Sans compartiment'
      if (!groupMap.has(name)) groupMap.set(name, [])
      groupMap.get(name).push(task)
    })
    const compareTasks = (first, second) => {
      const compareTitles = () => first.title.localeCompare(second.title, 'fr', { sensitivity: 'base' })
      const compareStartDates = () => first.planningStartDate.localeCompare(second.planningStartDate)
      const comparePriorities = () => (
        (PRIORITY_RANK[first.priority] || 99) - (PRIORITY_RANK[second.priority] || 99)
      )

      if (planningTaskSort === 'alphabetical') {
        return compareTitles() || compareStartDates() || comparePriorities()
      }
      if (planningTaskSort === 'priority') {
        return comparePriorities() || compareStartDates() || compareTitles()
      }
      return compareStartDates() || comparePriorities() || compareTitles()
    }

    return Array.from(groupMap.entries())
      .filter(([, groupTasks]) => groupTasks.length > 0)
      .map(([groupName, groupTasks]) => [groupName, [...groupTasks].sort(compareTasks)])
  }, [compartments, plannedTasks, planningTaskSort])

  const getCompartmentColors = (compartmentName) => {
    const compartment = compartments.find((item) => item.name === compartmentName)
    return {
      bg: compartment?.color_bg || '#F1F5F9',
      text: compartment?.color_text || '#334155',
      border: compartment?.color_border || '#CBD5E1',
    }
  }

  const periodColorMap = useMemo(() => {
    const colorsById = new Map()
    const periodsByCreation = [...periods].sort((first, second) => {
      const firstKey = `${first.createdAt || ''}-${first.id}`
      const secondKey = `${second.createdAt || ''}-${second.id}`
      return firstKey.localeCompare(secondKey)
    })

    periodsByCreation.forEach((period, index) => {
      const hue = (262 + index * 137.508) % 360
      colorsById.set(period.id, {
        bg: `hsl(${hue} 62% 38%)`,
        border: `hsl(${hue} 72% 56%)`,
        accent: `hsl(${hue} 88% 90%)`,
      })
    })
    return colorsById
  }, [periods])

  const getPeriodColors = (period) => periodColorMap.get(period.id) || {
    bg: '#475569',
    border: '#64748B',
    accent: '#E2E8F0',
  }

  const monthSegments = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
    const timelineEnd = addDays(visibleEnd, 1)
    const segments = []
    let monthStart = new Date(viewStart.getFullYear(), viewStart.getMonth(), 1)

    while (monthStart < timelineEnd) {
      const nextMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
      const visibleMonthStart = monthStart < viewStart ? viewStart : monthStart
      const visibleMonthEnd = nextMonthStart > timelineEnd ? timelineEnd : nextMonthStart
      const left = diffDays(viewStart, visibleMonthStart) / 7 * config.weekWidth
      const width = diffDays(visibleMonthStart, visibleMonthEnd) / 7 * config.weekWidth

      segments.push({
        key: `${monthStart.getFullYear()}-${monthStart.getMonth()}`,
        label: formatter.format(monthStart),
        left,
        width,
      })
      monthStart = nextMonthStart
    }

    return segments
  }, [config.weekWidth, viewStart, visibleEnd])

  const todayOffset = diffDays(viewStart, new Date()) / 7 * config.weekWidth
  const todayVisible = todayOffset >= 0 && todayOffset <= timelineWidth

  const handleDragStart = (event, task) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-planning-task', JSON.stringify({
      id: task.id,
      durationWeeks: getDurationWeeks(task),
    }))
  }

  const handleDrop = (event) => {
    event.preventDefault()
    const payload = event.dataTransfer.getData('application/x-planning-task')
    if (!payload) return

    const { id, durationWeeks = 1 } = JSON.parse(payload)
    const rect = event.currentTarget.getBoundingClientRect()
    const weekIndex = Math.max(0, Math.min(
      config.weeks - 1,
      Math.floor((event.clientX - rect.left) / config.weekWidth),
    ))
    const start = addWeeks(viewStart, weekIndex)
    const end = addDays(start, durationWeeks * 7 - 1)
    onUpdateTask(id, {
      planningStartDate: toISODate(start),
      planningEndDate: toISODate(end),
    })
  }

  const handlePeriodDragStart = (event, period) => {
    event.dataTransfer.effectAllowed = 'move'
    const rect = event.currentTarget.getBoundingClientRect()
    event.dataTransfer.setData('application/x-planning-period', JSON.stringify({
      id: period.id,
      durationWeeks: getDurationWeeks({
        planningStartDate: period.startDate,
        planningEndDate: period.endDate,
      }),
      grabOffsetWeeks: Math.max(0, Math.floor((event.clientX - rect.left) / config.weekWidth)),
    }))
  }

  const handlePeriodDrop = (event) => {
    event.preventDefault()
    const payload = event.dataTransfer.getData('application/x-planning-period')
    if (!payload) return

    const { id, durationWeeks = 1, grabOffsetWeeks = 0 } = JSON.parse(payload)
    const rect = event.currentTarget.getBoundingClientRect()
    const weekIndex = Math.max(0, Math.min(
      config.weeks - 1,
      Math.floor((event.clientX - rect.left) / config.weekWidth) - grabOffsetWeeks,
    ))
    const start = addWeeks(viewStart, weekIndex)
    onUpdatePeriod(id, {
      startDate: toISODate(start),
      endDate: toISODate(addDays(start, durationWeeks * 7 - 1)),
    })
  }

  const startPeriodResize = (event, period, edge) => {
    event.preventDefault()
    event.stopPropagation()
    const start = startOfWeek(period.startDate)
    const end = endOfWeek(period.endDate)
    periodResizeRef.current = {
      id: period.id,
      edge,
      pointerStart: event.clientX,
      originalStart: start,
      originalEnd: end,
      currentStart: start,
      currentEnd: end,
    }
    setPeriodResizeDraft({ id: period.id, start, end })
  }

  const startResize = (event, task, edge) => {
    event.preventDefault()
    event.stopPropagation()
    const start = startOfWeek(task.planningStartDate)
    const end = endOfWeek(task.planningEndDate)
    resizeRef.current = {
      id: task.id,
      edge,
      pointerStart: event.clientX,
      originalStart: start,
      originalEnd: end,
      currentStart: start,
      currentEnd: end,
    }
    setResizeDraft({ id: task.id, start, end })
  }

  useEffect(() => {
    const handlePointerMove = (event) => {
      const resize = resizeRef.current
      if (!resize) return
      const deltaWeeks = Math.round((event.clientX - resize.pointerStart) / config.weekWidth)
      let nextStart = resize.originalStart
      let nextEnd = resize.originalEnd

      if (resize.edge === 'start') {
        nextStart = addWeeks(resize.originalStart, deltaWeeks)
        const lastAllowedStart = startOfWeek(resize.originalEnd)
        if (nextStart > lastAllowedStart) nextStart = lastAllowedStart
      } else {
        nextEnd = addWeeks(resize.originalEnd, deltaWeeks)
        const firstAllowedEnd = endOfWeek(resize.originalStart)
        if (nextEnd < firstAllowedEnd) nextEnd = firstAllowedEnd
      }

      resize.currentStart = nextStart
      resize.currentEnd = nextEnd
      setResizeDraft({ id: resize.id, start: nextStart, end: nextEnd })
    }

    const handlePointerUp = () => {
      const resize = resizeRef.current
      if (!resize) return
      onUpdateTask(resize.id, {
        planningStartDate: toISODate(resize.currentStart),
        planningEndDate: toISODate(resize.currentEnd),
      })
      resizeRef.current = null
      setResizeDraft(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [config.weekWidth, onUpdateTask])

  useEffect(() => {
    const handlePointerMove = (event) => {
      const resize = periodResizeRef.current
      if (!resize) return
      const deltaWeeks = Math.round((event.clientX - resize.pointerStart) / config.weekWidth)
      let nextStart = resize.originalStart
      let nextEnd = resize.originalEnd

      if (resize.edge === 'start') {
        nextStart = addWeeks(resize.originalStart, deltaWeeks)
        if (nextStart > startOfWeek(resize.originalEnd)) nextStart = startOfWeek(resize.originalEnd)
      } else {
        nextEnd = addWeeks(resize.originalEnd, deltaWeeks)
        if (nextEnd < endOfWeek(resize.originalStart)) nextEnd = endOfWeek(resize.originalStart)
      }

      resize.currentStart = nextStart
      resize.currentEnd = nextEnd
      setPeriodResizeDraft({ id: resize.id, start: nextStart, end: nextEnd })
    }

    const handlePointerUp = () => {
      const resize = periodResizeRef.current
      if (!resize) return
      onUpdatePeriod(resize.id, {
        startDate: toISODate(resize.currentStart),
        endDate: toISODate(resize.currentEnd),
      })
      periodResizeRef.current = null
      setPeriodResizeDraft(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [config.weekWidth, onUpdatePeriod])

  const renderTimelineGrid = (className = '', onDrop = handleDrop) => (
    <div
      className={`relative h-full ${className}`}
      style={{
        width: timelineWidth,
        backgroundImage: 'linear-gradient(to right, rgba(148,163,184,.2) 1px, transparent 1px)',
        backgroundSize: `${config.weekWidth}px 100%`,
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      {todayVisible && (
        <div
          className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-[#D64C4C]"
          style={{ left: todayOffset }}
          aria-label="Aujourd’hui"
        />
      )}
    </div>
  )

  const renderBar = (task) => {
    const draft = resizeDraft?.id === task.id ? resizeDraft : null
    const start = draft?.start || startOfWeek(task.planningStartDate)
    const end = draft?.end || endOfWeek(task.planningEndDate)
    const rawStart = diffDays(viewStart, start) / 7
    const rawEnd = (diffDays(viewStart, end) + 1) / 7
    const clippedStart = Math.max(0, rawStart)
    const clippedEnd = Math.min(config.weeks, rawEnd)
    if (clippedEnd <= 0 || clippedStart >= config.weeks || clippedEnd <= clippedStart) return null

    const colors = getCompartmentColors(task.compartment)
    const barLeft = clippedStart * config.weekWidth + 3
    const barWidth = Math.max(24, (clippedEnd - clippedStart) * config.weekWidth - 6)
    const subtaskMarkers = (task.subtasks || []).flatMap((subtask) => {
      const showInPlanning = typeof subtask.showInPlanning === 'boolean'
        ? subtask.showInPlanning
        : !!subtask.startDate
      if (!showInPlanning) return []
      if (!/^\d{4}-\d{2}-\d{2}$/.test(subtask.startDate || '')) return []
      const markerDate = parseDate(subtask.startDate)
      if (Number.isNaN(markerDate.getTime()) || markerDate < start || markerDate > end) return []
      if (markerDate < viewStart || markerDate > visibleEnd) return []

      const timelineLeft = diffDays(viewStart, markerDate) / 7 * config.weekWidth
      return [{
        ...subtask,
        left: Math.min(barWidth - 5, Math.max(5, timelineLeft - barLeft)),
      }]
    })
    const subtaskMarkerSummary = subtaskMarkers
      .map((subtask) => `${subtask.title} (${subtask.startDate})`)
      .join(', ')
    return (
      <div
        draggable={!draft}
        onDragStart={(event) => handleDragStart(event, task)}
        onClick={() => onOpenTask(task.id)}
        className={`absolute top-2 z-10 flex h-9 cursor-grab items-center overflow-hidden rounded-lg border text-xs font-semibold shadow-sm active:cursor-grabbing ${task.flagged ? 'ring-2 ring-[#D64C4C] ring-offset-1' : ''}`}
        style={{
          left: barLeft,
          width: barWidth,
          backgroundColor: colors.bg,
          color: colors.text,
          borderColor: colors.border,
        }}
        title={`${task.title} · ${formatWeekRange(task.planningStartDate, task.planningEndDate)}${subtaskMarkerSummary ? ` · Sous-tâches : ${subtaskMarkerSummary}` : ''}`}
      >
        {rawStart >= 0 && (
          <button
            type="button"
            onPointerDown={(event) => startResize(event, task, 'start')}
            onClick={(event) => event.stopPropagation()}
            className="flex h-full w-3 shrink-0 cursor-ew-resize items-center justify-center bg-black/5 hover:bg-black/10"
            aria-label={`Modifier le début de ${task.title}`}
          >
            <span className="h-4 w-0.5 rounded opacity-60" style={{ backgroundColor: colors.text }} />
          </button>
        )}
        {subtaskMarkers.map((subtask) => (
          <span
            key={subtask.id}
            role="img"
            className="absolute inset-y-0 z-20 w-3 -translate-x-1/2 cursor-help"
            style={{ left: subtask.left }}
            title={`${subtask.title} · ${subtask.startDate}`}
            aria-label={`${subtask.title}, début le ${subtask.startDate}`}
          >
            <span
              className="pointer-events-none absolute inset-y-1 left-1/2 w-0.5 -translate-x-1/2 rounded-full shadow-sm"
              style={{ backgroundColor: colors.text }}
            >
              <span
                className="absolute -left-[3px] -top-0.5 h-2 w-2 rotate-45 rounded-[2px] border bg-white"
                style={{ borderColor: colors.text }}
              />
            </span>
          </span>
        ))}
        <span className="min-w-0 flex-1 truncate px-2">{task.title}</span>
        {task.completion > 0 && <span className="pr-2 text-[10px] opacity-80">{task.completion}%</span>}
        {rawEnd <= config.weeks && (
          <button
            type="button"
            onPointerDown={(event) => startResize(event, task, 'end')}
            onClick={(event) => event.stopPropagation()}
            className="flex h-full w-3 shrink-0 cursor-ew-resize items-center justify-center bg-black/5 hover:bg-black/10"
            aria-label={`Modifier la fin de ${task.title}`}
          >
            <span className="h-4 w-0.5 rounded opacity-60" style={{ backgroundColor: colors.text }} />
          </button>
        )}
      </div>
    )
  }

  const renderPeriodBar = (period) => {
    const draft = periodResizeDraft?.id === period.id ? periodResizeDraft : null
    const start = draft?.start || startOfWeek(period.startDate)
    const end = draft?.end || endOfWeek(period.endDate)
    const rawStart = diffDays(viewStart, start) / 7
    const rawEnd = (diffDays(viewStart, end) + 1) / 7
    const clippedStart = Math.max(0, rawStart)
    const clippedEnd = Math.min(config.weeks, rawEnd)
    if (clippedEnd <= 0 || clippedStart >= config.weeks || clippedEnd <= clippedStart) return null
    const colors = getPeriodColors(period)

    return (
      <div
        key={period.id}
        draggable={!draft}
        onDragStart={(event) => handlePeriodDragStart(event, period)}
        onClick={() => setPeriodEditor(period)}
        className="absolute top-2 z-10 flex h-8 cursor-grab items-center overflow-hidden rounded-md border text-xs font-bold text-white shadow-sm active:cursor-grabbing"
        style={{
          left: clippedStart * config.weekWidth + 3,
          width: Math.max(24, (clippedEnd - clippedStart) * config.weekWidth - 6),
          backgroundColor: colors.bg,
          borderColor: colors.border,
        }}
        title={`${period.title} · ${formatWeekRange(period.startDate, period.endDate)}`}
      >
        {rawStart >= 0 && (
          <button type="button" onPointerDown={(event) => startPeriodResize(event, period, 'start')} onClick={(event) => event.stopPropagation()} className="flex h-full w-3 shrink-0 cursor-ew-resize items-center justify-center bg-white/10 hover:bg-white/20" aria-label={`Modifier le début de ${period.title}`}>
            <span className="h-4 w-0.5 rounded" style={{ backgroundColor: colors.accent }} />
          </button>
        )}
        <CalendarRange className="ml-2 h-3.5 w-3.5 shrink-0" style={{ color: colors.accent }} />
        <span className="min-w-0 flex-1 truncate px-1.5">{period.title}</span>
        {rawEnd <= config.weeks && (
          <button type="button" onPointerDown={(event) => startPeriodResize(event, period, 'end')} onClick={(event) => event.stopPropagation()} className="flex h-full w-3 shrink-0 cursor-ew-resize items-center justify-center bg-white/10 hover:bg-white/20" aria-label={`Modifier la fin de ${period.title}`}>
            <span className="h-4 w-0.5 rounded" style={{ backgroundColor: colors.accent }} />
          </button>
        )}
      </div>
    )
  }

  const shiftTask = (task, weeksToAdd) => {
    onUpdateTask(task.id, {
      planningStartDate: toISODate(addWeeks(task.planningStartDate, weeksToAdd)),
      planningEndDate: toISODate(addWeeks(task.planningEndDate, weeksToAdd)),
    })
  }

  const shiftPeriod = (period, weeksToAdd) => {
    onUpdatePeriod(period.id, {
      startDate: toISODate(addWeeks(period.startDate, weeksToAdd)),
      endDate: toISODate(addWeeks(period.endDate, weeksToAdd)),
    })
  }

  const mobileGroups = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
    const sortedTasks = groups.flatMap(([, groupTasks]) => groupTasks)
    return sortedTasks.reduce((result, task) => {
      const label = formatter.format(parseDate(task.planningStartDate))
      if (!result[label]) result[label] = []
      result[label].push(task)
      return result
    }, {})
  }, [groups])

  return (
    <section className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6" aria-labelledby="planning-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="planning-title" className="font-display text-xl font-extrabold text-slate-900 dark:text-white">Planning</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Positionnement précis à la semaine, lecture macro sur plusieurs mois.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <span className="sr-only">Trier les tâches du planning</span>
            <select
              value={planningTaskSort}
              onChange={(event) => setPlanningTaskSort(event.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none dark:text-slate-200"
              aria-label="Trier les tâches du planning"
            >
              <option value="startDate">Date de début</option>
              <option value="alphabetical">Alphabétique</option>
              <option value="priority">Priorité P1 → P5</option>
            </select>
          </label>
          <button type="button" onClick={() => setPeriodEditor({ mode: 'new' })} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-700">
            <Plus className="h-3.5 w-3.5" /> Nouvelle période
          </button>
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <button type="button" onClick={() => setViewStart((date) => addWeeks(date, -config.step))} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Période précédente">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setViewStart(addWeeks(startOfWeek(), -1))} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
              <LocateFixed className="h-3.5 w-3.5" /> Aujourd’hui
            </button>
            <button type="button" onClick={() => setViewStart((date) => addWeeks(date, config.step))} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Période suivante">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800" aria-label="Zoom du planning">
            {Object.entries(ZOOM_CONFIG).map(([value, option]) => (
              <button
                key={value}
                type="button"
                onClick={() => onZoomChange(value)}
                className={`rounded-lg px-2.5 py-2 text-xs font-semibold ${zoom === value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/15" aria-labelledby="planning-unplanned-title">
        <button
          type="button"
          onClick={() => setUnplannedCollapsed((current) => !current)}
          disabled={unplannedTasks.length === 0}
          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400 disabled:cursor-default"
          aria-expanded={unplannedTasks.length > 0 ? !unplannedCollapsed : undefined}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              <GripVertical className="h-3.5 w-3.5" />
            </span>
            <span>
              <span id="planning-unplanned-title" className="block text-sm font-bold text-blue-950 dark:text-blue-100">À planifier</span>
              <span className="block text-[11px] text-blue-700/70 dark:text-blue-300/70">
                {unplannedTasks.length > 0 ? 'Glissez une tâche sur la frise' : 'Toutes les tâches actives sont planifiées'}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
            {unplannedTasks.length}
            {unplannedTasks.length > 0 && <ChevronDown className={`h-4 w-4 transition-transform ${unplannedCollapsed ? '-rotate-90' : ''}`} />}
          </span>
        </button>

        {unplannedTasks.length > 0 && !unplannedCollapsed && (
          <div className="scrollbar-subtle flex max-h-[7.5rem] flex-wrap content-start gap-2 overflow-y-auto border-t border-blue-200 px-3 py-2 dark:border-blue-900">
            {unplannedTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                draggable
                onDragStart={(event) => handleDragStart(event, task)}
                onClick={() => onOpenTask(task.id)}
                className="inline-flex shrink-0 cursor-grab items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 shadow-sm hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <GripVertical className="h-3.5 w-3.5 text-slate-400" />
                <span className="max-w-48 truncate">{task.title}</span>
                <span
                  className="max-w-28 truncate rounded-md border px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: getCompartmentColors(task.compartment).bg,
                    color: getCompartmentColors(task.compartment).text,
                    borderColor: getCompartmentColors(task.compartment).border,
                  }}
                >
                  {task.compartment || 'Sans compartiment'}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {reminderTasks.length > 0 && (
        <section className="mt-3 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/15" aria-labelledby="planning-reminders-title">
          <button
            type="button"
            onClick={() => setRemindersCollapsed((current) => !current)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-400"
            aria-expanded={!remindersCollapsed}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                <StickyNote className="h-3.5 w-3.5" />
              </span>
              <span>
                <span id="planning-reminders-title" className="block text-sm font-bold text-amber-900 dark:text-amber-100">Pense-bêtes</span>
                <span className="block text-[11px] text-amber-700/70 dark:text-amber-300/70">Repères sans date de planification</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
              {reminderTasks.length}
              <ChevronDown className={`h-4 w-4 transition-transform ${remindersCollapsed ? '-rotate-90' : ''}`} />
            </span>
          </button>

          {!remindersCollapsed && (
            <div className="scrollbar-subtle flex max-h-[5.75rem] flex-wrap content-start gap-2 overflow-y-auto border-t border-amber-200 px-3 py-2 dark:border-amber-900">
              {reminderTasks.map((task) => {
                const colors = getCompartmentColors(task.compartment)
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onOpenTask(task.id)}
                    className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 shadow-sm hover:border-amber-300 dark:border-amber-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <StickyNote className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span className="max-w-48 truncate">{task.title}</span>
                    <span className="max-w-28 truncate rounded-md border px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}>
                      {task.compartment || 'Sans compartiment'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}

      <div className="mt-4 hidden md:block">
        <div className="relative rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div
            className="sticky z-40 grid overflow-hidden rounded-t-2xl border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
            style={{ top: toolbarHeight, gridTemplateColumns: '260px minmax(0, 1fr)' }}
          >
            <div className="flex items-center border-r border-slate-200 bg-slate-50 px-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-400 dark:border-slate-700 dark:bg-slate-900">Tâches</div>
            <div className="overflow-hidden">
              <div ref={calendarTrackRef} style={{ width: timelineWidth, willChange: 'transform' }}>
                <div className="relative h-8 border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  {monthSegments.map((segment) => (
                    <div key={segment.key} className="absolute inset-y-0 flex items-center overflow-hidden border-l border-slate-400 px-2 text-xs font-bold capitalize text-slate-600 dark:border-slate-500 dark:text-slate-300" style={{ left: segment.left, width: segment.width }}>
                      {segment.label}
                    </div>
                  ))}
                </div>
                <div className="flex h-8 bg-white dark:bg-slate-900">
                  {weeks.map((week) => (
                    <div key={toISODate(week)} className="flex shrink-0 items-center justify-start border-r border-slate-100 px-1 text-[10px] font-semibold text-slate-400 dark:border-slate-800" style={{ width: config.weekWidth }}>
                      {formatWeekStart(week)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div ref={timelineScrollRef} onScroll={syncCalendarScroll} className="scrollbar-subtle overflow-x-auto rounded-b-2xl">
            <div style={{ minWidth: 260 + timelineWidth }}>

            <div className="grid h-12 border-b border-violet-200 bg-violet-50/40 dark:border-violet-900 dark:bg-violet-950/10" style={{ gridTemplateColumns: `260px ${timelineWidth}px` }}>
              <div className="sticky left-0 z-30 flex items-center justify-between border-r border-violet-200 bg-violet-50 px-4 dark:border-violet-900 dark:bg-violet-950/40">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-800 dark:text-violet-200">
                  <CalendarRange className="h-3.5 w-3.5" /> Périodes
                </div>
                <button type="button" onClick={() => setPeriodEditor({ mode: 'new' })} className="rounded-lg p-1.5 text-violet-600 hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-900" aria-label="Ajouter une période">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="relative" onDragOver={(event) => event.preventDefault()} onDrop={handlePeriodDrop}>
                {renderTimelineGrid('bg-violet-50/20 dark:bg-violet-950/10', (event) => event.preventDefault())}
                {periods.map(renderPeriodBar)}
                {!periodsLoading && periods.length === 0 && !periodsError && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-violet-400">Ajoutez une première période.</span>
                )}
                {periodsError && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-red-500">Appliquez la migration des périodes pour activer cette ligne.</span>
                )}
              </div>
            </div>

            {groups.map(([groupName, groupTasks]) => {
              const colors = getCompartmentColors(groupName)
              const isCollapsed = collapsedCompartments.has(groupName)
              return (
                <React.Fragment key={groupName}>
                  <div className="grid h-10 border-b border-slate-200 dark:border-slate-700" style={{ gridTemplateColumns: `260px ${timelineWidth}px` }}>
                    <button
                      type="button"
                      onClick={() => toggleCompartment(groupName)}
                      className="sticky left-0 z-30 flex items-center justify-between border-r px-4 text-left text-xs font-bold focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400"
                      style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
                      aria-expanded={!isCollapsed}
                      aria-label={`${isCollapsed ? 'Déplier' : 'Replier'} le compartiment ${groupName}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                        <span className="truncate">{groupName}</span>
                      </span>
                      <span className="opacity-60">{groupTasks.length}</span>
                    </button>
                    <button type="button" onClick={() => toggleCompartment(groupName)} style={{ backgroundColor: colors.bg }} className="opacity-50" aria-label={`${isCollapsed ? 'Déplier' : 'Replier'} le compartiment ${groupName}`} tabIndex={-1} />
                  </div>
                  {!isCollapsed && groupTasks.map((task) => (
                    <div key={task.id} className="grid h-14 border-b border-slate-100 last:border-b-0 dark:border-slate-800" style={{ gridTemplateColumns: `260px ${timelineWidth}px` }}>
                      <div className="sticky left-0 z-30 flex min-w-0 items-center gap-2 border-r border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
                        <button type="button" onClick={() => onOpenTask(task.id)} className="min-w-0 flex-1 text-left">
                          <span className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{task.title}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-slate-400">{task.priority} · {STATUS_LABELS[task.status]}</span>
                        </button>
                        <button type="button" onClick={() => onUpdateTask(task.id, { planningStartDate: null, planningEndDate: null })} className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950" aria-label={`Retirer ${task.title} du planning`}>
                          <CalendarX className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="relative">
                        {renderTimelineGrid()}
                        {renderBar(task)}
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              )
            })}

            {plannedTasks.length === 0 && (
              <div className="grid h-28" style={{ gridTemplateColumns: `260px ${timelineWidth}px` }}>
                <div className="sticky left-0 z-30 border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
                <div className="flex items-center justify-center text-sm text-slate-400">Glissez une première tâche sur la frise.</div>
              </div>
            )}
          </div>
        </div>
        </div>
        <StickyBoardScrollbar
          targetRef={timelineScrollRef}
          contentKey={`${zoom}-${plannedTasks.length}`}
          ariaLabel="Défilement horizontal du planning"
        />
      </div>

      <div className="mt-4 space-y-5 md:hidden">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-violet-700 dark:text-violet-300">Périodes</h3>
            <button type="button" onClick={() => setPeriodEditor({ mode: 'new' })} className="inline-flex items-center gap-1 rounded-lg bg-violet-100 px-2.5 py-1.5 text-xs font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300"><Plus className="h-3 w-3" /> Ajouter</button>
          </div>
          <div className="space-y-2">
            {periods.map((period) => {
              const colors = getPeriodColors(period)
              return <div key={period.id} className="rounded-xl border bg-white p-3 dark:bg-slate-900" style={{ borderColor: colors.border }}>
                <button type="button" onClick={() => setPeriodEditor(period)} className="w-full text-left">
                  <span className="block text-sm font-bold" style={{ color: colors.bg }}>{period.title}</span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{formatWeekRange(period.startDate, period.endDate)}</span>
                </button>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => shiftPeriod(period, -1)} className="rounded-lg border px-2 py-1 text-xs" style={{ borderColor: colors.border }}>− 1 sem.</button>
                  <button type="button" onClick={() => shiftPeriod(period, 1)} className="rounded-lg border px-2 py-1 text-xs" style={{ borderColor: colors.border }}>+ 1 sem.</button>
                </div>
              </div>
            })}
          </div>
        </div>
        {Object.entries(mobileGroups).map(([month, monthTasks]) => (
          <div key={month}>
            <h3 className="font-display mb-2 text-sm font-bold capitalize text-slate-500 dark:text-slate-300">{month}</h3>
            <div className="space-y-2">
              {monthTasks.map((task) => (
                <div key={task.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <button type="button" onClick={() => onOpenTask(task.id)} className="w-full text-left">
                    <span className="block text-sm font-semibold text-slate-900 dark:text-white">{task.title}</span>
                    <span className="mt-1 block text-xs text-slate-500">{formatWeekRange(task.planningStartDate, task.planningEndDate)} · {task.compartment}</span>
                  </button>
                  <div className="mt-3 flex items-center gap-2">
                    <button type="button" onClick={() => shiftTask(task, -1)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-700">− 1 sem.</button>
                    <button type="button" onClick={() => shiftTask(task, 1)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-700">+ 1 sem.</button>
                    <button type="button" onClick={() => onUpdateTask(task.id, { planningStartDate: null, planningEndDate: null })} className="ml-auto text-xs font-semibold text-red-500">Retirer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-400">Période visible : {formatWeekRange(toISODate(viewStart), toISODate(visibleEnd))}</p>

      {periodEditor && (
        <PlanningPeriodModal
          period={periodEditor.mode === 'new' ? null : periodEditor}
          initialStartDate={toISODate(todayVisible ? startOfWeek() : viewStart)}
          initialEndDate={toISODate(addDays(todayVisible ? startOfWeek() : viewStart, 27))}
          onSave={(data) => periodEditor.mode === 'new'
            ? onCreatePeriod(data)
            : onUpdatePeriod(periodEditor.id, data)}
          onDelete={async () => {
            await onDeletePeriod(periodEditor.id)
            setPeriodEditor(null)
          }}
          onClose={() => setPeriodEditor(null)}
        />
      )}
    </section>
  )
}

export default PlanningView
