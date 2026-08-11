import React from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { AlertTriangle, Calendar as CalendarIcon, FileText, CheckSquare } from 'lucide-react'
import { Select, SelectTrigger, SelectContent, SelectItem } from './ui/Select'
import { 
  PRIORITY_STYLES, 
  PRIORITY_DOT, 
  STATUS_COLORS, 
  COMPARTMENT_COLORS,
  WHEN_OPTIONS,
  STATUS_LABELS,
  WHEN_LABELS,
} from '../utils/constants'
import { badgeStyle, compStyle, styleWhen, formatDateFR, isPast } from '../utils/helpers'

/**
 * Composant pour afficher une carte de tâche dans le tableau des tâches
 */
const TaskCard = ({ 
  id, 
  index, 
  task, 
  onEdit, 
  onRemove, 
  onUpdate, 
  groupBy,
  viewMode = "full",
}) => {
  if (!task) return null

  const completion = task.completion || 0

  const handleWhenChange = (newWhen) => {
    const value = newWhen === "__clear" ? "" : newWhen
    onUpdate(id, { when: value })
  }

  const handleCardClick = (e) => {
    // Ne pas ouvrir le modal si on clique sur le sélecteur "Quand"
    if (e.target.closest('[data-select-trigger]')) {
      return
    }
    onEdit()
  }

  return (
    <Draggable draggableId={id} index={index}>
      {(provided, snapshot) => (
        <div 
          ref={provided.innerRef} 
          {...provided.draggableProps} 
          {...provided.dragHandleProps} 
          onClick={handleCardClick} 
          role="button" 
          tabIndex={0}
          onKeyDown={(e) => { 
            if (e.key === 'Enter' || e.key === ' ') { 
              e.preventDefault()
              onEdit()
            } 
          }}
          className={`group relative mb-2 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-[box-shadow,border-color,transform] hover:-translate-y-px hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 ${
            snapshot.isDragging ? "ring-2 ring-slate-300 dark:ring-slate-600" : ""
          }`}
        >
          {/* Bandeau compartiment si groupé par priorité ou statut */}
          {viewMode !== "compact" && (groupBy === "priority" || groupBy === "status") && (
            <div 
              className="mb-3 -mr-3.5 -mt-3.5 rounded-tr-xl border-b px-3 py-1.5"
              style={compStyle(COMPARTMENT_COLORS[task.compartment] || COMPARTMENT_COLORS.PM)}
            >
              <span className="text-xs font-medium tracking-wide">{task.compartment}</span>
            </div>
          )}

          {/* En-tête avec priorité et titre - Toujours visible */}
          <div className="mb-2.5 flex items-start gap-2">
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${PRIORITY_STYLES[task.priority]}`}>
              <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[task.priority]}`}></span>
              {task.priority}
            </span>
            
            <div className="flex-1 break-words text-sm font-semibold leading-5 text-slate-900 dark:text-slate-100">
              {task.title}
            </div>
          </div>

          {/* Statut et taille - Masqué en mode compact */}
          {viewMode !== "compact" && (
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span 
                className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium"
                style={badgeStyle(STATUS_COLORS[task.status])}
              >
                {STATUS_LABELS[task.status] || task.status}
              </span>
              <span 
                className="text-[11px] font-semibold text-slate-400 dark:text-slate-500"
              >
                Taille {task.size}
              </span>
            </div>
          )}

          {/* Indicateurs supplémentaires - Masqué en mode compact */}
          {viewMode !== "compact" && (task.flagged || task.dueDate || (task.note && task.note.trim()) || (task.subtasks && task.subtasks.length > 0)) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {task.flagged && (
                <span className="inline-flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  À risque
                </span>
              )}
              {task.dueDate && (
                <span className={`inline-flex items-center gap-1 ${isPast(task.dueDate) ? "text-red-600" : ""}`}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {formatDateFR(task.dueDate)}
                </span>
              )}
              {task.subtasks && task.subtasks.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <CheckSquare className="h-3.5 w-3.5" />
                  {task.subtasks.filter(subtask => subtask.status === "Done").length}/{task.subtasks.length}
                </span>
              )}
              {task.note && task.note.trim() && (
                <span className="inline-flex items-center gap-1" title="Une note est disponible">
                  <FileText className="h-3.5 w-3.5"/>
                  Note
                </span>
              )}
            </div>
          )}

          {/* Barre de progression de la tâche - Visible dans tous les modes */}
          {completion > 0 && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Progression</span>
              <span>{completion}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  completion === 100 ? 'bg-[#21A179]' : 'bg-[#356AE6]'
                }`}
                style={{ width: `${completion}%` }}
              ></div>
            </div>
          </div>
          )}

          {/* Sélecteur "Quand" - Visible uniquement en mode complet */}
          {viewMode === "full" && !task.planningExcluded && (
            <div 
              className="mt-3 flex items-center justify-center border-t border-slate-100 pt-3 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()} 
              onMouseDown={(e) => e.stopPropagation()} 
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="w-full flex justify-center">
                <Select 
                  value={task.when || ""} 
                  onValueChange={handleWhenChange}
                  className="task-card-select"
                >
                  <SelectTrigger 
                    data-select-trigger
                    className="inline-flex w-[140px] items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700"
                    style={styleWhen(task.when || "")}
                  >
                    <CalendarIcon className="h-3 w-3 opacity-70" />
                    <span>{WHEN_LABELS[task.when || '']}</span>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-slate-200 min-w-[180px]">
                    {/* Option de vidage */}
                    <SelectItem value="__clear">
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full" style={styleWhen("")}>
                        <CalendarIcon className="h-3 w-3 opacity-70" />
                        À planifier
                      </span>
                    </SelectItem>
                    {WHEN_OPTIONS.filter(x => x !== "").map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full" style={styleWhen(opt)}>
                          <CalendarIcon className="h-3 w-3 opacity-70" />
                          {WHEN_LABELS[opt]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
}

export default TaskCard
