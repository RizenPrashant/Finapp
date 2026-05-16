import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileSpreadsheet, FileText, Eye, CheckCircle, AlertCircle, Loader2, Settings } from 'lucide-react';
import { previewTradesImport, importTrades, previewBankStatementImport, importBankStatement, importBankStatementJson, importTradesJson } from '../api';

const IMPORT_FORMATS_KEY = 'finapp_custom_import_formats';
const CUSTOM_BANK_TYPES_KEY   = 'finapp_custom_bank_types';
const CUSTOM_BROKER_TYPES_KEY = 'finapp_custom_broker_types';
const BUILT_IN_BANK_TYPES   = ['SBI', 'ICICI', 'HDFC', 'GENERIC'];
const BUILT_IN_BROKER_TYPES = ['ZERODHA', 'UPSTOX', 'GENERIC'];

// ─── Client-side CSV parser using custom column-name mapping ─────────────────
function parseCustomCSV(text, fmt) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length <= fmt.skipRows) return [];
  const header = lines[fmt.skipRows - 1].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const dataLines = lines.slice(fmt.skipRows);

  const col = (name) => {
    if (!name || !name.trim()) return -1;
    return header.findIndex(h => h === name.trim().toLowerCase());
  };
  const cell = (row, name) => {
    const idx = col(name);
    if (idx < 0) return '';
    return (row[idx] || '').trim().replace(/^"|"$/g, '');
  };

  if (fmt.type === 'bank') {
    return dataLines.map((line, i) => {
      const row = line.split(',');
      const date   = cell(row, fmt.dateColumn);
      const desc   = cell(row, fmt.descColumn);
      const debit  = parseFloat(cell(row, fmt.debitColumn).replace(/,/g,'')) || 0;
      const credit = parseFloat(cell(row, fmt.creditColumn).replace(/,/g,'')) || 0;
      if (!date) return null;
      return {
        rowNum: i + fmt.skipRows + 1, date, description: desc,
        amount: debit > 0 ? debit : credit,
        type: debit > 0 ? 'DEBIT' : 'CREDIT',
        category: 'Uncategorized',
      };
    }).filter(Boolean);
  } else {
    return dataLines.map((line, i) => {
      const row = line.split(',');
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
  const [bankType, setBankType]       = useState('SBI');
  const [brokerType, setBrokerType]   = useState('ZERODHA');
  const [accountType, setAccountType]  = useState('BANK'); // BANK or CREDIT_CARD
  const [customFormat, setCustomFormat] = useState(null);  // selected custom format object or null
  const [customFormats, setCustomFormats] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const isTrades = type === 'trades';
  const isBankStatement = type === 'bank-statement';

  // Merge built-in + custom types from Settings
  const bankTypes = [...BUILT_IN_BANK_TYPES, ...(JSON.parse(localStorage.getItem(CUSTOM_BANK_TYPES_KEY) || '[]'))];
  const brokerTypes = [...BUILT_IN_BROKER_TYPES, ...(JSON.parse(localStorage.getItem(CUSTOM_BROKER_TYPES_KEY) || '[]'))];

  // Load custom formats from localStorage whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(IMPORT_FORMATS_KEY);
      const all = saved ? JSON.parse(saved) : [];
      const relevant = all.filter(f => isTrades ? f.type === 'broker' : f.type === 'bank');
      setCustomFormats(relevant);
      setCustomFormat(null);
    }
  }, [isOpen, isTrades]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewData(null);
      setResult(null);
      setError(null);
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
    if (!file) { setError('Please select a file first'); return; }
    setLoading(true); setError(null);
    try {
      if (customFormat && format !== 'pdf') {
        // Client-side parse using custom column mapping
        const text = await readFileText();
        const rows = parseCustomCSV(text, customFormat);
        setPreviewData({
          success: true, totalRows: rows.length,
          previewData: rows.slice(0, 10),
          isPreview: true, _customRows: rows,
        });
      } else {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('format', format);
        if (isBankStatement) {
          formData.append('bankName', bankName || 'Imported Bank');
          formData.append('bankType', bankType);
          formData.append('accountType', accountType);
        } else if (isTrades) {
          formData.append('brokerType', brokerType);
        }
        const response = isTrades
          ? await previewTradesImport(formData)
          : await previewBankStatementImport(formData);
        if (response.data.success) setPreviewData(response.data);
        else setError(response.data.message || 'Preview failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error previewing file');
    } finally { setLoading(false); }
  };

  const handleImport = async () => {
    if (!file) { setError('Please select a file first'); return; }
    setImporting(true); setError(null);
    try {
      if (customFormat && format !== 'pdf') {
        // Client-side parse then send as JSON to backend
        const rows = previewData?._customRows || parseCustomCSV(await readFileText(), customFormat);
        let response;
        if (isBankStatement) {
          const bName = bankName || customFormat.name;
          const transactions = rows.map(r => ({
            date: r.date, description: r.description, title: r.description,
            amount: r.amount, type: r.type,
            budgetCategory: r.category, paymentSource: bName,
          }));
          response = await importBankStatementJson({ bankName: bName, accountType, transactions });
        } else {
          const trades = rows.map(r => ({
            stockName: r.stockName, entryDate: r.entryDate,
            tradeType: r.tradeType, quantity: r.quantity,
            buyPrice: r.buyPrice, sellPrice: r.sellPrice,
            investedAmount: r.investedAmount, status: r.status,
            segment: r.segment, positionType: r.positionType, broker: r.broker,
          }));
          response = await importTradesJson({ trades });
        }
        setResult({
          ...response.data,
          message: `Custom format "${customFormat.name}": ${response.data.message}`,
        });
      } else {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('format', format);
        if (isBankStatement) {
          formData.append('bankName', bankName || 'Imported Bank');
          formData.append('bankType', bankType);
          formData.append('accountType', accountType);
        } else if (isTrades) {
          formData.append('brokerType', brokerType);
        }
        const response = isTrades
          ? await importTrades(formData)
          : await importBankStatement(formData);
        setResult(response.data);
      }
      setPreviewData(null);
    } catch (err) {
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
              Import {isTrades ? 'Trades' : 'Bank Statement'}
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
              <div className="flex gap-2 flex-wrap">
                {[{val:'csv',label:'CSV',Icon:FileText},{val:'excel',label:'Excel',Icon:FileSpreadsheet},{val:'pdf',label:'PDF',Icon:FileText}].map(({val,label,Icon})=>(
                  <button key={val}
                    onClick={() => setFormat(val)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                      format === val ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500 dark:text-gray-300'
                    }`}>
                    <Icon className="w-4 h-4" />{label}
                  </button>
                ))}
              </div>

              {/* Account type selector (Bank vs Credit Card) */}
              {isBankStatement && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Account Type:</span>
                  <div className="flex gap-2">
                    {[{val:'BANK',label:'🏦 Bank Account'},{val:'CREDIT_CARD',label:'💳 Credit Card'}].map(({val,label})=>(
                      <button key={val}
                        onClick={() => setAccountType(val)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                          accountType === val
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-400'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bank / Broker type selector */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {isBankStatement ? 'Bank / Format:' : 'Broker / Format:'}
                </span>
                <div className="flex gap-2 flex-wrap">
                  {/* Built-in + custom types */}
                  {(isBankStatement ? bankTypes : brokerTypes).map(t => {
                    const isCustom = isBankStatement
                      ? !BUILT_IN_BANK_TYPES.includes(t)
                      : !BUILT_IN_BROKER_TYPES.includes(t);
                    return (
                      <button key={t}
                        onClick={() => { isBankStatement ? setBankType(t) : setBrokerType(t); setCustomFormat(null); }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                          !customFormat && (isBankStatement ? bankType : brokerType) === t
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : isCustom
                              ? 'border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:border-indigo-400'
                              : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-400'
                        }`}>
                        {t}
                      </button>
                    );
                  })}
                  {/* Custom formats from Settings */}
                  {customFormats.map(cf => (
                    <button key={cf.id}
                      onClick={() => setCustomFormat(cf)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        customFormat?.id === cf.id
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'border-orange-200 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:border-orange-400'
                      }`}>
                      ✦ {cf.name}
                    </button>
                  ))}
                  {customFormats.length === 0 && format !== 'pdf' && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 self-center">
                      Add custom formats in <Settings size={11} className="inline" /> Settings
                    </span>
                  )}
                </div>
                {customFormat && (
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    Using custom format: <strong>{customFormat.name}</strong> · skip {customFormat.skipRows} row(s) · {customFormat.dateFormat}
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
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  )}
                  <h3 className="font-semibold">
                    {result.success ? 'Import Successful!' : 'Import Failed'}
                  </h3>
                </div>
                <p className="mt-2 text-sm">{result.message}</p>
              </div>

              <div className={`grid gap-4 ${result.duplicatesSkipped > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold">{result.totalRows}</p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{result.importedCount}</p>
                  <p className="text-sm text-gray-500">Imported</p>
                </div>
                {result.duplicatesSkipped > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-600">{result.duplicatesSkipped}</p>
                    <p className="text-sm text-gray-500">Duplicates</p>
                  </div>
                )}
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">{result.failedCount}</p>
                  <p className="text-sm text-gray-500">Failed</p>
                </div>
              </div>

              {result.errors?.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-red-700 mb-2">Errors:</h4>
                  <ul className="text-sm text-red-600 space-y-1">
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
