import React, { useState } from 'react'
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'

/**
 * Modale d'authentification avec Login et Signup
 */
const AuthModal = ({ onClose, onSignIn, onSignUp, loading = false, error, defaultMode = 'signin' }) => {
  const [mode, setMode] = useState(defaultMode) // 'signin' ou 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')

    if (!email.trim() || !password.trim()) {
      setLocalError('Renseignez tous les champs.')
      return
    }

    if (password.length < 6) {
      setLocalError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    try {
      if (mode === 'signin') {
        await onSignIn(email.trim(), password)
      } else {
        await onSignUp(email.trim(), password)
        setLocalError('')
        alert('Inscription réussie. Consultez votre e-mail pour confirmer votre compte.')
      }
    } catch (err) {
      setLocalError(err.message || 'Une erreur est survenue.')
    }
  }

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setLocalError('')
  }

  const displayError = error || localError

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      tabIndex={-1}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-slate-500" />
            <h2 id="auth-modal-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {mode === 'signin' ? 'Se connecter' : 'Créer un compte'}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          {displayError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {displayError}
            </div>
          )}

          {mode === 'signup' && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
              Un e-mail de confirmation sera envoyé après l’inscription.
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="auth-email" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Adresse e-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-slate-900 outline-none focus:border-[#356AE6] focus:ring-1 focus:ring-[#356AE6] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="auth-password" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-12 text-slate-900 outline-none focus:border-[#356AE6] focus:ring-1 focus:ring-[#356AE6] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                disabled={loading}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {mode === 'signup' && (
              <p className="mt-1 text-xs text-slate-500">
                6 caractères minimum
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#172033] px-4 py-3 font-semibold text-white hover:bg-[#26324A] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#356AE6] dark:hover:bg-blue-500"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {mode === 'signin' ? 'Connexion…' : 'Création du compte…'}
              </>
            ) : (
              mode === 'signin' ? 'Se connecter' : 'Créer mon compte'
            )}
          </button>

          {/* Switch Mode */}
          <div className="border-t border-slate-200 pt-4 text-center dark:border-slate-800">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {mode === 'signin' ? 'Pas encore de compte ?' : 'Vous avez déjà un compte ?'}
              {' '}
              <button
                type="button"
                onClick={switchMode}
                className="font-semibold text-[#356AE6] hover:underline"
                disabled={loading}
              >
                {mode === 'signin' ? 'Créer un compte' : 'Se connecter'}
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AuthModal
