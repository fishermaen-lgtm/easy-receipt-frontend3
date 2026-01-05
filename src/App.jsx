import { useState, useEffect } from 'react'
import { Camera, Upload, CheckCircle, AlertCircle, Download } from 'lucide-react'

const backendUrl = 'https://shimmering-kindness-production.up.railway.app'

function App() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [error, setError] = useState(null)
  const [receipts, setReceipts] = useState([])
  const [backendStatus, setBackendStatus] = useState('checking')

  useEffect(() => {
    checkBackendStatus()
    fetchReceipts()
  }, [])

  const checkBackendStatus = async () => {
    try {
      const response = await fetch(`${backendUrl}/health`)
      if (response.ok) {
        setBackendStatus('ok')
      } else {
        setBackendStatus('error')
      }
    } catch (err) {
      setBackendStatus('error')
      console.error('Backend not reachable:', err)
    }
  }

  const fetchReceipts = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/receipts`)
      const data = await response.json()
      if (data.success) {
        setReceipts(data.receipts)
      }
    } catch (err) {
      console.error('Error fetching receipts:', err)
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setUploadResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Bitte wähle eine Datei aus')
      return
    }

    setUploading(true)
    setError(null)
    setUploadResult(null)

    const formData = new FormData()
    formData.append('receipt', file)

    try {
      const response = await fetch(`${backendUrl}/api/receipts/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setUploadResult(data)
        setFile(null)
        fetchReceipts()
      } else {
        setError(data.error || 'Upload fehlgeschlagen')
      }
    } catch (err) {
      setError('Fehler beim Upload: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const exportToCSV = () => {
    if (receipts.length === 0) {
      alert('Keine Belege zum Exportieren vorhanden')
      return
    }

    const headers = ['ID', 'Rechnungsnr', 'Auftragsnr', 'Händler', 'Brutto', 'MwSt-Satz', 'MwSt-Betrag', 'Netto', 'Datum', 'Kategorie', 'Erstellt am']
    const rows = receipts.map(r => [
      r.id,
      r.invoice_number || '-',
      r.order_number || '-',
      r.merchant,
      r.amount || 'N/A',
      r.mwst_rate || '-',
      r.mwst_amount || '-',
      r.netto_amount || '-',
      r.date || 'unbekannt',
      r.category,
      new Date(r.created_at).toLocaleDateString('de-DE')
    ])

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `belege_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8 pt-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Camera className="w-10 h-10 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-800">Easy Receipt</h1>
          </div>
          <p className="text-gray-600">Beleg hochladen, OCR macht den Rest!</p>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>React läuft</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Vite läuft</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Tailwind läuft</span>
            </div>
            <div className="flex items-center gap-1">
              <Upload className="w-4 h-4 text-blue-500" />
              <span>Upload Ready</span>
            </div>
          </div>
        </header>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-semibold">Beleg hochladen</h2>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-3">
                <Camera className="w-12 h-12 text-gray-400" />
                <p className="text-gray-600">
                  {file ? file.name : 'Beleg hier ablegen oder klicken'}
                </p>
                <p className="text-sm text-gray-500">Unterstützt: JPG, PNG</p>
              </div>
            </label>
          </div>

          {file && !uploading && !uploadResult && (
            <button
              onClick={handleUpload}
              className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Jetzt hochladen und verarbeiten
            </button>
          )}

          {uploading && (
            <div className="mt-4 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-gray-600">Verarbeite Beleg...</p>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Upload failed:</strong> {error}
              </div>
            </div>
          )}

          {uploadResult && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="font-semibold text-green-800">Beleg erfolgreich verarbeitet!</h3>
              </div>
              <div className="space-y-2 text-sm">
                <p><strong>Händler:</strong> {uploadResult.merchant}</p>
                {uploadResult.invoiceNumber && (
                  <p><strong>Rechnungsnummer:</strong> {uploadResult.invoiceNumber}</p>
                )}
                {uploadResult.orderNumber && (
                  <p><strong>Auftragsnummer:</strong> {uploadResult.orderNumber}</p>
                )}
                <p><strong>Betrag (Brutto):</strong> {uploadResult.amount || 'N/A'}</p>
                {uploadResult.mwstRate && (
                  <>
                    <p><strong>MwSt ({uploadResult.mwstRate}):</strong> {uploadResult.mwstAmount || 'N/A'}</p>
                    <p><strong>Netto:</strong> {uploadResult.nettoAmount || 'N/A'}</p>
                  </>
                )}
                <p><strong>Datum:</strong> {uploadResult.date || 'Unbekannt'}</p>
                <p><strong>Kategorie:</strong> {uploadResult.category}</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              📋 Letzte Belege
            </h2>
            {receipts.length > 0 && (
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
          </div>

          {receipts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Noch keine Belege hochgeladen</p>
          ) : (
            <div className="space-y-4">
              {receipts.map(receipt => (
                <div key={receipt.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-lg mb-2">{receipt.merchant}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                    <div className="space-y-1">
                      {receipt.invoice_number && (
                        <p><strong>Rechnungsnr:</strong> {receipt.invoice_number}</p>
                      )}
                      {receipt.order_number && (
                        <p><strong>Auftragsnr:</strong> {receipt.order_number}</p>
                      )}
                      <p><strong>Brutto:</strong> {receipt.amount}</p>
                      {receipt.mwst_rate && (
                        <>
                          <p><strong>MwSt ({receipt.mwst_rate}):</strong> {receipt.mwst_amount}</p>
                          <p><strong>Netto:</strong> {receipt.netto_amount}</p>
                        </>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p><strong>Datum:</strong> {receipt.date || 'unbekannt'}</p>
                      <p><strong>Kategorie:</strong> <span className={`px-2 py-1 rounded text-xs ${
                        receipt.category === 'Geschäftlich' ? 'bg-blue-100 text-blue-800' :
                        receipt.category === 'Absetzbar' ? 'bg-green-100 text-green-800' :
                        receipt.category === 'Lebensmittel' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>{receipt.category}</span></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Backend Connection</h2>
          <div className="flex items-center gap-2">
            <span className="font-medium">Backend Status:</span>
            {backendStatus === 'ok' ? (
              <>
                <span className="text-green-600 font-semibold">OK</span>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </>
            ) : backendStatus === 'error' ? (
              <>
                <span className="text-red-600 font-semibold">Error</span>
                <AlertCircle className="w-5 h-5 text-red-600" />
              </>
            ) : (
              <span className="text-gray-600">Checking...</span>
            )}
          </div>
          <button
            onClick={checkBackendStatus}
            className="mt-3 text-sm bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            🔄 Backend erneut prüfen
          </button>
          <p className="text-xs text-gray-500 mt-4">
            Backend URL: {backendUrl}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Easy Receipt Frontend v3.1.0 | Deployed on Vercel | Backend on Railway
          </p>
        </div>
      </div>
    </div>
  )
}

export default App