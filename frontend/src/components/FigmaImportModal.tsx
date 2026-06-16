import React, { useState } from 'react'
import { Modal } from './ui/Modal'

interface FigmaImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (figmaUrl: string, figmaToken: string, fileName: string) => void
}

interface ValidationResult {
  valid: boolean
  fileKey: string | null
  fileName: string | null
  message: string
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8081'

export const FigmaImportModal: React.FC<FigmaImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [figmaUrl, setFigmaUrl] = useState('')
  const [figmaToken, setFigmaToken] = useState('')
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validated, setValidated] = useState<ValidationResult | null>(null)

  const reset = () => {
    setFigmaUrl('')
    setFigmaToken('')
    setError(null)
    setValidated(null)
    setValidating(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleValidate = async () => {
    setError(null)
    setValidated(null)

    if (!figmaUrl.trim()) {
      setError('Veuillez coller une URL Figma.')
      return
    }
    if (!figmaToken.trim()) {
      setError('Le token personnel Figma est requis.')
      return
    }

    setValidating(true)
    try {
      const res = await fetch(`${API_BASE}/api/figma/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ figmaUrl: figmaUrl.trim(), figmaToken: figmaToken.trim() }),
      })
      const data: ValidationResult = await res.json()
      if (data.valid) {
        setValidated(data)
      } else {
        setError(data.message ?? 'URL ou token invalide.')
      }
    } catch {
      setError('Impossible de contacter le serveur. Vérifiez votre connexion.')
    } finally {
      setValidating(false)
    }
  }

  const handleImport = () => {
    if (!validated) return
    onImport(figmaUrl.trim(), figmaToken.trim(), validated.fileName ?? 'Figma File')
    handleClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importer depuis Figma"
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Annuler
          </button>
          {!validated ? (
            <button
              type="button"
              onClick={handleValidate}
              disabled={validating}
              className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {validating ? 'Vérification…' : 'Valider'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleImport}
              className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
            >
              Importer
            </button>
          )}
        </>
      }
    >
      <div className="space-y-5">

        {/* Instructions */}
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-800">
          <p className="font-semibold mb-1">Comment obtenir votre token Figma ?</p>
          <ol className="list-decimal list-inside space-y-1 text-violet-700">
            <li>Ouvrez Figma → Settings → Security</li>
            <li>Cliquez <strong>Generate new token</strong></li>
            <li>Copiez le token et collez-le ci-dessous</li>
          </ol>
        </div>

        {/* Figma URL */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            URL du fichier Figma
          </label>
          <input
            type="url"
            value={figmaUrl}
            onChange={e => { setFigmaUrl(e.target.value); setValidated(null); setError(null) }}
            placeholder="https://www.figma.com/design/..."
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none text-sm transition-colors"
          />
        </div>

        {/* Figma Token */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Token personnel Figma
          </label>
          <input
            type="password"
            value={figmaToken}
            onChange={e => { setFigmaToken(e.target.value); setValidated(null); setError(null) }}
            placeholder="figd_xxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none text-sm font-mono transition-colors"
          />
          <p className="text-xs text-slate-400 mt-1">
            Votre token n'est jamais stocké — utilisé uniquement pour cette génération.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Validation success */}
        {validated && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Fichier trouvé</p>
              <p className="text-sm text-green-700">« {validated.fileName} »</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
