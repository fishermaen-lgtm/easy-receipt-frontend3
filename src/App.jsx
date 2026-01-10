import { useState, useEffect } from 'react'
import { Camera, Upload, CheckCircle, AlertCircle, Download, FileText, Edit2, Save, X, Eye } from 'lucide-react'

const backendUrl = 'https://easy-receipt-backend-production.up.railway.app'

function App() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [error, setError] = useState(null)
  const [receipts, setReceipts] = useState([])
  const [backendStatus, setBackendStatus] = useState('checking')
  const [stats, setStats] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [editingReceipt, setEditingReceipt] = useState(null)

  useEffect(() => {
    checkBackendStatus()
    fetchReceipts()
    fetchStats()
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
      const url = filterStatus === 'all' 
        ? `${backendUrl}/api/receipts`
        : `${backendUrl}/api/receipts?status=${filterStatus.toUpperCase()}`
      
      const response = await fetch(url)
      const data = await response.json()
      setReceipts(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching receipts:', err)
      setReceipts([])
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/receipts/stats`)
      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Error fetching stats:', err)
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
      const response = await fetch(`${backendUrl}/api/receipts`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setUploadResult(data)
        setFile(null)
        
        // If needs review, open edit modal
        if (data.needs_review) {
          setEditingReceipt(data)
        }
        
        fetchReceipts()
        fetchStats()
      } else {
        setError(data.error || data.details || 'Upload fehlgeschlagen')
      }
    } catch (err) {
      setError('Fehler beim Upload: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSaveReceipt = async (receiptData) => {
    try {
      const response = await fetch(`${backendUrl}/api/receipts/${receiptData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...receiptData,
          status: 'APPROVED'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setEditingReceipt(null)
        fetchReceipts()
        fetchStats()
        alert('✅ Beleg gespeichert!')
      } else {
        alert('❌ Fehler beim Speichern: ' + data.error)
      }
    } catch (err) {
      alert('❌ Fehler: ' + err.message)
    }
  }

  const handleDownload = async (receiptId, filename) => {
    try {
      const response = await fetch(`${backendUrl}/api/receipts/${receiptId}/download`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('❌ Download fehlgeschlagen: ' + err.message)
    }
  }

  const exportToCSV = () => {
    if (receipts.length === 0) {
      alert('Keine Belege zum Exportieren vorhanden')
      return
    }

    const approvedReceipts = receipts.filter(r => r.status === 'APPROVED')
    
    if (approvedReceipts.length === 0) {
      alert('Keine genehmigten Belege zum Exportieren')
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
      'Status',
      'Erstellt'
    ]
    
    const rows = approvedReceipts.map(r => {
      const bruttoAmount = parseFloat(r.amount) || 0
      const vatAmount = parseFloat(r.vat_amount) || 0
      const vatRate = r.vat_rate || 0
      const nettoAmount = bruttoAmount - vatAmount
      
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
        r.status || 'PENDING',
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
  const pendingCount = receipts.filter(r => r.status === 'PENDING').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8 pt-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Camera className="w-10 h-10 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-800">RechnungsHeld v3.2</h1>
          </div>
          <p className="text-gray-600 font-medium">EASY RECEIPT by save-house.de</p>
          <p className="text-sm text-gray-500 mt-1">Professionelle Belegerfassung mit Review-System</p>
          
          {/* Stats Overview */}
          {stats && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-2xl font-bold text-indigo-600">{stats.total_receipts || 0}</p>
                <p className="text-sm text-gray-600">Gesamt</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-2xl font-bold text-orange-600">{stats.pending || 0}</p>
                <p className="text-sm text-gray-600">Zu prüfen</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-2xl font-bold text-green-600">{stats.approved || 0}</p>
                <p className="text-sm text-gray-600">Genehmigt</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-2xl font-bold text-blue-600">
                  {stats.total_amount ? parseFloat(stats.total_amount).toFixed(2) : '0.00'} €
                </p>
                <p className="text-sm text-gray-600">Summe</p>
              </div>
            </div>
          )}
          
          <div className="mt-4 flex items-center justify-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-1">
              {backendStatus === 'ok' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span>Backend {backendStatus === 'ok' ? 'OK' : 'Error'}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4 text-purple-500" />
              <span>PDF Support</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Review-System</span>
            </div>
          </div>
        </header>

        {/* Upload Section */}
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

          {file && !uploading && (
            <button
              onClick={handleUpload}
              className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Beleg verarbeiten & prüfen
            </button>
          )}

          {uploading && (
            <div className="mt-4 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-gray-600">Beleg wird analysiert...</p>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <strong>❌ Fehler:</strong> {error}
              </div>
            </div>
          )}
        </div>

        {/* Receipts List */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              📋 Belege
              {pendingCount > 0 && (
                <span className="bg-orange-100 text-orange-800 text-sm px-2 py-1 rounded">
                  {pendingCount} zu prüfen
                </span>
              )}
            </h2>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value)
                  setTimeout(fetchReceipts, 0)
                }}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="all">Alle</option>
                <option value="pending">Zu prüfen</option>
                <option value="approved">Genehmigt</option>
              </select>
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
          </div>

          {receipts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Keine Belege vorhanden</p>
          ) : (
            <div className="space-y-3">
              {receipts.map(receipt => (
                <div 
                  key={receipt.id} 
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    receipt.status === 'PENDING' 
                      ? 'bg-orange-50 border-orange-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{receipt.merchant}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        receipt.status === 'PENDING' 
                          ? 'bg-orange-200 text-orange-800' 
                          : 'bg-green-200 text-green-800'
                      }`}>
                        {receipt.status === 'PENDING' ? '⏳ Zu prüfen' : '✅ Genehmigt'}
                      </span>
                      {receipt.confidence_overall && (
                        <span className={`px-2 py-1 rounded text-xs ${
                          receipt.confidence_overall >= 80 ? 'bg-green-100 text-green-800' :
                          receipt.confidence_overall >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {receipt.confidence_overall}% Konfidenz
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {receipt.status === 'PENDING' && (
                        <button
                          onClick={() => setEditingReceipt(receipt)}
                          className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 text-sm"
                        >
                          <Edit2 className="w-3 h-3" />
                          Prüfen
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(receipt.id, receipt.original_filename)}
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                      >
                        <Eye className="w-3 h-3" />
                        Original
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm text-gray-700">
                    <div>
                      <p className="text-xs text-gray-500">Brutto</p>
                      <p className="font-semibold">{receipt.amount ? parseFloat(receipt.amount).toFixed(2) : '0.00'} €</p>
                    </div>
                    {receipt.vat_amount && (
                      <>
                        <div>
                          <p className="text-xs text-gray-500">MwSt ({receipt.vat_rate}%)</p>
                          <p className="font-semibold">{parseFloat(receipt.vat_amount).toFixed(2)} €</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Netto</p>
                          <p className="font-semibold">{(parseFloat(receipt.amount) - parseFloat(receipt.vat_amount)).toFixed(2)} €</p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-xs text-gray-500">Datum</p>
                      <p className="font-semibold">{receipt.date ? receipt.date.split('T')[0] : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Typ</p>
                      <p className="font-semibold">{receipt.file_type === 'application/pdf' ? '📄 PDF' : '📸 Foto'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Review Modal */}
        {editingReceipt && (
          <ReviewModal
            receipt={editingReceipt}
            onSave={handleSaveReceipt}
            onClose={() => setEditingReceipt(null)}
          />
        )}
      </div>
    </div>
  )
}

// Review Modal Component
function ReviewModal({ receipt, onSave, onClose }) {
  const [formData, setFormData] = useState({
    id: receipt.id,
    merchant: receipt.merchant || '',
    amount: receipt.amount || '',
    date: receipt.date || '',
    category: receipt.category || 'Geschäftlich',
    invoice_number: receipt.invoice_number || '',
    vat_amount: receipt.vat_amount || '',
    vat_rate: receipt.vat_rate || 19,
    is_deductible: receipt.is_deductible !== false
  })

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Beleg prüfen & korrigieren</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>
          {receipt.confidence_overall && (
            <p className="text-sm text-gray-600 mt-2">
              Erkennungsgenauigkeit: <strong>{receipt.confidence_overall}%</strong>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Händler *
              {receipt.confidence_merchant && (
                <span className={`ml-2 text-xs ${
                  receipt.confidence_merchant >= 80 ? 'text-green-600' : 'text-orange-600'
                }`}>
                  ({receipt.confidence_merchant}% Konfidenz)
                </span>
              )}
            </label>
            <input
              type="text"
              value={formData.merchant}
              onChange={(e) => handleChange('merchant', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brutto-Betrag (€) *
                {receipt.confidence_amount && (
                  <span className={`ml-2 text-xs ${
                    receipt.confidence_amount >= 80 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    ({receipt.confidence_amount}%)
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Datum *
                {receipt.confidence_date && (
                  <span className={`ml-2 text-xs ${
                    receipt.confidence_date >= 80 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    ({receipt.confidence_date}%)
                  </span>
                )}
              </label>
              <input
                type="date"
                value={formData.date ? formData.date.split('T')[0] : ''}
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MwSt-Betrag (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.vat_amount}
                onChange={(e) => handleChange('vat_amount', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MwSt-Satz (%)</label>
              <select
                value={formData.vat_rate}
                onChange={(e) => handleChange('vat_rate', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="19">19%</option>
                <option value="7">7%</option>
                <option value="0">0%</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rechnungsnummer</label>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => handleChange('invoice_number', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="Geschäftlich">Geschäftlich</option>
              <option value="Privat">Privat</option>
              <option value="Reisekosten">Reisekosten</option>
              <option value="Büromaterial">Büromaterial</option>
              <option value="Software">Software</option>
              <option value="Hardware">Hardware</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="deductible"
              checked={formData.is_deductible}
              onChange={(e) => handleChange('is_deductible', e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="deductible" className="text-sm font-medium text-gray-700">
              Steuerlich absetzbar
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Beleg genehmigen & speichern
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default App