import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Trash2, GripVertical, Edit } from 'lucide-react'
import { useCompartments } from '../hooks/useCompartments'

/**
 * Modal for managing application settings (compartments management)
 */
const SettingsModal = ({ onClose, showSchedulingFields = false, onToggleSchedulingFields }) => {
  // Handle close - reload for any compartment changes
  const handleClose = () => {
    if (hasChanges) {
      console.log('🔄 Compartments changed, reloading page...')
      window.location.reload()
    } else {
      onClose()
    }
  }
  const {
    compartments,
    loading,
    error,
    createCompartment,
    updateCompartment,
    deleteCompartment,
    reorderCompartments
  } = useCompartments()

  const [newCompartment, setNewCompartment] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverItem, setDragOverItem] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Add new compartment
  const handleAddCompartment = async () => {
    if (!newCompartment.trim()) return
    if (compartments.some(comp => comp.name === newCompartment.trim())) {
      alert('Ce compartiment existe déjà.')
      return
    }
    
    setActionLoading(true)
    try {
      await createCompartment(newCompartment.trim())
      setNewCompartment('')
      setHasChanges(true)
    } catch (err) {
      alert(`Impossible de créer le compartiment : ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Delete compartment
  const handleDeleteCompartment = async (compartmentToDelete) => {
    if (compartments.length <= 1) {
      alert('Vous devez conserver au moins un compartiment.')
      return
    }
    
    if (confirm(`Supprimer « ${compartmentToDelete.name} » ?\nLes tâches associées devront être réaffectées.`)) {
      setActionLoading(true)
      try {
        await deleteCompartment(compartmentToDelete.id)
        setHasChanges(true)
      } catch (err) {
        alert(`Error deleting compartment: ${err.message}`)
      } finally {
        setActionLoading(false)
      }
    }
  }

  // Start editing
  const handleStartEdit = (compartment) => {
    setEditingId(compartment.id)
    setEditingValue(compartment.name)
  }

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingValue.trim()) {
      setEditingId(null)
      return
    }
    
    const currentCompartment = compartments.find(c => c.id === editingId)
    if (editingValue.trim() !== currentCompartment.name && 
        compartments.some(c => c.name === editingValue.trim())) {
      alert('This compartment already exists')
      return
    }
    
    setActionLoading(true)
    try {
      await updateCompartment(editingId, { name: editingValue.trim() })
      setEditingId(null)
      setEditingValue('')
      setHasChanges(true)
    } catch (err) {
      alert(`Error updating compartment: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingValue('')
  }

  // Handle key press in edit mode
  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  // Handle key press for new compartment
  const handleNewCompartmentKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAddCompartment()
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e, compartment) => {
    setDraggedItem(compartment)
    e.dataTransfer.effectAllowed = 'move'
    
    // Create custom drag image with better styling
    const dragElement = e.currentTarget.cloneNode(true)
    dragElement.style.opacity = '0.8'
    dragElement.style.transform = 'rotate(2deg)'
    dragElement.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.3)'
    document.body.appendChild(dragElement)
    e.dataTransfer.setDragImage(dragElement, e.offsetX, e.offsetY)
    setTimeout(() => document.body.removeChild(dragElement), 0)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleSchedulingToggle = (event) => {
    if (typeof onToggleSchedulingFields === 'function') {
      onToggleSchedulingFields(event.target.checked)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (e, compartment) => {
    e.preventDefault()
    if (draggedItem && draggedItem.id !== compartment.id) {
      setDragOverItem(compartment.id)
    }
  }

  const handleDragLeave = (e) => {
    // Only clear drag over if we're leaving the container, not just moving between child elements
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverItem(null)
    }
  }

  const handleDrop = async (e, targetCompartment) => {
    e.preventDefault()
    setDragOverItem(null)
    
    if (!draggedItem || draggedItem.id === targetCompartment.id) {
      setDraggedItem(null)
      return
    }

    const draggedIndex = compartments.findIndex(c => c.id === draggedItem.id)
    const targetIndex = compartments.findIndex(c => c.id === targetCompartment.id)
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null)
      return
    }

    // Create new array with reordered items
    const newCompartments = [...compartments]
    const [movedItem] = newCompartments.splice(draggedIndex, 1)
    newCompartments.splice(targetIndex, 0, movedItem)
    
    setActionLoading(true)
    try {
      await reorderCompartments(newCompartments)
      setHasChanges(true)
    } catch (err) {
      alert(`Error reordering compartments: ${err.message}`)
    } finally {
      setActionLoading(false)
      setDraggedItem(null)
    }
  }

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-16 p-4 overflow-y-auto"
      style={{ zIndex: 99999 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose() }}
      onKeyDown={(e) => { if (e.key === 'Escape') handleClose() }}
      tabIndex={-1}
    >
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[80vh] flex flex-col overflow-hidden mb-16"
        style={{ zIndex: 100000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Paramètres</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                Options d’affichage
              </h3>
              <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40">
                <input
                  type="checkbox"
                  checked={showSchedulingFields}
                  onChange={handleSchedulingToggle}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    Champs de planification
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Afficher les dates, la répartition du temps et la synthèse de charge dans la tâche.
                  </p>
                </div>
              </label>
            </div>

            {/* Compartments Management */}
            <div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                Gérer les compartiments
              </h3>
              
              {/* Add new compartment */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newCompartment}
                  onChange={(e) => setNewCompartment(e.target.value)}
                  onKeyDown={handleNewCompartmentKeyDown}
                  placeholder="Nouveau compartiment…"
                  disabled={actionLoading}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  onClick={handleAddCompartment}
                  disabled={!newCompartment.trim() || actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </button>
              </div>

              {/* Loading state */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-slate-600 dark:text-slate-400">Chargement des compartiments…</div>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                  Erreur : {error}
                </div>
              )}

              {/* Existing compartments list */}
              {!loading && (
                <div className="max-h-64 overflow-y-auto">
                  {compartments.map((compartment, index) => {
                    const isDragging = draggedItem?.id === compartment.id
                    const isDragOver = dragOverItem === compartment.id
                    
                    return (
                      <div key={compartment.id} className="relative">
                        {/* Drop indicator above */}
                        {isDragOver && draggedItem && (
                          <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10 shadow-sm">
                            <div className="absolute -left-1 -top-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div className="absolute -right-1 -top-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                        )}
                        
                        <div
                          draggable={!actionLoading}
                          onDragStart={(e) => handleDragStart(e, compartment)}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDragEnter={(e) => handleDragEnter(e, compartment)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, compartment)}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 mb-2
                            ${isDragging ? 
                              'opacity-30 scale-95 rotate-1 cursor-grabbing bg-slate-100 dark:bg-slate-600' : 
                              'cursor-grab hover:shadow-md active:cursor-grabbing'
                            }
                            ${isDragOver ? 
                              'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 shadow-lg ring-2 ring-blue-200 dark:ring-blue-800' :
                              'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                            }
                            ${actionLoading ? 'pointer-events-none opacity-50' : ''}
                          `}
                        >
                      {/* Drag handle */}
                      <GripVertical className={`h-4 w-4 transition-colors ${
                        isDragging ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                      }`} />
                      
                      {/* Compartment name (editable) */}
                      <div className="flex-1">
                        {editingId === compartment.id ? (
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          onBlur={handleSaveEdit}
                          className="w-full px-2 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {compartment.name}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {editingId === compartment.id ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                            title="Enregistrer"
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            title="Annuler"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(compartment)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCompartment(compartment)}
                            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Instructions */}
              {!loading && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Faites glisser la poignée pour réordonner les compartiments. Les changements sont enregistrés automatiquement.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
          >
            Terminé
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default SettingsModal
