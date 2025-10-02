import React, { useState } from 'react'
import { Plus, X, Star, Check } from 'lucide-react'
import { Select, SelectTrigger, SelectContent, SelectItem } from './ui/Select'
import DateRangePicker from './ui/DateRangePicker'
import { 
  PRIORITIES, 
  STATUSES, 
  SIZES,
  WHEN_OPTIONS,
  PRIORITY_STYLES,
  PRIORITY_DOT,
  STATUS_COLORS,
  SIZE_COLORS,
  WHEN_COLORS
} from '../utils/constants'
import { badgeStyle, styleWhen } from '../utils/helpers'

let confettiModule
const loadConfetti = async () => {
  if (typeof window === 'undefined') return null
  if (!confettiModule) {
    confettiModule = import('canvas-confetti').then(mod => mod.default || mod)
  }
  return confettiModule
}

/**
 * Modale pour créer/éditer une tâche
 */
const TaskModal = ({ 
  onClose, 
  onSave, 
  onDelete, 
  tasks = {}, 
  editingId, 
  initialColumn, 
  groupBy,
  compartments = [],
  prefillTitle = "", 
  fromQuickId = null,
  loading = false,
  showSchedulingFields = false
}) => {
  const editing = editingId ? tasks[editingId] : null
  
  const [title, setTitle] = useState(editing?.title || prefillTitle || "")
  const [priority, setPriority] = useState(
    editing?.priority || 
    (groupBy === "priority" && PRIORITIES.includes(initialColumn) ? initialColumn : "P3")
  )
  const [compartment, setCompartment] = useState(
    editing?.compartment || 
    (fromQuickId ? "" : (groupBy === "compartment" && compartments.includes(initialColumn) ? initialColumn : compartments[0] || ""))
  )
  const [status, setStatus] = useState(
    editing?.status || 
    (groupBy === "status" && STATUSES.includes(initialColumn) ? initialColumn : "To Do")
  )
  const [size, setSize] = useState(editing?.size || "M")
  const [when, setWhen] = useState(editing?.when || "")
  const [note, setNote] = useState(editing?.note || "")
  const [dueDate, setDueDate] = useState(editing?.dueDate || "")
  const [startDate, setStartDate] = useState(editing?.startDate || "")
  const [hours, setHours] = useState(editing?.hours || "")
  const [timeAllocation, setTimeAllocation] = useState(editing?.timeAllocation || "one shot")
  const [flagged, setFlagged] = useState(!!editing?.flagged)
  const [completion, setCompletion] = useState(editing?.completion || 0)
  
  // Normaliser les sous-tâches
  const normalizeSubtasks = (arr) => 
    (arr || []).map((s) => ({
      ...s, 
      status: s.status || (s.done ? "Done" : "To Do"),
      nextAction: s.nextAction || false
    }))
  
  const [subtasks, setSubtasks] = useState(normalizeSubtasks(editing?.subtasks || []))
  const [subInput, setSubInput] = useState("")

  const isActionDisabled = loading || !title.trim() || (fromQuickId && !compartment)

  const handleAddSubtask = () => {
    if (!subInput.trim()) return
    setSubtasks(prev => [...prev, { 
      id: Math.random().toString(36).slice(2, 10), 
      title: subInput.trim(), 
      status: "To Do",
      nextAction: false
    }])
    setSubInput("")
  }

  const handleSubtaskKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddSubtask()
    }
  }

  const handleRemoveSubtask = (id) => {
    setSubtasks(prev => prev.filter(x => x.id !== id))
  }

  const handleSubtaskStatusChange = (subId, newStatus) => {
    setSubtasks(prev => prev.map(x => x.id === subId ? { ...x, status: newStatus } : x))
  }

  const handleSetNextAction = (subId) => {
    setSubtasks(prev => prev.map(x => {
      if (x.id === subId) {
        // Toggle: if already next action, unselect it; otherwise select it
        return { ...x, nextAction: !x.nextAction }
      } else {
        // Clear next action from all other subtasks
        return { ...x, nextAction: false }
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!title.trim()) return
    if (fromQuickId && !compartment) return
    
    const taskData = {
      id: editing?.id,
      title: title.trim(),
      priority,
      compartment,
      status,
      size,
      when,
      note,
      dueDate,
      startDate,
      hours,
      timeAllocation,
      flagged,
      subtasks,
      completion,
      fromQuickId
    }
    
    try {
      await onSave(taskData)
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
    }
  }

  const handleMarkAsDone = async () => {
    if (!editing) return
    if (!title.trim()) return
    if (fromQuickId && !compartment) return

    const doneSubtasks = subtasks.map((sub) => ({
      ...sub,
      status: 'Done',
      nextAction: false
    }))

    const taskData = {
      id: editing?.id,
      title: title.trim(),
      priority,
      compartment,
      status: 'Done',
      size,
      when,
      note,
      dueDate,
      startDate,
      hours,
      timeAllocation,
      flagged,
      subtasks: doneSubtasks,
      completion: 100,
      fromQuickId
    }

    try {
      await onSave(taskData)

      try {
        const confetti = await loadConfetti()
        if (confetti) {
          confetti({ particleCount: 90, spread: 65, origin: { y: 0.6 } })
          confetti({ particleCount: 45, spread: 100, decay: 0.92, scalar: 0.8, origin: { y: 0.6 } })
        }
      } catch (confettiError) {
        console.error('Erreur lors du lancement des confettis:', confettiError)
      }
    } catch (error) {
      console.error('Erreur lors du marquage comme terminé:', error)
    }
  }

  const handleDelete = async () => {
    if (!editingId) return
    
    try {
      await onDelete(editingId)
      onClose()
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" 
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }} 
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }} 
      tabIndex={-1}
    >
      <div className="w-full max-w-xl max-h-[calc(100vh-2rem)] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col min-h-0 max-h-full">
          {/* En-tête */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="font-semibold">
              {editing ? "Edit Task" : "New Task"}
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Contenu scrollable */}
          <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
            {/* Titre */}
            <div>
              <label className="text-sm text-slate-600">Title</label>
              <input 
                autoFocus 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="e.g. Export to portal"
                disabled={loading}
              />
            </div>

            {/* Priorité et Compartiment */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-600">Priority</label>
                <div className="mt-1">
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="w-full rounded-xl border border-slate-300 px-2 py-2">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-md border text-xs ${PRIORITY_STYLES[priority]}`}>
                          <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[priority]}`}></span>
                          {priority}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-slate-200">
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-md border text-xs ${PRIORITY_STYLES[p]}`}>
                            <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[p]}`}></span>
                            {p}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-600">Department</label>
                <select 
                  value={compartment} 
                  onChange={(e) => setCompartment(e.target.value)} 
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" 
                  required={!!fromQuickId}
                  disabled={loading}
                >
                  {fromQuickId && (<option value="">— choisir —</option>)}
                  {compartments.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Statut et Charge */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-600">Status</label>
                <div className="mt-1">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-full rounded-xl border border-slate-300 px-2 py-2">
                      <div className="flex items-center">
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" 
                          style={badgeStyle(STATUS_COLORS[status])}
                        >
                          {status}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-slate-200">
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" 
                            style={badgeStyle(STATUS_COLORS[s])}
                          >
                            {s}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-600">Size (T-shirt)</label>
                <div className="mt-1">
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger className="w-full rounded-xl border border-slate-300 px-2 py-2">
                      <div className="flex items-center">
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" 
                          style={badgeStyle(SIZE_COLORS[size])}
                        >
                          {size}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-slate-200">
                      {SIZES.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" 
                            style={badgeStyle(SIZE_COLORS[s])}
                          >
                            {s}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Next Action (When) */}
            <div>
              <label className="text-sm text-slate-600">Next action</label>
              <div className="mt-1">
                <Select value={when} onValueChange={setWhen}>
                  <SelectTrigger className="w-full rounded-xl border border-slate-300 px-2 py-2">
                    <div className="flex items-center">
                      <span 
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" 
                        style={styleWhen(when)}
                      >
                        {when || "To be defined"}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-slate-200">
                    {/* Option de vidage */}
                    <SelectItem value="">
                      <span 
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" 
                        style={styleWhen("")}
                      >
                        To be defined
                      </span>
                    </SelectItem>
                    {WHEN_OPTIONS.filter(x => x !== "").map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" 
                          style={styleWhen(opt)}
                        >
                          {opt}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {showSchedulingFields && (
              <div>
                <DateRangePicker
                  startDate={startDate}
                  endDate={dueDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setDueDate}
                  disabled={loading}
                />
              </div>
            )}

            {showSchedulingFields && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600">Hours</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.5"
                    value={hours} 
                    onChange={(e) => setHours(e.target.value)} 
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                    placeholder="e.g. 8 or 2.5"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600">Time Allocation</label>
                  <div className="mt-1">
                    <Select value={timeAllocation} onValueChange={setTimeAllocation}>
                      <SelectTrigger className="w-full rounded-xl border border-slate-300 px-3 py-2">
                        <span className="text-sm">
                          {timeAllocation === "one shot" && "One Shot"}
                          {timeAllocation === "per week" && "Per Week"}
                          {timeAllocation === "per 2 weeks" && "Per 2 Weeks"}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-slate-200">
                        <SelectItem value="one shot">
                          <span className="text-sm">One Shot</span>
                        </SelectItem>
                        <SelectItem value="per week">
                          <span className="text-sm">Per Week</span>
                        </SelectItem>
                        <SelectItem value="per 2 weeks">
                          <span className="text-sm">Per 2 Weeks</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className={`flex ${showSchedulingFields ? 'items-center justify-between' : 'justify-end'} flex-wrap gap-4`}>
              {showSchedulingFields && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Total Time:</span>
                    <span className="text-sm font-medium text-slate-900 bg-slate-100 px-2 py-1 rounded">
                      {(() => {
                        const hoursValue = parseFloat(hours) || 0
                        if (hoursValue === 0) return "Not specified"
                        
                        if (timeAllocation === "one shot") {
                          return `${hoursValue}h`
                        }
                        
                        let weeks = 1
                        if (startDate && dueDate) {
                          const start = new Date(startDate)
                          const due = new Date(dueDate)
                          if (due >= start) {
                            const diffTime = Math.abs(due - start)
                            const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
                            weeks = Math.max(1, diffWeeks)
                          }
                        }
                        
                        if (timeAllocation === "per week") {
                          const totalHours = hoursValue * weeks
                          return `${totalHours}h`
                        }
                        
                        if (timeAllocation === "per 2 weeks") {
                          const periods = Math.ceil(weeks / 2)
                          const totalHours = hoursValue * periods
                          return `${totalHours}h`
                        }
                        
                        return `${hoursValue}h`
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Duration:</span>
                    <span className="text-sm font-medium text-slate-900 bg-slate-100 px-2 py-1 rounded">
                      {(() => {
                        if (startDate && dueDate) {
                          const start = new Date(startDate)
                          const due = new Date(dueDate)
                          if (due >= start) {
                            const diffTime = Math.abs(due - start)
                            const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
                            const weeks = Math.max(1, diffWeeks)
                            return weeks === 1 ? "1 week" : `${weeks} weeks`
                          }
                        }
                        return "Not specified"
                      })()}
                    </span>
                  </div>
                </div>
              )}
              <label className="inline-flex items-center gap-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={flagged} 
                  onChange={() => setFlagged(f => !f)}
                  disabled={loading}
                />
                Mark as at risk
              </label>
            </div>

            {/* Note */}
            <div>
              <label className="text-sm text-slate-600">Note</label>
              <textarea 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                placeholder="Internal note (not displayed on board)" 
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 h-28"
                disabled={loading}
              />
            </div>

            {/* Completion Gauge */}
            <div>
              <label className="text-sm text-slate-600 mb-3 block">Task Progress</label>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>0%</span>
                  <span className="font-medium">{completion}%</span>
                  <span>100%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={completion}
                  onChange={(e) => setCompletion(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                  disabled={loading}
                />
                <div className="flex justify-between text-xs text-slate-500">
                  {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCompletion(val)}
                      className={`px-1 py-0.5 rounded ${completion === val ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
                      disabled={loading}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sous-tâches */}
            <div>
              <div className="text-sm text-slate-600">Subtasks</div>
              <div className="mt-2 flex gap-2">
                <input 
                  value={subInput} 
                  onChange={(e) => setSubInput(e.target.value)} 
                  onKeyDown={handleSubtaskKeyDown}
                  placeholder="Add a subtask"
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2"
                  disabled={loading}
                />
                <button 
                  type="button" 
                  onClick={handleAddSubtask} 
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <ul className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 max-h-36 overflow-auto">
                {subtasks.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        type="button"
                        onClick={() => handleSetNextAction(s.id)}
                        className={`p-1 rounded transition-all ${
                          s.nextAction 
                            ? 'text-amber-500 hover:text-amber-600' 
                            : 'text-slate-300 hover:text-slate-400'
                        }`}
                        title={s.nextAction ? "Remove as next action" : "Set as next action"}
                      >
                        <Star className={`h-4 w-4 ${s.nextAction ? 'fill-current' : ''}`} />
                      </button>
                      <span className={`${s.status === "Done" ? "line-through text-slate-400" : ""} ${s.nextAction ? "font-medium text-slate-900" : ""}`}>
                        {s.title}
                        {s.nextAction && <span className="ml-1 text-xs text-amber-600 font-semibold">(Next)</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {["To Do", "In Progress", "Done"].map(status => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => handleSubtaskStatusChange(s.id, status)}
                            className={`px-2 py-0.5 rounded-full border text-xs transition-all ${
                              s.status === status 
                                ? 'ring-2 ring-blue-300' 
                                : 'hover:scale-105'
                            }`}
                            style={badgeStyle(STATUS_COLORS[status])}
                            title={`Marquer comme: ${status}`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveSubtask(s.id)} 
                        className="text-slate-400 hover:text-red-600 ml-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
                {subtasks.length === 0 && (
                  <li className="px-3 py-2 text-xs text-slate-400">
                    No subtasks yet
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Pied avec boutons */}
          <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
            {editing && (
              <button 
                type="button" 
                onClick={handleDelete} 
                className="mr-auto px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                disabled={loading}
              >
                Delete
              </button>
            )}
            {editing && (
              <button
                type="button"
                onClick={handleMarkAsDone}
                className="px-3 py-2 rounded-xl border border-emerald-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 disabled:hover:bg-transparent flex items-center gap-2"
                disabled={isActionDisabled}
                title="Complete this task"
              >
                <Check className="h-4 w-4" />
                Mark as done
              </button>
            )}
            <button 
              type="button" 
              onClick={onClose} 
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={isActionDisabled}
            >
              {editing ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TaskModal
