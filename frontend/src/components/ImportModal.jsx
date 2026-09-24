import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileSpreadsheet, FileText, Eye, CheckCircle, AlertCircle, Loader2, Settings } from 'lucide-react';
import { previewTradesImport, importTrades, previewBankStatementImport, importBankStatement, importBankStatementJson, importTradesJson, getImportFormatsByType, previewCCStatementImport, importCCStatement, importCCStatementJson } from '../api';
import { eventEmitter, EVENTS } from '../utils/events';


// ─── Client-side CSV parser using custom column-name mapping ─────────────────
function splitCSVLine(line) {
  const result = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === ',' && !inQuote) { result.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}

function parseCustomCSV(text, fmt) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const skip = fmt.skipRows ?? 1;
  if (lines.length <= skip) return [];
  const header = splitCSVLine(lines[skip - 1]).map(h => h.replace(/^"|"$/g, '').toLowerCase());
  const dataLines = lines.slice(skip);

  const col = (name) => {
    if (!name || !name.trim()) return -1;
    return header.findIndex(h => h === name.trim().toLowerCase());
  };
  const cell = (row, name) => {
    const idx = col(name);
    if (idx < 0) return '';
    return (row[idx] || '').replace(/^"|"$/g, '').trim();
  };

  if (fmt.type?.toUpperCase() === 'BANK') {
    return dataLines.map((line, i) => {
      const row = splitCSVLine(line);
      const date    = cell(row, fmt.dateColumn);
      const desc    = cell(row, fmt.descriptionColumn || fmt.descColumn);
      const debit   = parseFloat(cell(row, fmt.debitColumn).replace(/,/g,'')) || 0;
      const credit  = parseFloat(cell(row, fmt.creditColumn).replace(/,/g,'')) || 0;
      const balRaw  = fmt.balanceColumn ? cell(row, fmt.balanceColumn).replace(/,/g,'') : '';
      const balance = balRaw ? parseFloat(balRaw) : null;
      if (!date) return null;
      const row2 = {
        rowNum: i + fmt.skipRows + 1, date, description: desc,
        amount: debit > 0 ? debit : credit,
        type: debit > 0 ? 'DEBIT' : 'CREDIT',
        category: 'Uncategorized',
      };
      if (balance !== null && !isNaN(balance)) row2.balance = balance;
      return row2;
    }).filter(Boolean);
  } else {
    return dataLines.map((line, i) => {
      const row = splitCSVLine(line);
      const symbol  = cell(row, fmt.symbolColumn);
      const date    = cell(row, fmt.dateColumn);
      const bs      = cell(row, fmt.buySellColumn).toUpperCase();
      const qty     = parseFloat(cell(row, fmt.qtyColumn).replace(/,/g,'')) || 0;
      const price   = parseFloat(cell(row, fmt.priceColumn).replace(/,/g,'')) || 0;
      const value   = parseFloat(cell(row, fmt.tradeValueColumn || '').replace(/,/g,'')) || (qty * price);
      if (!symbol || !date) return null;
      const isBuy = bs.startsWith('B');
      return {
        rowNum: i + fmt.skipRows + 1, stockName: symbol, entryDate: date,
        tradeType: isBuy ? 'LONG' : 'SHORT', quantity: qty,
        buyPrice: isBuy ? price : null, sellPrice: !isBuy ? price : null,
        investedAmount: value, status: 'OPEN', segment: 'EQUITY',
        positionType: 'SWING', broker: fmt.name.toUpperCase(),
      };
    }).filter(Boolean);
  }
}


