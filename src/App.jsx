import { useState, useEffect } from 'react'
import { Camera, Upload, CheckCircle, AlertCircle, Download, FileText } from 'lucide-react'

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
      const response = await fetch(`${backendUrl}/api/health`)
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
      setReceipts(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching receipts:', err)
      setReceipts([])
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
        setUploadResult(data.receipt)
        setFile(null)
        fetchReceipts()
      } else {
        setError(data.error || data.details || 'Upload fehlgeschlagen')
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

    const headers = [
      'ID', 
      'Händler', 
      'Brutto-Betrag', 
      'Netto-Betrag',
      'MwSt 19%',
      'MwSt 7%',
      'MwSt-Satz',
      'Datum', 
      'Kategorie', 
      'Rechnung-Nr', 
      'Absetzbar', 
      'Erstellt'
    ]
    
    const rows = receipts.map(r => {
      const bruttoAmount = parseFloat(r.amount) || 0
      // Try both camelCase (from fresh API response) and snake_case (from DB)
      const vatAmount = parseFloat(r.vat_amount || r.vatAmount) || 0
      const vatRate = r.vat_rate || r.vatRate || 0
      const nettoAmount = bruttoAmount - vatAmount
      
      // Separate VAT by rate
      const vat19 = vatRate === 19 ? vatAmount : 0
      const vat7 = vatRate === 7 ? vatAmount : 0
      
      return [
        r.id,
        r.merchant || 'Unbekannt',
        bruttoAmount.toFixed(2),
        nettoAmount.toFixed(2),
        vat19.toFixed(2),
        vat7.toFixed(2),
        vatRate ? `${vatRate}%` : '-',
        r.date || '-',
        r.category || '-',
        r.invoice_number || '-',
        r.is_deductible ? 'Ja' : 'Nein',
        new Date(r.created_at).toLocaleDateString('de-DE')
      ]
    })

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `rechnungsheld_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const isPDF = file?.name?.toLowerCase().endsWith('.pdf')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8 pt-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Camera className="w-10 h-10 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-800">RechnungsHeld</h1>
          </div>
          <p className="text-gray-600 font-medium">EASY RECEIPT by save-house.de</p>
          <p className="text-sm text-gray-500 mt-1">Belege scannen & sparen - Scan it. Tax it. Done!</p>
          
          <div className="mt-4 flex items-center justify-center gap-4 text-sm flex-wrap">
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
              <FileText className="w-4 h-4 text-purple-500" />
              <span>PDF Support</span>
            </div>
            <div className="flex items-center gap-1">
              {backendStatus === 'ok' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span>Backend {backendStatus === 'ok' ? 'OK' : 'Error'}</span>
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
              accept="image/*,application/pdf,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-3">
                {isPDF ? (
                  <FileText className="w-12 h-12 text-purple-400" />
                ) : (
                  <Camera className="w-12 h-12 text-gray-400" />
                )}
                <p className="text-gray-600">
                  {file ? (
                    <>
                      {isPDF ? '📄' : '📸'} {file.name}
                    </>
                  ) : (
                    'Beleg hier ablegen oder klicken'
                  )}
                </p>
                <p className="text-sm text-gray-500">Unterstützt: JPG, PNG, PDF</p>
              </div>
            </label>
          </div>

          {file && !uploading && !uploadResult && (
            <button
              onClick={handleUpload}
              className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              {isPDF ? 'PDF verarbeiten' : 'Foto verarbeiten'}
            </button>
          )}

          {uploading && (
            <div className="mt-4 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-gray-600">
                {isPDF ? 'PDF wird konvertiert und analysiert...' : 'Beleg wird verarbeitet...'}
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <strong>❌ Upload failed:</strong> {error}
              </div>
            </div>
          )}

          {uploadResult && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="font-semibold text-green-800">
                  {isPDF ? '📄 PDF erfolgreich verarbeitet!' : '✅ Beleg erfolgreich verarbeitet!'}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-2">
                  <p><strong>Händler:</strong> {uploadResult.merchant}</p>
                  <p><strong>Betrag (Brutto):</strong> {uploadResult.amount ? `${parseFloat(uploadResult.amount).toFixed(2)} €` : 'N/A'}</p>
                  <p><strong>Datum:</strong> {uploadResult.date || 'Unbekannt'}</p>
                </div>
                <div className="space-y-2">
                  <p><strong>Kategorie:</strong> <span className={`px-2 py-1 rounded text-xs ${
                    uploadResult.category === 'Geschäftlich' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>{uploadResult.category}</span></p>
                  {uploadResult.invoiceNumber && (
                    <p><strong>Rechnung-Nr:</strong> {uploadResult.invoiceNumber}</p>
                  )}
                  {(uploadResult.vatAmount || uploadResult.vat_amount) && (
                    <p><strong>MwSt {(uploadResult.vatRate || uploadResult.vat_rate) ? `(${uploadResult.vatRate || uploadResult.vat_rate}%)` : ''}:</strong> {parseFloat(uploadResult.vatAmount || uploadResult.vat_amount).toFixed(2)} €</p>
                  )}
                  {(uploadResult.vatAmount || uploadResult.vat_amount) && (
                    <p><strong>Netto:</strong> {(parseFloat(uploadResult.amount) - parseFloat(uploadResult.vatAmount || uploadResult.vat_amount)).toFixed(2)} €</p>
                  )}
                </div>
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
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                CSV Export
              </button>
            )}
          </div>

          {receipts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Noch keine Belege hochgeladen</p>
          ) : (
            <div className="space-y-3">
              {receipts.map(receipt => (
                <div key={receipt.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg">{receipt.merchant}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      receipt.category === 'Geschäftlich' ? 'bg-blue-100 text-blue-800' :
                      receipt.category === 'Absetzbar' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>{receipt.category}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-700">
                    <div>
                      <p className="text-xs text-gray-500">Brutto-Betrag</p>
                      <p className="font-semibold">{receipt.amount ? `${parseFloat(receipt.amount).toFixed(2)} €` : 'N/A'}</p>
                    </div>
                    {(receipt.vat_amount || receipt.vatAmount) && (
                      <div>
                        <p className="text-xs text-gray-500">MwSt {(receipt.vat_rate || receipt.vatRate) ? `(${receipt.vat_rate || receipt.vatRate}%)` : ''}</p>
                        <p className="font-semibold">{parseFloat(receipt.vat_amount || receipt.vatAmount).toFixed(2)} €</p>
                      </div>
                    )}
                    {(receipt.vat_amount || receipt.vatAmount) && (
                      <div>
                        <p className="text-xs text-gray-500">Netto</p>
                        <p className="font-semibold">{(parseFloat(receipt.amount) - parseFloat(receipt.vat_amount || receipt.vatAmount)).toFixed(2)} €</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500">Datum</p>
                      <p className="font-semibold">{receipt.date || 'unbekannt'}</p>
                    </div>
                    {receipt.invoice_number && (
                      <div>
                        <p className="text-xs text-gray-500">Rechnung-Nr</p>
                        <p className="font-semibold">{receipt.invoice_number}</p>
                      </div>
                    )}
                    {receipt.file_type && (
                      <div>
                        <p className="text-xs text-gray-500">Typ</p>
                        <p className="font-semibold">{receipt.file_type === 'PDF' ? '📄 PDF' : '📸 Foto'}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Backend Connection</h2>
          <div className="flex items-center gap-2 mb-3">
            <span className="font-medium">Status:</span>
            {backendStatus === 'ok' ? (
              <>
                <span className="text-green-600 font-semibold">✅ ONLINE</span>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </>
            ) : backendStatus === 'error' ? (
              <>
                <span className="text-red-600 font-semibold">❌ OFFLINE</span>
                <AlertCircle className="w-5 h-5 text-red-600" />
              </>
            ) : (
              <span className="text-gray-600">🔍 Checking...</span>
            )}
          </div>
          <button
            onClick={checkBackendStatus}
            className="text-sm bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            🔄 Backend erneut prüfen
          </button>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">Backend URL: <code className="bg-gray-100 px-2 py-1 rounded">{backendUrl}</code></p>
            <p className="text-xs text-gray-400 mt-2">RechnungsHeld Frontend v3.2.0 | Deployed on Vercel | Backend on Railway</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App