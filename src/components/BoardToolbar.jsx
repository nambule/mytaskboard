import React from 'react'
import {
  AlertTriangle,
  ChevronDown,
  Filter,
  Inbox,
  CalendarRange,
  Columns,
  LayoutPanelTop,
  ListTodo,
  Moon,
  Search,
  Sun,
  X,
} from 'lucide-react'
import {
  PRIORITIES,
  PRIORITY_STYLES,
  STATUSES,
  STATUS_LABELS,
  WHEN_LABELS,
  WHEN_OPTIONS,
} from '../utils/constants'
import AccountMenu from './AccountMenu'

const controlClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
const planningDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})
const formatPlanningDate = (value) => {
  const [year, month, day] = value.split('-').map(Number)
  return planningDateFormatter.format(new Date(year, month - 1, day))
}

const BoardToolbar = ({
  user,
  activeView,
  onViewChange,
  search,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  statusFilter,
  onStatusFilterChange,
  nextActionFilter,
  onNextActionFilterChange,
  showReminders,
  onShowRemindersChange,
  onResetFilters,
  activeFilterCount,
  activeFilters,
  groupBy,
  onGroupByChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  darkMode,
  onToggleDarkMode,
  quickTaskCount,
  onOpenQuickTasks,
  inProgressTasks,
  startedTasksPendingStatus,
  onOpenTask,
  onSignOut,
  showSchedulingFields,
  onToggleSchedulingFields,
  filterRef,
  viewRef,
  inProgressRef,
}) => (
  <header id="board-toolbar" className="sticky top-0 z-50 border-b border-slate-200/80 bg-[#F6F7F9]/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
    <div className="mx-auto max-w-[1600px] px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <div className="min-w-0">
            <h1 className="font-display truncate text-lg font-extrabold tracking-tight text-[#172033] dark:text-white sm:text-xl">
              My Task Board
            </h1>
            <p className="hidden text-xs text-slate-500 sm:block">Votre espace de pilotage personnel</p>
          </div>
          <div className="flex shrink-0 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800" aria-label="Vue principale">
            <button
              type="button"
              onClick={() => onViewChange('board')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold sm:px-3 ${activeView === 'board' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <Columns className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tableau</span>
            </button>
            <button
              type="button"
              onClick={() => onViewChange('planning')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold sm:px-3 ${activeView === 'planning' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Planning</span>
            </button>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <details ref={inProgressRef} className="relative">
            <summary
              className={`${controlClass} relative list-none cursor-pointer select-none px-3 sm:px-4`}
              aria-label={`${inProgressTasks.length} sujets en cours, ${startedTasksPendingStatus.length} démarrages passés à vérifier`}
            >
              <ListTodo className="h-4 w-4" />
              <span className="hidden lg:inline">En cours</span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {inProgressTasks.length}
              </span>
              {startedTasksPendingStatus.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                  {startedTasksPendingStatus.length}
                </span>
              )}
            </summary>
            <div className="absolute right-0 z-50 mt-2 w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div>
                  <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">Suivi des sujets</h2>
                  <p className="mt-0.5 text-xs text-slate-400">Statuts actuels et démarrages à vérifier</p>
                </div>
                <ListTodo className="h-5 w-5 text-slate-400" />
              </div>

              <div className="max-h-[min(34rem,70vh)] overflow-y-auto">
                <section aria-labelledby="in-progress-heading">
                  <div className="flex items-center justify-between bg-amber-50/70 px-4 py-2.5 dark:bg-amber-950/20">
                    <h3 id="in-progress-heading" className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-800 dark:text-amber-300">En cours</h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-amber-800 shadow-sm dark:bg-slate-900 dark:text-amber-300">{inProgressTasks.length}</span>
                  </div>
                  {inProgressTasks.length > 0 ? (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {inProgressTasks.map((task) => (
                        <li key={task.id}>
                          <button
                            type="button"
                            onClick={() => {
                              if (inProgressRef?.current) inProgressRef.current.open = false
                              onOpenTask(task.id)
                            }}
                            className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-amber-50/70 focus:bg-amber-50/70 focus:outline-none dark:hover:bg-amber-950/30 dark:focus:bg-amber-950/30"
                          >
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 ring-4 ring-amber-100 dark:ring-amber-950" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-800 group-hover:text-slate-950 dark:text-slate-100 dark:group-hover:text-white">{task.title}</span>
                              <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-slate-400">
                                <span className="truncate">{task.compartment}</span>
                                <span aria-hidden="true">·</span>
                                <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${PRIORITY_STYLES[task.priority] || ''}`}>{task.priority}</span>
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-4 py-4 text-xs text-slate-400">Aucun sujet n’est actuellement marqué « En cours ».</p>
                  )}
                </section>

                <section aria-labelledby="started-pending-heading" className="border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between bg-red-50/70 px-4 py-2.5 dark:bg-red-950/20">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                      <h3 id="started-pending-heading" className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-700 dark:text-red-300">Démarrage passé</h3>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-red-700 shadow-sm dark:bg-slate-900 dark:text-red-300">{startedTasksPendingStatus.length}</span>
                  </div>
                  {startedTasksPendingStatus.length > 0 ? (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {startedTasksPendingStatus.map((task) => (
                        <li key={task.id}>
                          <button
                            type="button"
                            onClick={() => {
                              if (inProgressRef?.current) inProgressRef.current.open = false
                              onOpenTask(task.id)
                            }}
                            className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-red-50/70 focus:bg-red-50/70 focus:outline-none dark:hover:bg-red-950/30 dark:focus:bg-red-950/30"
                          >
                            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-800 group-hover:text-slate-950 dark:text-slate-100 dark:group-hover:text-white">{task.title}</span>
                              <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                                <span className="truncate">{task.compartment}</span>
                                <span aria-hidden="true">·</span>
                                <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${PRIORITY_STYLES[task.priority] || ''}`}>{task.priority}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-medium text-red-600 dark:text-red-400">Depuis le {formatPlanningDate(task.planningStartDate)}</span>
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-4 py-4 text-xs text-slate-400">Aucun démarrage planifié ne nécessite de mise à jour.</p>
                  )}
                </section>
              </div>
            </div>
          </details>
          <button
            type="button"
            onClick={onOpenQuickTasks}
            className={`${controlClass} relative px-3 sm:px-4`}
          >
            <Inbox className="h-4 w-4" />
            <span className="hidden sm:inline">Collecte rapide</span>
            {quickTaskCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D64C4C] px-1 text-[10px] font-bold text-white">
                {quickTaskCount}
              </span>
            )}
          </button>
          <AccountMenu
            user={user}
            onSignOut={onSignOut}
            showSchedulingFields={showSchedulingFields}
            onToggleSchedulingFields={onToggleSchedulingFields}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1 lg:max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Rechercher une tâche, une note ou une sous-tâche…"
            aria-label="Rechercher dans les tâches"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[#356AE6] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:ml-auto lg:overflow-visible lg:pb-0">
          <details ref={filterRef} className="relative shrink-0">
            <summary className={`${controlClass} list-none cursor-pointer select-none`}>
              <Filter className="h-4 w-4" />
              Filtres
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#356AE6] px-1 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </summary>
            <div className="absolute left-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 lg:left-auto lg:right-0">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">Affiner les tâches</h2>
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="text-xs font-semibold text-[#356AE6] hover:underline"
                >
                  Tout réinitialiser
                </button>
              </div>

              <fieldset className="mt-4">
                <legend className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Priorité</legend>
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {PRIORITIES.map((priority) => (
                    <label
                      key={priority}
                      className={`cursor-pointer rounded-lg border px-2 py-2 text-center text-xs font-bold transition-colors ${
                        priorityFilter[priority]
                          ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'border-slate-200 text-slate-400 dark:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={priorityFilter[priority]}
                        onChange={() => onPriorityFilterChange(priority)}
                      />
                      {priority}
                    </label>
                  ))}
                </div>
              </fieldset>

              {activeView === 'planning' && <fieldset className="mt-5">
                <legend className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Type de tâche</legend>
                <label className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  <span>
                    <span className="block font-medium">Afficher les pense-bêtes</span>
                    <span className="mt-0.5 block text-xs text-slate-400">Tâches sans planification ni prochaine action</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showReminders}
                    onChange={(event) => onShowRemindersChange(event.target.checked)}
                    className="h-4 w-4 shrink-0 rounded border-slate-300 text-[#356AE6]"
                  />
                </label>
              </fieldset>}

              <fieldset className="mt-5">
                <legend className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Statut</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {STATUSES.map((status) => (
                    <label key={status} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={statusFilter[status]}
                        onChange={() => onStatusFilterChange(status)}
                        className="h-4 w-4 rounded border-slate-300 text-[#356AE6]"
                      />
                      {STATUS_LABELS[status]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mt-5">
                <legend className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Prochaine action</legend>
                <select
                  value={nextActionFilter}
                  onChange={(event) => onNextActionFilterChange(event.target.value)}
                  className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="All">Toutes les échéances</option>
                  {WHEN_OPTIONS.filter(Boolean).map((option) => (
                    <option key={option} value={option}>{WHEN_LABELS[option]}</option>
                  ))}
                </select>
              </fieldset>
            </div>
          </details>

          <details ref={viewRef} className="relative shrink-0">
            <summary className={`${controlClass} list-none cursor-pointer select-none`}>
              <LayoutPanelTop className="h-4 w-4" />
              Affichage
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </summary>
            <div className="absolute right-0 z-40 mt-2 w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <label className={`${activeView === 'planning' ? 'hidden' : 'block'} text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400`}>
                Regrouper par
                <select
                  value={groupBy}
                  onChange={(event) => onGroupByChange(event.target.value)}
                  className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="compartment">Compartiment</option>
                  <option value="priority">Priorité</option>
                  <option value="status">Statut</option>
                </select>
              </label>

              <label className={`${activeView === 'planning' ? 'hidden' : 'mt-4 block'} text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400`}>
                Trier
                <select
                  value={sortBy}
                  onChange={(event) => onSortByChange(event.target.value)}
                  className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="none">Ordre manuel</option>
                  <option value="priorityAsc">Priorité P1 → P5</option>
                  <option value="priorityDesc">Priorité P5 → P1</option>
                  <option value="whenAsc">Échéance la plus proche</option>
                  <option value="whenDesc">Échéance la plus lointaine</option>
                </select>
              </label>

              <fieldset className={activeView === 'planning' ? 'hidden' : 'mt-4'}>
                <legend className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Densité des cartes</legend>
                <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                  {[
                    ['compact', 'Compacte'],
                    ['standard', 'Standard'],
                    ['full', 'Détaillée'],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-lg px-2 py-2 text-center text-xs font-semibold ${
                        viewMode === value
                          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="viewMode"
                        value={value}
                        checked={viewMode === value}
                        onChange={() => onViewModeChange(value)}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <button
                type="button"
                onClick={onToggleDarkMode}
                className="mt-4 flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>{darkMode ? 'Thème sombre' : 'Thème clair'}</span>
                {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
            </div>
          </details>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1" aria-label="Filtres actifs">
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Actifs</span>
          {activeFilters.map((filter) => (
            <button
              type="button"
              key={filter.key}
              onClick={filter.onRemove}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
              aria-label={`Retirer le filtre ${filter.label}`}
            >
              {filter.label}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  </header>
)

export default BoardToolbar
