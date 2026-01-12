import React, { useState, useEffect } from 'react';
import { 
  Upload, X, CheckCircle, AlertCircle, Download, 
  FileText, Edit2, Trash2, Calendar, DollarSign,
  Table, FileSpreadsheet, FileDown
} from 'lucide-react';

const API_URL = 'https://easy-receipt-backend-production.up.railway.app';

function App() {
  const [receipts, setReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [backendStatus, setBackendStatus] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, total_amount: 0 });

  useEffect(() => {
    fetchReceipts();
    checkBackendStatus();
  }, []);

  const checkBackendStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      const data = await response.json();
      setBackendStatus(data);
    } catch (error) {
      setBackendStatus({ status: 'error' });
    }
  };

  const fetchReceipts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/receipts`);
      const data = await response.json();
      setReceipts(data);
      
      const statsResponse = await fetch(`${API_URL}/api/receipts/stats`);
      const statsData = await statsResponse.json();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    }
  };

  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/receipts/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        await fetchReceipts();
        setShowUploadModal(false);
        
        const newReceiptResponse = await fetch(`${API_URL}/api/receipts/${data.receiptId}`);
        const newReceipt = await newReceiptResponse.json();
        setSelectedReceipt(newReceipt);
        setShowReviewModal(true);
      } else {
        alert(`Upload fehlgeschlagen: ${data.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (receipt) => {
    try {
      await fetch(`${API_URL}/api/receipts/${receipt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...receipt, status: 'APPROVED' })
      });
      
      await fetchReceipts();
      setShowReviewModal(false);
      setShowEditModal(false);
    } catch (error) {
      console.error('Approve error:', error);
      alert('Genehmigung fehlgeschlagen');
    }
  };

  const handleEdit = async (updatedReceipt) => {
    try {
      await fetch(`${API_URL}/api/receipts/${updatedReceipt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedReceipt)
      });
      
      await fetchReceipts();
      setShowEditModal(false);
    } catch (error) {
      console.error('Edit error:', error);
      alert('Bearbeitung fehlgeschlagen');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Beleg wirklich löschen?')) return;

    try {
      await fetch(`${API_URL}/api/receipts/${id}`, { method: 'DELETE' });
      await fetchReceipts();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Löschen fehlgeschlagen');
    }
  };

  const handleDownload = async (id, filename) => {
    try {
      const response = await fetch(`${API_URL}/api/receipts/${id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Download fehlgeschlagen');
    }
  };

  const handleExport = async (format) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_URL}/api/receipts/export/${format}`, {
        method: 'GET',
        headers: {
          'Accept': format === 'pdf' ? 'application/pdf' : 
                   format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                   format === 'csv' ? 'text/csv' : 'text/plain'
        }
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `belege_${new Date().toISOString().split('T')[0]}.${format}`;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log(`✅ ${format.toUpperCase()} Export erfolgreich`);
    } catch (error) {
      console.error(`Export Error (${format}):`, error);
      alert(`Export fehlgeschlagen: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const filteredReceipts = receipts.filter(r => {
    if (filter === 'ALL') return true;
    return r.status === filter;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">RechnungsHeld</h1>
              <p className="text-blue-100 mt-1">Professionelle Belegerfassung mit OCR</p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`px-3 py-1 rounded-full text-sm ${
                backendStatus?.status === 'ok' ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {backendStatus?.status === 'ok' ? '✓ Online' : '✗ Offline'}
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                <Upload className="w-5 h-5" />
                Beleg hochladen
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Gesamt</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Zu prüfen</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Genehmigt</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Summe</p>
                <p className="text-2xl font-bold text-gray-800">
                  {parseFloat(stats.total_amount || 0).toFixed(2)}€
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Export Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Belege exportieren</h2>
              <p className="text-sm text-gray-600 mt-1">
                Exportiere genehmigte Belege für deine Steuererklärung
              </p>
            </div>
            <Download className="w-6 h-6 text-blue-600" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => handleExport('txt')}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">TXT</span>
            </button>

            <button
              onClick={() => handleExport('csv')}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Table className="w-5 h-5" />
              <span className="font-medium">CSV</span>
            </button>

            <button
              onClick={() => handleExport('xlsx')}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span className="font-medium">XLSX</span>
            </button>

            <button
              onClick={() => handleExport('pdf')}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <FileDown className="w-5 h-5" />
              <span className="font-medium">PDF</span>
            </button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>Hinweis:</strong> Nur genehmigte Belege (Status: APPROVED) werden exportiert.
              {' '}{filteredReceipts.filter(r => r.status === 'APPROVED').length} von {filteredReceipts.length} Belegen werden exportiert.
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alle ({receipts.length})
            </button>
            <button
              onClick={() => setFilter('PENDING')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'PENDING' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Zu prüfen ({stats.pending})
            </button>
            <button
              onClick={() => setFilter('APPROVED')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'APPROVED' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Genehmigt ({stats.approved})
            </button>
          </div>
        </div>

        {/* Receipts Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Händler</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Betrag</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategorie</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.date ? new Date(receipt.date).toLocaleDateString('de-DE') : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{receipt.merchant || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {receipt.amount ? `${parseFloat(receipt.amount).toFixed(2)}€` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {receipt.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        getConfidenceColor(receipt.confidence_overall)
                      }`}>
                        {receipt.confidence_overall}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        receipt.status === 'APPROVED' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {receipt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedReceipt(receipt);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Bearbeiten"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(receipt.id, receipt.original_filename)}
                          className="text-green-600 hover:text-green-800"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(receipt.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredReceipts.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Keine Belege gefunden</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleFileUpload}
          isLoading={isLoading}
        />
      )}

      {/* Review Modal */}
      {showReviewModal && selectedReceipt && (
        <ReviewModal
          receipt={selectedReceipt}
          onClose={() => setShowReviewModal(false)}
          onApprove={handleApprove}
          onEdit={() => {
            setShowReviewModal(false);
            setShowEditModal(true);
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedReceipt && (
        <EditModal
          receipt={selectedReceipt}
          onClose={() => setShowEditModal(false)}
          onSave={handleEdit}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}

// ============================================================================
// UPLOAD MODAL COMPONENT
// ============================================================================

function UploadModal({ onClose, onUpload, isLoading }) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Beleg hochladen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            Datei hierher ziehen oder klicken zum Auswählen
          </p>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleChange}
            className="hidden"
            id="file-upload"
            disabled={isLoading}
          />
          <label
            htmlFor="file-upload"
            className={`inline-block px-6 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Wird hochgeladen...' : 'Datei auswählen'}
          </label>
          <p className="text-xs text-gray-500 mt-4">PDF, JPG oder PNG (max. 10MB)</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// REVIEW MODAL COMPONENT
// ============================================================================

function ReviewModal({ receipt, onClose, onApprove, onEdit }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Beleg überprüfen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Händler</label>
            <input
              type="text"
              value={receipt.merchant || ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Betrag (€)</label>
              <input
                type="text"
                value={receipt.amount || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
              <input
                type="date"
                value={receipt.date || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MwSt-Betrag (€)</label>
              <input
                type="text"
                value={receipt.vat_amount || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MwSt-Satz</label>
              <input
                type="text"
                value={receipt.vat_rate ? `${receipt.vat_rate}%` : ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
            <input
              type="text"
              value={receipt.category || ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rechnungsnummer</label>
            <input
              type="text"
              value={receipt.invoice_number || ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={() => onApprove(receipt)}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Genehmigen
            </button>
            <button
              onClick={onEdit}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Bearbeiten
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Später
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EDIT MODAL COMPONENT
// ============================================================================

function EditModal({ receipt, onClose, onSave, onApprove }) {
  const [editedReceipt, setEditedReceipt] = useState(receipt);

  const handleSave = () => {
    onSave(editedReceipt);
  };

  const handleSaveAndApprove = () => {
    onApprove({ ...editedReceipt, status: 'APPROVED' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Beleg bearbeiten</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Händler *</label>
            <input
              type="text"
              value={editedReceipt.merchant || ''}
              onChange={(e) => setEditedReceipt({ ...editedReceipt, merchant: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Betrag (€) *</label>
              <input
                type="number"
                step="0.01"
                value={editedReceipt.amount || ''}
                onChange={(e) => setEditedReceipt({ ...editedReceipt, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
              <input
                type="date"
                value={editedReceipt.date || ''}
                onChange={(e) => setEditedReceipt({ ...editedReceipt, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MwSt-Betrag (€)</label>
              <input
                type="number"
                step="0.01"
                value={editedReceipt.vat_amount || ''}
                onChange={(e) => setEditedReceipt({ ...editedReceipt, vat_amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MwSt-Satz (%)</label>
              <select
                value={editedReceipt.vat_rate || ''}
                onChange={(e) => setEditedReceipt({ ...editedReceipt, vat_rate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Keine</option>
                <option value="7">7%</option>
                <option value="19">19%</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
            <select
              value={editedReceipt.category || ''}
              onChange={(e) => setEditedReceipt({ ...editedReceipt, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Kategorie wählen</option>
              <option value="Lebensmittel">Lebensmittel</option>
              <option value="Baumarkt">Baumarkt</option>
              <option value="Baustoff">Baustoff</option>
              <option value="Tankstelle">Tankstelle</option>
              <option value="Möbel">Möbel</option>
              <option value="Elektronik">Elektronik</option>
              <option value="Telekommunikation">Telekommunikation</option>
              <option value="Energie">Energie</option>
              <option value="Entsorgung">Entsorgung</option>
              <option value="Drogerie">Drogerie</option>
              <option value="Werkzeug">Werkzeug</option>
              <option value="KFZ">KFZ</option>
              <option value="Bürobedarf">Bürobedarf</option>
              <option value="Sonstige">Sonstige</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rechnungsnummer</label>
            <input
              type="text"
              value={editedReceipt.invoice_number || ''}
              onChange={(e) => setEditedReceipt({ ...editedReceipt, invoice_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSaveAndApprove}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Speichern & Genehmigen
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Nur Speichern
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;