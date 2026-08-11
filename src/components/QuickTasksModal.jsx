import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'

/**
 * Modale pour gérer les tâches rapides
 */
const QuickTasksModal = ({ 
  onClose, 
  onAdd, 
  onRemove, 
  onClassify, 
  quickTasks,
  loading = false 
}) => {
  const [input, setInput] = useState("")

  const handleAdd = async () => {
    const title = input.trim()
    if (!title) return
    
    try {
      await onAdd(title)
      setInput("")
    } catch (error) {
      console.error('Error adding quick task:', error)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }} 
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }} 
      tabIndex={-1}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="quick-tasks-title" className="app-modal flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div id="quick-tasks-title" className="font-display font-bold dark:text-white">Collecte rapide</div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="flex gap-2">
            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyPress={handleKeyPress}
              placeholder="Une idée à ne pas oublier…"
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2"
              disabled={loading}
            />
            <button 
              onClick={handleAdd} 
              disabled={loading || !input.trim()}
              className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
              aria-label="Ajouter à la collecte"
            >
              <Plus className="h-4 w-4"/>
            </button>
          </div>

          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 max-h-80 overflow-auto">
            {quickTasks.map(q => (
              <li key={q.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="truncate flex-1 mr-2">{q.title}</div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onClassify(q.id)} 
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs"
                  >
                    Classer
                  </button>
                  <button 
                    onClick={() => onRemove(q.id)} 
                    className="text-slate-400 hover:text-red-600"
                    aria-label={`Supprimer ${q.title}`}
                  >
                    <X className="h-4 w-4"/>
                  </button>
                </div>
              </li>
            ))}
            {quickTasks.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-slate-400">
                Votre collecte est vide.
              </li>
            )}
          </ul>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end">
          <button 
            onClick={onClose} 
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200"
          >
Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuickTasksModal
