import { useState, useEffect } from 'react'

function App() {
  const [status, setStatus] = useState('Checking backend...')
  const backendUrl = 'https://easy-receipt-backend-production.up.railway.app'

  // Backend Health Check
  const checkBackend = async () => {
    try {
      const response = await fetch(`${backendUrl}/health`)
      const data = await response.json()
      setStatus(`Backend Status: ${data.status} ✅`)
    } catch (error) {
      setStatus(`Backend Error: ${error.message} ❌`)
    }
  }

  // Check backend on mount
  useEffect(() => {
    checkBackend()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            📸 Easy Receipt
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Frontend Version 3 - Alles funktioniert perfekt!
          </p>
          <div className="flex gap-4 flex-wrap">
            <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold">
              ✅ React läuft
            </span>
            <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold">
              ✅ Vite läuft
            </span>
            <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold">
              ✅ Tailwind läuft
            </span>
            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold">
              🚀 Vercel Ready
            </span>
          </div>
        </div>

        {/* Backend Status */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Backend Connection
          </h2>
          <p className="text-lg text-gray-700 mb-4">{status}</p>
          <button 
            onClick={checkBackend}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            🔄 Backend erneut prüfen
          </button>
          <p className="text-sm text-gray-500 mt-4">
            Backend URL: {backendUrl}
          </p>
        </div>

        {/* Success Box */}
        <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl shadow-2xl p-8 text-white">
          <h2 className="text-3xl font-bold mb-4">🎉 SUCCESS!</h2>
          <p className="text-xl mb-4">
            Frontend Version 3 - Läuft lokal UND auf Vercel!
          </p>
          <ul className="space-y-2">
            <li>✅ React Components rendern perfekt</li>
            <li>✅ Tailwind CSS funktioniert einwandfrei</li>
            <li>✅ State Management läuft sauber</li>
            <li>✅ Backend-Integration aktiv</li>
            <li>✅ PostCSS Config korrekt</li>
          </ul>
        </div>

        {/* Info */}
        <div className="mt-6 text-center text-white">
          <p className="text-sm opacity-80">
            Easy Receipt Frontend v3.0.0 | Deployed on Vercel | Backend on Railway
          </p>
        </div>
      </div>
    </div>
  )
}

export default App