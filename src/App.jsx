import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import html2canvas from 'html2canvas'

function App() {
  const [status, setStatus] = useState('Checking backend...')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [error, setError] = useState(null)
  const [receipts, setReceipts] = useState([])
  const [showExportMenu, setShowExportMenu] = useState(false)
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

  // Load receipts
  const loadReceipts = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/receipts`)
      if (response.ok) {
        const data = await response.json()
        setReceipts(data.receipts || [])
      }
    } catch (error) {
      console.error('Error loading receipts:', error)
    }
  }

  // Check backend on mount
  useEffect(() => {
    checkBackend()
    loadReceipts()
  }, [])

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file) return

    setUploading(true)
    setError(null)
    setUploadResult(null)

    const formData = new FormData()
    formData.append('receipt', file)

    try {
      const response = await fetch(`${backendUrl}/api/receipts/upload`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setUploadResult(data)
        loadReceipts()
      } else {
        const errorData = await response.json()
        setError(`Upload failed: ${errorData.error || response.statusText} (Status: ${response.status})`)
      }
    } catch (error) {
      setError(`Upload error: ${error.message}`)
      console.error('Detailed error:', error)
    } finally {
      setUploading(false)
    }
  }

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  // Get category badge color
  const getCategoryColor = (category) => {
    switch (category) {
      case 'Geschäftlich':
        return 'bg-blue-100 text-blue-800'
      case 'Absetzbar':
        return 'bg-green-100 text-green-800'
      case 'Privat':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Export as CSV
  const exportCSV = () => {
    if (receipts.length === 0) {
      alert('Keine Belege zum Exportieren vorhanden!')
      return
    }

    const headers = ['Händler', 'Betrag', 'Datum', 'Kategorie', 'Erstellt am']
    const csvRows = [headers.join(';')]

    receipts.forEach(receipt => {
      const row = [
        receipt.merchant || 'Unbekannt',
        receipt.amount || 'N/A',
        receipt.date || 'Unbekannt',
        receipt.category || 'Unbekannt',
        new Date(receipt.created_at).toLocaleDateString('de-DE')
      ]
      csvRows.push(row.join(';'))
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    downloadFile(blob, `belege_${getDateString()}.csv`)
  }

  // Export as Excel
  const exportExcel = () => {
    if (receipts.length === 0) {
      alert('Keine Belege zum Exportieren vorhanden!')
      return
    }

    const data = receipts.map(receipt => ({
      'Händler': receipt.merchant || 'Unbekannt',
      'Betrag': receipt.amount || 'N/A',
      'Datum': receipt.date || 'Unbekannt',
      'Kategorie': receipt.category || 'Unbekannt',
      'Erstellt am': new Date(receipt.created_at).toLocaleDateString('de-DE')
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Belege')
    
    // Auto-size columns
    const maxWidth = data.reduce((w, r) => Math.max(w, r['Händler'].length), 10)
    ws['!cols'] = [
      { wch: maxWidth },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 }
    ]

    XLSX.writeFile(wb, `belege_${getDateString()}.xlsx`)
  }

  // Export as PDF
  const exportPDF = () => {
    if (receipts.length === 0) {
      alert('Keine Belege zum Exportieren vorhanden!')
      return
    }

    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(20)
    doc.text('Easy Receipt - Belege Übersicht', 14, 22)
    
    // Date
    doc.setFontSize(10)
    doc.text(`Exportiert am: ${new Date().toLocaleDateString('de-DE')}`, 14, 30)
    
    // Table
    const tableData = receipts.map(receipt => [
      receipt.merchant || 'Unbekannt',
      receipt.amount || 'N/A',
      receipt.date || 'Unbekannt',
      receipt.category || 'Unbekannt'
    ])
    
    doc.autoTable({
      head: [['Händler', 'Betrag', 'Datum', 'Kategorie']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] }
    })
    
    doc.save(`belege_${getDateString()}.pdf`)
  }

  // Export as Image (JPG/PNG)
  const exportImage = async (format = 'png') => {
    const element = document.getElementById('receipts-list')
    if (!element) {
      alert('Belege-Liste nicht gefunden!')
      return
    }

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2
      })
      
      canvas.toBlob((blob) => {
        const extension = format === 'jpeg' ? 'jpg' : format
        downloadFile(blob, `belege_${getDateString()}.${extension}`)
      }, `image/${format}`, 0.95)
    } catch (error) {
      alert('Fehler beim Erstellen des Bildes: ' + error.message)
    }
  }

  // Helper: Download file
  const downloadFile = (blob, filename) => {
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Helper: Get date string
  const getDateString = () => {
    return new Date().toISOString().split('T')[0]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            📸 Easy Receipt
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Beleg hochladen, OCR macht den Rest!
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
              🚀 Upload Ready
            </span>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            📤 Beleg hochladen
          </h2>
          
          {/* Drag & Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-4 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 transition cursor-pointer"
          >
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="file-input"
              disabled={uploading}
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-xl text-gray-700 mb-2">
                Beleg hier ablegen oder klicken
              </p>
              <p className="text-sm text-gray-500">
                Unterstützt: JPG, PNG, PDF
              </p>
            </label>
          </div>

          {/* Upload Status */}
          {uploading && (
            <div className="mt-4 p-4 bg-blue-100 text-blue-800 rounded-lg">
              ⏳ Beleg wird verarbeitet...
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-lg">
              ❌ {error}
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className="mt-4 p-6 bg-green-50 rounded-lg border-2 border-green-200">
              <h3 className="text-xl font-bold text-green-800 mb-4">
                ✅ Beleg erfolgreich verarbeitet!
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Händler</p>
                  <p className="text-lg font-semibold">{uploadResult.merchant || 'Unbekannt'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Betrag</p>
                  <p className="text-lg font-semibold">{uploadResult.amount || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Datum</p>
                  <p className="text-lg font-semibold">{uploadResult.date || 'Unbekannt'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Kategorie</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getCategoryColor(uploadResult.category)}`}>
                    {uploadResult.category || 'Unbekannt'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Receipts List */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold text-gray-800">
              📋 Letzte Belege
            </h2>
            {receipts.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2"
                >
                  📥 Export
                  <span className="text-xs">▼</span>
                </button>
                
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
                    <button
                      onClick={() => { exportPDF(); setShowExportMenu(false) }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-100 rounded-t-lg flex items-center gap-2"
                    >
                      📄 PDF
                    </button>
                    <button
                      onClick={() => { exportExcel(); setShowExportMenu(false) }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-100 flex items-center gap-2"
                    >
                      📗 Excel (XLSX)
                    </button>
                    <button
                      onClick={() => { exportCSV(); setShowExportMenu(false) }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-100 flex items-center gap-2"
                    >
                      📊 CSV
                    </button>
                    <button
                      onClick={() => { exportImage('png'); setShowExportMenu(false) }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-100 flex items-center gap-2"
                    >
                      🖼️ PNG
                    </button>
                    <button
                      onClick={() => { exportImage('jpeg'); setShowExportMenu(false) }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-100 rounded-b-lg flex items-center gap-2"
                    >
                      🖼️ JPG
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div id="receipts-list">
            {receipts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Noch keine Belege hochgeladen
              </p>
            ) : (
              <div className="space-y-4">
                {receipts.slice(0, 10).map((receipt) => (
                  <div key={receipt.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{receipt.merchant || 'Unbekannt'}</h3>
                        <p className="text-sm text-gray-600">
                          {receipt.date || 'Datum unbekannt'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-800">{receipt.amount || 'N/A'}</p>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(receipt.category)}`}>
                          {receipt.category || 'Unbekannt'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Backend Status */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
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