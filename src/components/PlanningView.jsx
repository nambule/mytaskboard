import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarX,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  LocateFixed,
} from 'lucide-react'
import StickyBoardScrollbar from './StickyBoardScrollbar'
import { STATUS_LABELS } from '../utils/constants'

const DAY_MS = 24 * 60 * 60 * 1000
const ZOOM_CONFIG = {
  '1m': { label: '1 mois', weeks: 6, step: 4, weekWidth: 132 },
  '3m': { label: '3 mois', weeks: 14, step: 13, weekWidth: 88 },
  '6m': { label: '6 mois', weeks: 27, step: 26, weekWidth: 58 },
  '1y': { label: '1 an', weeks: 53, step: 52, weekWidth: 34 },
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
  zoom,
  onZoomChange,
  onUpdateTask,
  onOpenTask,
}) => {
  const timelineScrollRef = useRef(null)
  const resizeRef = useRef(null)
  const [resizeDraft, setResizeDraft] = useState(null)
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
    try {
      sessionStorage.setItem('kanban-planning-start', toISODate(viewStart))
    } catch (_) {
      // La timeline reste utilisable même si le stockage de session est indisponible.
    }
  }, [viewStart])

  const plannedTasks = useMemo(() => tasks
    .filter((task) => !task.planningExcluded && task.planningStartDate && task.planningEndDate)
    .sort((a, b) => a.planningStartDate.localeCompare(b.planningStartDate)), [tasks])
  const unplannedTasks = useMemo(() => tasks
    .filter((task) => (
      task.status !== 'Done'
      && task.status !== 'Cancelled'
      && !task.planningExcluded
      && (!task.planningStartDate || !task.planningEndDate)
    )), [tasks])

  const groups = useMemo(() => {
    const groupMap = new Map()
    compartments.forEach((compartment) => groupMap.set(compartment.name, []))
    plannedTasks.forEach((task) => {
      const name = task.compartment || 'Sans compartiment'
      if (!groupMap.has(name)) groupMap.set(name, [])
      groupMap.get(name).push(task)
    })
    return Array.from(groupMap.entries()).filter(([, groupTasks]) => groupTasks.length > 0)
  }, [compartments, plannedTasks])

  const getCompartmentColors = (compartmentName) => {
    const compartment = compartments.find((item) => item.name === compartmentName)
    return {
      bg: compartment?.color_bg || '#F1F5F9',
      text: compartment?.color_text || '#334155',
      border: compartment?.color_border || '#CBD5E1',
    }
  }

  const monthSegments = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
    return weeks.reduce((segments, week, index) => {
      const key = `${week.getFullYear()}-${week.getMonth()}`
      const previous = segments[segments.length - 1]
      if (previous?.key === key) {
        previous.count += 1
      } else {
        segments.push({ key, label: formatter.format(week), start: index, count: 1 })
      }
      return segments
    }, [])
  }, [weeks])

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

  const renderTimelineGrid = (className = '') => (
    <div
      className={`relative h-full ${className}`}
      style={{
        width: timelineWidth,
        backgroundImage: 'linear-gradient(to right, rgba(148,163,184,.2) 1px, transparent 1px)',
        backgroundSize: `${config.weekWidth}px 100%`,
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
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
    return (
      <div
        draggable={!draft}
        onDragStart={(event) => handleDragStart(event, task)}
        onClick={() => onOpenTask(task.id)}
        className={`absolute top-2 z-10 flex h-9 cursor-grab items-center overflow-hidden rounded-lg border text-xs font-semibold shadow-sm active:cursor-grabbing ${task.flagged ? 'ring-2 ring-[#D64C4C] ring-offset-1' : ''}`}
        style={{
          left: clippedStart * config.weekWidth + 3,
          width: Math.max(24, (clippedEnd - clippedStart) * config.weekWidth - 6),
          backgroundColor: colors.bg,
          color: colors.text,
          borderColor: colors.border,
        }}
        title={`${task.title} · ${formatWeekRange(task.planningStartDate, task.planningEndDate)}`}
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

  const shiftTask = (task, weeksToAdd) => {
    onUpdateTask(task.id, {
      planningStartDate: toISODate(addWeeks(task.planningStartDate, weeksToAdd)),
      planningEndDate: toISODate(addWeeks(task.planningEndDate, weeksToAdd)),
    })
  }

  const mobileGroups = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
    return plannedTasks.reduce((result, task) => {
      const label = formatter.format(parseDate(task.planningStartDate))
      if (!result[label]) result[label] = []
      result[label].push(task)
      return result
    }, {})
  }, [plannedTasks])

  return (
    <section className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6" aria-labelledby="planning-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="planning-title" className="font-display text-xl font-extrabold text-slate-900 dark:text-white">Planning</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Positionnement précis à la semaine, lecture macro sur plusieurs mois.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">À planifier</h3>
            <p className="text-xs text-slate-500">Glissez une tâche sur la frise pour lui attribuer une semaine.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800">{unplannedTasks.length}</span>
        </div>
        <div className="scrollbar-subtle mt-3 flex max-h-[7.5rem] flex-wrap content-start gap-2 overflow-y-auto pb-1 pr-1">
          {unplannedTasks.map((task) => (
            <button
              key={task.id}
              type="button"
              draggable
              onDragStart={(event) => handleDragStart(event, task)}
              onClick={() => onOpenTask(task.id)}
              className="inline-flex shrink-0 cursor-grab items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
          {unplannedTasks.length === 0 && <p className="py-2 text-xs text-slate-400">Toutes les tâches actives visibles sont planifiées.</p>}
        </div>
      </div>

      <div className="mt-4 hidden md:block">
        <div ref={timelineScrollRef} className="scrollbar-subtle overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div style={{ minWidth: 260 + timelineWidth }}>
            <div className="grid border-b border-slate-200 dark:border-slate-700" style={{ gridTemplateColumns: `260px ${timelineWidth}px` }}>
              <div className="sticky left-0 z-30 flex items-center border-r border-slate-200 bg-slate-50 px-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-400 dark:border-slate-700 dark:bg-slate-900">Tâches</div>
              <div>
                <div className="relative h-8 border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  {monthSegments.map((segment) => (
                    <div key={segment.key} className="absolute inset-y-0 flex items-center border-r border-slate-300 px-2 text-xs font-bold capitalize text-slate-600 dark:border-slate-600 dark:text-slate-300" style={{ left: segment.start * config.weekWidth, width: segment.count * config.weekWidth }}>
                      {segment.label}
                    </div>
                  ))}
                </div>
                <div className="flex h-8 bg-white dark:bg-slate-900">
                  {weeks.map((week) => (
                    <div key={toISODate(week)} className="flex shrink-0 items-center justify-center border-r border-slate-100 text-[10px] font-semibold text-slate-400 dark:border-slate-800" style={{ width: config.weekWidth }}>
                      S{String(Math.ceil((((week - new Date(week.getFullYear(), 0, 1)) / DAY_MS) + new Date(week.getFullYear(), 0, 1).getDay() + 1) / 7)).padStart(2, '0')}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {groups.map(([groupName, groupTasks]) => {
              const colors = getCompartmentColors(groupName)
              return (
                <React.Fragment key={groupName}>
                  <div className="grid h-10 border-b border-slate-200 dark:border-slate-700" style={{ gridTemplateColumns: `260px ${timelineWidth}px` }}>
                    <div className="sticky left-0 z-30 flex items-center justify-between border-r px-4 text-xs font-bold" style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}>
                      <span>{groupName}</span><span className="opacity-60">{groupTasks.length}</span>
                    </div>
                    <div style={{ backgroundColor: colors.bg }} className="opacity-50" />
                  </div>
                  {groupTasks.map((task) => (
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
        <StickyBoardScrollbar targetRef={timelineScrollRef} contentKey={`${zoom}-${plannedTasks.length}`} />
      </div>

      <div className="mt-4 space-y-5 md:hidden">
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
        {unplannedTasks.length > 0 && (
          <div>
            <h3 className="font-display mb-2 text-sm font-bold text-slate-500 dark:text-slate-300">À planifier</h3>
            <div className="space-y-2">
              {unplannedTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <button type="button" onClick={() => onOpenTask(task.id)} className="min-w-0 flex-1 truncate text-left text-sm font-semibold">{task.title}</button>
                  <button type="button" onClick={() => {
                    const start = startOfWeek()
                    onUpdateTask(task.id, { planningStartDate: toISODate(start), planningEndDate: toISODate(endOfWeek(start)) })
                  }} className="shrink-0 rounded-lg bg-[#356AE6] px-3 py-1.5 text-xs font-semibold text-white">Cette semaine</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-400">Période visible : {formatWeekRange(toISODate(viewStart), toISODate(visibleEnd))}</p>
    </section>
  )
}

export default PlanningView
