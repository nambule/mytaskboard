import React from 'react'
import { createPortal } from 'react-dom'
import { X, Plus } from 'lucide-react'

/**
 * Modale d'aide affichant le guide d'utilisation du Task Board
 */
const HelpModal = ({ onClose, onCreateTask }) => {
  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-16 p-4 overflow-y-auto"
      style={{ zIndex: 99999 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      tabIndex={-1}
    >
      <div 
        className="w-full max-w-4xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[80vh] flex flex-col overflow-hidden mb-16"
        style={{ zIndex: 100000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Bien utiliser votre tableau
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6">
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Commencez avec quelques tâches, puis adaptez le niveau de détail à votre façon de travailler.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-sm font-semibold">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-1">Créer</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Utilisez <strong>Ajouter</strong> dans la colonne de votre choix.
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
                    Déplacez les tâches entre les colonnes et définissez leurs priorités.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
                  <span className="text-cyan-600 dark:text-cyan-400 text-sm font-semibold">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-1">Personnaliser</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Ouvrez votre profil puis <strong>Paramètres</strong> pour adapter les compartiments.
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
                  <h4 className="font-medium text-slate-900 dark:text-white mb-1">Suivre</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Ajustez la progression et les sous-tâches pour visualiser le travail restant.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <span className="text-orange-600 dark:text-orange-400 text-sm font-semibold">5</span>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-1">Collecter</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Utilisez <strong>Collecte rapide</strong> pour noter une idée avant de la classer.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-700 rounded-xl">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Fonctions utiles</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
              <div>
                <strong>Regroupement :</strong> compartiment, priorité ou statut
              </div>
              <div>
                <strong>Densité :</strong> compacte, standard ou détaillée
              </div>
              <div>
                <strong>Filtres :</strong> priorité, statut et prochaine action
              </div>
              <div>
                <strong>Thème :</strong> clair ou sombre
              </div>
              <div>
                <strong>Détails :</strong> notes, sous-tâches, dates et charge
              </div>
              <div>
                <strong>Recherche :</strong> titre, note ou sous-tâche
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700 rounded-b-2xl flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Astuce : commencez simplement et ajoutez du détail uniquement quand il devient utile.
          </p>
          {onCreateTask && (
            <button 
              onClick={() => {
                onClose()
                onCreateTask()
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-600 text-white hover:bg-slate-800 dark:hover:bg-slate-500 font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Créer une tâche
            </button>
          )}
        </div>
      </div>
    </div>
  )
  
  return createPortal(modalContent, document.body)
}

export default HelpModal
