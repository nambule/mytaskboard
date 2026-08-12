import React, { useState } from 'react'
import { CalendarRange, Trash2, X } from 'lucide-react'

const parseLocalDate = (value) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const toISODate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const startOfWeekISO = (value) => {
  if (!value) return ''
  const date = parseLocalDate(value)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return toISODate(date)
}

const endOfWeekISO = (value) => {
  if (!value) return ''
  const date = parseLocalDate(startOfWeekISO(value))
  date.setDate(date.getDate() + 6)
  return toISODate(date)
}

const PlanningPeriodModal = ({ period, initialStartDate, initialEndDate, onSave, onDelete, onClose }) => {
  const [title, setTitle] = useState(period?.title || '')
  const [startDate, setStartDate] = useState(period?.startDate || initialStartDate)
  const [endDate, setEndDate] = useState(period?.endDate || initialEndDate)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!title.trim() || !startDate || !endDate) return
    setSaving(true)
    setSaveError(null)
    try {
      await onSave({
        title: title.trim(),
        startDate: startOfWeekISO(startDate),
        endDate: endOfWeekISO(endDate),
      })
      onClose()
    } catch (error) {
      setSaveError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await onDelete()
    } catch (error) {
      setSaveError(error.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form onSubmit={handleSubmit} className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <CalendarRange className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">{period ? 'Modifier la période' : 'Nouvelle période'}</h2>
              <p className="text-xs text-slate-500">Une fenêtre temporelle, distincte d’un projet.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Nom
            <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Version 1" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-950" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Semaine de début
              <input type="date" value={startDate} onChange={(event) => {
                const start = startOfWeekISO(event.target.value)
                setStartDate(start)
                if (!endDate || endDate < start) setEndDate(endOfWeekISO(start))
              }} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Semaine de fin
              <input type="date" value={endDate} onChange={(event) => {
                const end = endOfWeekISO(event.target.value)
                setEndDate(end)
                if (!startDate || startDate > end) setStartDate(startOfWeekISO(end))
              }} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </label>
          </div>
          <p className="text-xs text-slate-400">Les dates sont alignées automatiquement sur des semaines complètes.</p>
          {saveError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300">{saveError}</p>}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          {period && (
            <button type="button" onClick={handleDelete} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950">
              <Trash2 className="h-4 w-4" /> Supprimer
            </button>
          )}
          <button type="button" onClick={onClose} className="ml-auto rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Annuler</button>
          <button type="submit" disabled={saving || !title.trim()} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PlanningPeriodModal