const ImportModal = ({ isOpen, onClose, type, bankName }) => {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('csv');
  const [selectedFormat, setSelectedFormat] = useState(null); // Selected format from API
  const [availableFormats, setAvailableFormats] = useState([]); // Formats from API
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [formatsLoading, setFormatsLoading] = useState(false);
  const [pdfPassword, setPdfPassword] = useState('');
  const fileInputRef = useRef(null);

  const isTrades = type === 'trades';
  const isBankStatement = type === 'bank-statement';
  const isCreditCard = type === 'credit-card';

  // Load formats from API whenever modal opens or type changes
  useEffect(() => {
    if (isOpen) loadFormats();
  }, [isOpen, type]);

  const loadFormats = async () => {
    setFormatsLoading(true);
    try {
      const apiType = type === 'trades' ? 'BROKER' : type === 'credit-card' ? 'CREDIT_CARD' : 'BANK';
      const response = await getImportFormatsByType(apiType);
      setAvailableFormats(response.data || []);
      const defaultFormat = response.data?.find(f => f.default);
      if (defaultFormat) setSelectedFormat(defaultFormat);
    } catch (err) {
      console.error('Failed to load import formats:', err);
      setError('Failed to load import formats. Please try again.');
    } finally {
      setFormatsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    console.log('File selected:', selectedFile?.name, 'Type:', selectedFile?.type);
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewData(null);
      setResult(null);
      setError(null);
      setPdfPassword('');
      // Auto-detect format from file extension
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') {
        setFormat('excel');
        console.log('Auto-set format to: excel');
      } else if (ext === 'pdf') {
        setFormat('pdf');
        console.log('Auto-set format to: pdf');
      } else {
        setFormat('csv');
        console.log('Auto-set format to: csv');
      }
    }
  };

  // Read file as text for client-side custom parsing
  const readFileText = () => new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => res(e.target.result);
    reader.onerror = rej;
    reader.readAsText(file);
  });

  const handlePreview = async () => {
    console.log('handlePreview called - file:', file?.name, 'format:', format, 'selectedFormat:', selectedFormat?.name);
    if (!file) { setError('Please select a file first'); return; }
    if (!selectedFormat && format !== 'pdf') { setError('Please select an import format'); return; }
    setLoading(true); setError(null);
    try {
      console.log('Sending preview request...');
      if (format === 'csv') {
        // Client-side parse using the selected format's column mapping
        const text = await readFileText();
        const rows = parseCustomCSV(text, selectedFormat);
        setPreviewData({
          success: true, totalRows: rows.length,
          previewData: rows.slice(0, 10),
          isPreview: true, _customRows: rows,
        });
      } else {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('format', format);
        if (selectedFormat?.id) formData.append('formatId', selectedFormat.id);
        if (pdfPassword) formData.append('pdfPassword', pdfPassword);
        const brokerKey = selectedFormat ? selectedFormat.name.toUpperCase().split(' ')[0] : 'GENERIC';
        let response;
        if (isTrades) {
          formData.append('brokerType', brokerKey);
          response = await previewTradesImport(formData);
        } else if (isCreditCard) {
          response = await previewCCStatementImport(formData);
        } else {
          formData.append('bankType', brokerKey);
          formData.append('bankName', selectedFormat?.linkedAsset?.name || selectedFormat?.name || bankName || 'Unknown');
          response = await previewBankStatementImport(formData);
        }
        if (response.data.success) setPreviewData(response.data);
        else setError(response.data.message || 'Preview failed');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError(err.response?.data?.message || err.message || 'Error previewing file');
    } finally { setLoading(false); }
  };

  const handleImport = async () => {
    console.log('handleImport called - file:', file?.name, 'format:', format, 'selectedFormat:', selectedFormat?.name);
    if (!file) { setError('Please select a file first'); return; }
    if (!selectedFormat && format !== 'pdf') { setError('Please select an import format'); return; }
    setImporting(true); setError(null);
    try {
      console.log('Sending import request...');
      if (format === 'csv') {
        // Client-side parse then send as JSON to backend
        const rows = previewData?._customRows || parseCustomCSV(await readFileText(), selectedFormat);
        const bankNameToUse = selectedFormat.linkedAsset?.name || selectedFormat.name;
        let response;
        if (isCreditCard) {
          const transactions = rows.map(r => ({
            date: r.date, description: r.description, title: r.description,
            amount: r.amount, type: r.type, budgetCategory: r.category, paymentSource: bankNameToUse,
            ...(r.balance != null ? { balanceAfter: r.balance } : {}),
          }));
          response = await importCCStatementJson({ bankName: bankNameToUse, transactions });
        } else if (isBankStatement) {
          const transactions = rows.map(r => ({
            date: r.date, description: r.description, title: r.description,
            amount: r.amount, type: r.type, budgetCategory: r.category, paymentSource: bankNameToUse,
            ...(r.balance != null ? { balanceAfter: r.balance } : {}),
          }));
          response = await importBankStatementJson({ bankName: bankNameToUse, accountType: 'BANK', transactions });
        } else {
          const trades = rows.map(r => ({
            stockName: r.stockName, entryDate: r.entryDate, tradeType: r.tradeType,
            quantity: r.quantity, buyPrice: r.buyPrice, sellPrice: r.sellPrice,
            investedAmount: r.investedAmount, status: r.status, segment: r.segment,
            positionType: r.positionType, broker: r.broker,
          }));
          response = await importTradesJson({ trades });
        }
        setResult({ ...response.data, message: `${selectedFormat.name}: ${response.data.message}` });
      } else {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('format', format);
        if (selectedFormat?.id) formData.append('formatId', selectedFormat.id);
        if (pdfPassword) formData.append('pdfPassword', pdfPassword);
        const brokerKey = selectedFormat ? selectedFormat.name.toUpperCase().split(' ')[0] : 'GENERIC';
        let response;
        if (isTrades) {
          formData.append('brokerType', brokerKey);
          response = await importTrades(formData);
        } else if (isCreditCard) {
          formData.append('ccName', selectedFormat?.linkedAsset?.name || selectedFormat?.name || 'Credit Card');
          response = await importCCStatement(formData);
        } else {
          formData.append('bankType', brokerKey);
          formData.append('bankName', selectedFormat?.linkedAsset?.name || selectedFormat?.name || bankName || 'Unknown');
          response = await importBankStatement(formData);
        }
        setResult(response.data);
        if (response.data.success && response.data.importedCount > 0)
          eventEmitter.emit(EVENTS.TRANSACTIONS_IMPORTED, response.data);
      }
      setPreviewData(null);
    } catch (err) {
      console.error('Import error:', err);
      setError(err.response?.data?.message || 'Import failed');
    } finally { setImporting(false); }
  };

  const handleDownloadTemplate = () => {
    const csvContent = isTrades
      ? 'Stock Name,Symbol,Trade Type (BUY/SELL),Quantity,Entry Price,Exit Price,Entry Date (dd-MM-yyyy),Exit Date (dd-MM-yyyy),P&L,Status (OPEN/CLOSED),Notes\nReliance Industries,RELIANCE,BUY,10,2450.50,2500.00,15-01-2024,20-01-2024,495.00,CLOSED,Intraday trade'
      : 'Date (dd-MM-yyyy),Description,Debit Amount,Credit Amount,Category\n15-01-2024,ATM Withdrawal,5000.00,0.00,Cash\n16-01-2024,Salary Credit,0.00,50000.00,Salary\n17-01-2024,Swiggy Order,450.00,0.00,Food';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isTrades ? 'trades_template.csv' : 'bank_statement_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">
              Import {isTrades ? 'Trades' : isCreditCard ? 'Credit Card Statement' : 'Bank Statement'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* File Upload Section */}
          {!result && (
            <>
              {/* Format Selection */}
              <div className="space-y-1.5">
                <div className="flex gap-2 flex-wrap">
                  {[
                    {val:'csv',   label:'CSV',   ext:'.csv',        Icon:FileText},
                    {val:'excel', label:'Excel', ext:'.xls / .xlsx', Icon:FileSpreadsheet},
                    {val:'pdf',   label:'PDF',   ext:'.pdf',        Icon:FileText},
                  ].map(({val,label,ext,Icon})=>(
                    <button key={val}
                      onClick={() => setFormat(val)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                        format === val ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500 dark:text-gray-300'
                      }`}>
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                      <span className={`text-[10px] ${format === val ? 'text-indigo-400' : 'text-gray-400'}`}>{ext}</span>
                    </button>
                  ))}
                </div>
                {format === 'pdf' && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg">
                    ⚠️ PDF parsing uses text extraction — only built-in bank formats (ICICI, HDFC, SBI) are supported. Custom formats work with CSV/Excel only.
                  </p>
                )}
                {(format === 'pdf' || format === 'excel') && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">🔒 Password (if protected):</span>
                    <input
                      type="password"
                      value={pdfPassword}
                      onChange={e => setPdfPassword(e.target.value)}
                      placeholder="Leave blank if not password protected"
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                )}
              </div>



              {/* Import Format Selector from API */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {isTrades ? 'Select Broker Format:' : isCreditCard ? 'Select Credit Card Format:' : 'Select Bank Format:'}
                </span>
                <div className="flex gap-2 flex-wrap">
                  {formatsLoading ? (
                    <span className="text-xs text-gray-400 dark:text-gray-500">Loading formats...</span>
                  ) : availableFormats.length === 0 ? (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      No formats available. Add in <Settings size={11} className="inline" /> Settings
                    </span>
                  ) : (
                    availableFormats.map(fmt => {
                      const isSystem = fmt.system;
                      const isLinked = fmt.linkedAssetId;
                      return (
                        <button key={fmt.id}
                          onClick={() => setSelectedFormat(fmt)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all flex items-center gap-1 ${
                            selectedFormat?.id === fmt.id
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : isSystem
                                ? 'border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
                                : 'border-orange-200 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:border-orange-400'
                          }`}>
                          {isSystem ? '🏦' : '✦'}
                          {fmt.name}
                          {isLinked && <span className="text-[10px] opacity-70">(linked)</span>}
                        </button>
                      );
                    })
                  )}
                </div>
                {selectedFormat && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Using: <strong>{selectedFormat.name}</strong>
                    {selectedFormat.linkedAssetName && (
                      <span className="text-green-600 dark:text-green-400"> → linked to {selectedFormat.linkedAssetName}</span>
                    )}
                    {!selectedFormat.linkedAssetName && (
                      <span className="text-orange-500"> → will create asset if not exists</span>
                    )}
                  </p>
                )}
              </div>

              {/* File Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                  file
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {file ? (
                  <div className="space-y-2">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">
                      Supports CSV, Excel, and PDF files
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Template Download */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Download template to ensure correct format:
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Download {isTrades ? 'Trades' : 'Bank Statement'} Template →
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handlePreview}
                  disabled={!file || loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  Preview
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || importing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {importing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Import
                </button>
              </div>
            </>
          )}

          {/* Preview Table */}
          {previewData?.previewData && (
            <div className="space-y-2">
              <h3 className="font-semibold">
                Preview ({previewData.totalRows} records)
              </h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {Object.keys(previewData.previewData[0] || {}).map((key) => (
                        <th key={key} className="px-3 py-2 text-left font-medium capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewData.previewData.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((val, i) => (
                          <td key={i} className="px-3 py-2">{val?.toString() || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.totalRows > 5 && (
                  <p className="text-center text-sm text-gray-500 py-2">
                    ...and {previewData.totalRows - 5} more records
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="w-6 h-6 text-green-500 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-500 dark:text-red-400" />
                  )}
                  <h3 className={`font-semibold ${result.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                    {result.success ? 'Import Successful!' : 'Import Failed'}
                  </h3>
                </div>
                <p className={`mt-2 text-sm ${result.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>{result.message}</p>
              </div>

              <div className={`grid gap-4 ${result.duplicatesSkipped > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold dark:text-white">{result.totalRows}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.importedCount}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Imported</p>
                </div>
                {result.duplicatesSkipped > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{result.duplicatesSkipped}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Duplicates</p>
                  </div>
                )}
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{result.failedCount}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
                </div>
              </div>

              {result.errors?.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-red-700 dark:text-red-300 mb-2">Errors:</h4>
                  <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                    {result.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>...and {result.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}

              <button
                onClick={() => {
                  setResult(null);
                  setFile(null);
                  setPreviewData(null);
                }}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Import Another File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
