import React, { useState, useRef, useEffect } from 'react'
import { User, LogOut, ChevronDown, Settings, HelpCircle, MessageCircle } from 'lucide-react'
import AccountModal from './AccountModal'
import SettingsModal from './SettingsModal'
import HelpModal from './HelpModal'

/**
 * Menu compte utilisateur avec dropdown style Gmail
 */
const AccountMenu = ({ user, onSignOut, showSchedulingFields, onToggleSchedulingFields }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const menuRef = useRef(null)

  // Fermer le menu au clic extérieur
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  // Obtenir les initiales de l'utilisateur
  const getInitials = (email) => {
    if (!email) return 'U'
    const name = email.split('@')[0]
    return name.substring(0, 2).toUpperCase()
  }

  // Obtenir la couleur de l'avatar basée sur l'email
  const getAvatarColor = (email) => {
    if (!email) return 'bg-slate-500'
    
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 
      'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
    ]
    
    const hash = email.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    
    return colors[Math.abs(hash) % colors.length]
  }

  const handleSignOut = async () => {
    try {
      setIsOpen(false)
      await onSignOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Bouton déclencheur */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-transparent px-2 py-1.5 transition-colors hover:border-slate-200 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
        aria-label="Ouvrir le menu du compte"
        aria-expanded={isOpen}
      >
        {/* Avatar avec initiales */}
        <div className={`w-8 h-8 rounded-full ${getAvatarColor(user?.email)} flex items-center justify-center text-white text-sm font-medium`}>
          {getInitials(user?.email)}
        </div>
        
        {/* Chevron */}
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Menu dropdown */}
      {isOpen && (
        <>
          {/* Overlay pour fermer en cliquant à côté */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          
          {/* Menu */}
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            {/* Header utilisateur */}
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${getAvatarColor(user?.email)} flex items-center justify-center text-white font-medium`}>
                  {getInitials(user?.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-slate-900 dark:text-white">
                    {user?.email?.split('@')[0] || 'Compte'}
                  </div>
                  <div className="truncate text-sm text-slate-500 dark:text-slate-400">
                    {user?.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions du menu */}
            <div className="py-1">
              {/* Option Mon compte */}
              <button
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => {
                  setIsOpen(false)
                  setShowAccountModal(true)
                }}
              >
                <User className="w-4 h-4 text-slate-500" />
Mon compte
              </button>

              {/* Option Settings */}
              <button
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => {
                  setIsOpen(false)
                  setShowSettingsModal(true)
                }}
              >
                <Settings className="w-4 h-4 text-slate-500" />
Paramètres
              </button>

              {/* Option Help */}
              <button
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => {
                  setIsOpen(false)
                  setShowHelpModal(true)
                }}
              >
                <HelpCircle className="w-4 h-4 text-slate-500" />
Aide
              </button>

              {/* Option Feedback */}
              <button
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => {
                  setIsOpen(false)
                  window.open('https://forms.gle/kYEEkbSznQYqZunu7', '_blank', 'noopener,noreferrer')
                }}
              >
                <MessageCircle className="w-4 h-4 text-slate-500" />
Donner mon avis
              </button>

              {/* Divider */}
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              {/* Déconnexion */}
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
Se déconnecter
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Modale de gestion du compte */}
      {showAccountModal && (
        <AccountModal
          onClose={() => setShowAccountModal(false)}
          user={user}
        />
      )}

      {/* Modale des paramètres */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          showSchedulingFields={showSchedulingFields}
          onToggleSchedulingFields={onToggleSchedulingFields}
        />
      )}

      {/* Modale d'aide */}
      {showHelpModal && (
        <HelpModal
          onClose={() => setShowHelpModal(false)}
        />
      )}
    </div>
  )
}

export default AccountMenu
