import React from 'react'
import { ArrowRight, CalendarDays, Check, Moon, Sun } from 'lucide-react'

const PreviewCard = ({ priority, title, meta, progress }) => (
  <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <div className="mb-2 flex items-start gap-2">
      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
        {priority}
      </span>
      <span className="text-xs font-semibold leading-snug text-slate-800 dark:text-slate-100">{title}</span>
    </div>
    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
      <span>{meta}</span>
      <span>{progress}%</span>
    </div>
    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
      <div className="h-full rounded-full bg-[#356AE6]" style={{ width: `${progress}%` }} />
    </div>
  </div>
)

const LandingScreen = ({
  darkMode,
  onToggleDarkMode,
  onSignIn,
  onSignUp,
}) => (
  <div className="min-h-screen overflow-hidden bg-[#F6F7F9] text-[#172033] dark:bg-slate-950 dark:text-white">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <div className="font-display text-lg font-extrabold tracking-tight">My Task Board</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
          aria-label={darkMode ? 'Activer le thème clair' : 'Activer le thème sombre'}
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onSignIn}
          className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white dark:text-slate-200 dark:hover:bg-slate-900"
        >
          Se connecter
        </button>
      </div>
    </header>

    <main className="mx-auto grid min-h-[calc(100vh-80px)] max-w-6xl items-center gap-12 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:py-16">
      <section className="max-w-xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
          <span className="h-1.5 w-1.5 rounded-full bg-[#356AE6]" />
          Votre travail, visible au bon niveau
        </div>
        <h1 className="font-display text-4xl font-extrabold leading-[1.06] tracking-[-0.045em] text-[#172033] dark:text-white sm:text-5xl lg:text-6xl">
          Pilotez vos tâches sans perdre le fil.
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600 dark:text-slate-300">
          Un tableau personnel qui reste simple au quotidien et révèle les détails uniquement quand vous en avez besoin.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onSignUp}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#172033] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-colors hover:bg-[#26324A] dark:bg-[#356AE6] dark:hover:bg-blue-500"
          >
            Créer mon tableau
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onSignIn}
            className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            J’ai déjà un compte
          </button>
        </div>

        <div className="mt-8 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-[#21A179]" />
            Gratuit, sans publicité
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-[#21A179]" />
            Synchronisation Supabase
          </div>
        </div>
      </section>

      <section className="relative" aria-label="Aperçu du tableau">
        <div className="absolute -left-12 top-8 h-40 w-40 rounded-full bg-blue-200/50 blur-3xl dark:bg-blue-800/20" />
        <div className="absolute -bottom-10 right-0 h-40 w-40 rounded-full bg-emerald-200/50 blur-3xl dark:bg-emerald-800/20" />
        <div className="surface-shadow relative overflow-hidden rounded-[28px] border border-white bg-white/90 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
          <div className="mb-4 flex items-center justify-between px-1">
            <div>
              <p className="font-display text-sm font-bold text-slate-900 dark:text-white">Semaine en cours</p>
              <p className="mt-0.5 text-[11px] text-slate-500">6 tâches · 2 prioritaires</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <CalendarDays className="h-3.5 w-3.5" />
              Cette semaine
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { title: 'À faire', color: '#356AE6', cards: [
                ['P1', 'Valider la feuille de route', 'Aujourd’hui', 20],
                ['P3', 'Préparer le point équipe', 'Cette semaine', 0],
              ] },
              { title: 'En cours', color: '#D99124', cards: [
                ['P2', 'Prototype espace client', '3 sous-tâches', 65],
              ] },
              { title: 'Terminées', color: '#21A179', cards: [
                ['P2', 'Synthèse des retours', 'Hier', 100],
                ['P4', 'Mise à jour planning', 'Lundi', 100],
              ] },
            ].map((column) => (
              <div key={column.title} className="min-w-0 rounded-2xl bg-slate-50 p-2 dark:bg-slate-950/60 sm:p-3">
                <div className="mb-3 flex items-center gap-1.5 px-0.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: column.color }} />
                  <span className="truncate text-[10px] font-bold text-slate-600 dark:text-slate-300 sm:text-xs">{column.title}</span>
                </div>
                <div className="space-y-2">
                  {column.cards.map(([priority, title, meta, progress]) => (
                    <PreviewCard
                      key={title}
                      priority={priority}
                      title={title}
                      meta={meta}
                      progress={progress}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  </div>
)

export default LandingScreen
