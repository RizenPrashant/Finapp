import { useState, useEffect, useCallback, useMemo } from 'react';
import { Calculator, TrendingDown, TrendingUp, Info, Save, RefreshCw, ChevronDown, ChevronUp, Wallet, Building, Briefcase, PiggyBank, Home, Heart, GraduationCap, Gift, ArrowRight } from 'lucide-react';
import Header from '../components/Header';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Indian Tax Slabs 2024-25
const NEW_REGIME_SLABS = [
  { limit: 300000, rate: 0, label: 'Upto ₹3L' },
  { limit: 700000, rate: 5, label: '₹3L - ₹7L' },
  { limit: 1000000, rate: 10, label: '₹7L - ₹10L' },
  { limit: 1200000, rate: 15, label: '₹10L - ₹12L' },
  { limit: 1500000, rate: 20, label: '₹12L - ₹15L' },
  { limit: Infinity, rate: 30, label: 'Above ₹15L' }
];

const OLD_REGIME_SLABS = [
  { limit: 250000, rate: 0, label: 'Upto ₹2.5L' },
  { limit: 500000, rate: 5, label: '₹2.5L - ₹5L' },
  { limit: 1000000, rate: 20, label: '₹5L - ₹10L' },
  { limit: Infinity, rate: 30, label: 'Above ₹10L' }
];

const FINANCIAL_YEARS = ['2023-24', '2024-25', '2025-26'];

export default function Tax({ onProfileClick }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('income'); // income, deductions, summary
  const [showComparison, setShowComparison] = useState(false);

  // Tax Profile State
  const [financialYear, setFinancialYear] = useState('2024-25');
  const [regime, setRegime] = useState('NEW');
  const [employmentType, setEmploymentType] = useState('SALARIED');

  // Income
  const [salaryIncome, setSalaryIncome] = useState('');
  const [businessIncome, setBusinessIncome] = useState('');
  const [interestIncome, setInterestIncome] = useState('');
  const [rentalIncome, setRentalIncome] = useState('');
  const [capitalGainsST, setCapitalGainsST] = useState('');
  const [capitalGainsLT, setCapitalGainsLT] = useState('');
  const [otherIncome, setOtherIncome] = useState('');

  // Deductions (Old Regime)
  const [section80C, setSection80C] = useState('');
  const [section80D, setSection80D] = useState('');
  const [section80E, setSection80E] = useState('');
  const [section80G, setSection80G] = useState('');
  const [section80CCD1B, setSection80CCD1B] = useState('');
  const [section24B, setSection24B] = useState('');
  const [hraExemption, setHraExemption] = useState('');
  const [ltaExemption, setLtaExemption] = useState('');
  const [standardDeduction, setStandardDeduction] = useState('50000');

  // Calculation Results
  const [taxResult, setTaxResult] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);

  const fmt = (val) => {
    if (!val || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val));
  };

  const parseInput = (val) => {
    if (!val) return 0;
    const num = parseFloat(val.toString().replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
  };

  // Calculate totals
  const totalIncome = useMemo(() => {
    return parseInput(salaryIncome) + parseInput(businessIncome) + parseInput(interestIncome) +
           parseInput(rentalIncome) + parseInput(capitalGainsST) + parseInput(capitalGainsLT) + parseInput(otherIncome);
  }, [salaryIncome, businessIncome, interestIncome, rentalIncome, capitalGainsST, capitalGainsLT, otherIncome]);

  const totalDeductions = useMemo(() => {
    if (regime === 'NEW') {
      return parseInput(standardDeduction); // Only standard deduction in new regime
    }
    return Math.min(parseInput(section80C), 150000) +
           parseInput(section80D) +
           parseInput(section80E) +
           parseInput(section80G) +
           Math.min(parseInput(section80CCD1B), 50000) +
           Math.min(parseInput(section24B), 200000) +
           parseInput(hraExemption) +
           parseInput(ltaExemption) +
           parseInput(standardDeduction);
  }, [regime, section80C, section80D, section80E, section80G, section80CCD1B, section24B, hraExemption, ltaExemption, standardDeduction]);

  const taxableIncome = useMemo(() => {
    return Math.max(0, totalIncome - totalDeductions);
  }, [totalIncome, totalDeductions]);

  // Calculate tax based on slabs
  const calculateTax = useCallback(() => {
    const slabs = regime === 'NEW' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
    let remainingIncome = taxableIncome;
    let totalTax = 0;
    let prevLimit = 0;
    const slabBreakdown = [];

    for (const slab of slabs) {
      const slabAmount = Math.min(Math.max(0, remainingIncome), slab.limit - prevLimit);
      const slabTax = (slabAmount * slab.rate) / 100;
      totalTax += slabTax;

      if (slabAmount > 0 || taxableIncome <= prevLimit) {
        slabBreakdown.push({
          ...slab,
          amount: slabAmount,
          tax: slabTax,
          prevLimit
        });
      }

      remainingIncome -= slabAmount;
      prevLimit = slab.limit;
      if (remainingIncome <= 0) break;
    }

    // Section 87A Rebate
    let rebate = 0;
    const rebateLimit = regime === 'NEW' ? 700000 : 500000;
    if (taxableIncome <= rebateLimit) {
      rebate = Math.min(totalTax, 25000);
    }

    const taxAfterRebate = Math.max(0, totalTax - rebate);
    const cess = taxAfterRebate * 0.04; // 4% Health & Education Cess
    const finalTax = taxAfterRebate + cess;

    return {
      totalIncome,
      totalDeductions,
      taxableIncome,
      taxBeforeRebate: totalTax,
      rebate,
      taxAfterRebate,
      cess,
      finalTax,
      effectiveRate: totalIncome > 0 ? ((finalTax / totalIncome) * 100).toFixed(2) : 0,
      slabBreakdown,
      regime
    };
  }, [taxableIncome, totalIncome, totalDeductions, regime]);

  // Calculate comparison between regimes
  const calculateComparison = useCallback(() => {
    // Save current regime
    const currentRegime = regime;

    // Calculate for NEW
    setRegime('NEW');
    const newResult = calculateTax();

    // Calculate for OLD
    setRegime('OLD');
    const oldResult = calculateTax();

    // Restore regime
    setRegime(currentRegime);

    return {
      newRegimeTax: newResult.finalTax,
      oldRegimeTax: oldResult.finalTax,
      recommended: newResult.finalTax <= oldResult.finalTax ? 'NEW' : 'OLD',
      savings: Math.abs(newResult.finalTax - oldResult.finalTax)
    };
  }, [regime, calculateTax]);

  // Auto-calculate on change
  useEffect(() => {
    const result = calculateTax();
    setTaxResult(result);
  }, [calculateTax]);

  const handleSave = async () => {
    setSaving(true);
    // Here you would call the API to save the tax profile
    await new Promise(r => setTimeout(r, 500)); // Simulate API call
    setSaving(false);
  };

  const handleAutoCalculate = async () => {
    setLoading(true);
    // Simulate auto-calculation from transactions
    await new Promise(r => setTimeout(r, 1000));
    setSalaryIncome('800000');
    setInterestIncome('25000');
    setOtherIncome('15000');
    setLoading(false);
  };

  const handleCompare = () => {
    const currentResult = calculateTax();

    // Calculate for opposite regime
    const oppositeRegime = regime === 'NEW' ? 'OLD' : 'NEW';
    const slabs = oppositeRegime === 'NEW' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;

    // For old regime, calculate with deductions
    let oppTaxableIncome = totalIncome;
    let oppDeductions = 0;
    if (oppositeRegime === 'OLD') {
      oppDeductions = Math.min(parseInput(section80C), 150000) +
                      parseInput(section80D) +
                      parseInput(section80E) +
                      parseInput(section80G) +
                      Math.min(parseInput(section80CCD1B), 50000) +
                      Math.min(parseInput(section24B), 200000) +
                      parseInput(hraExemption) +
                      parseInput(ltaExemption) +
                      parseInput(standardDeduction);
      oppTaxableIncome = Math.max(0, totalIncome - oppDeductions);
    } else {
      oppDeductions = parseInput(standardDeduction);
      oppTaxableIncome = Math.max(0, totalIncome - oppDeductions);
    }

    let remainingIncome = oppTaxableIncome;
    let oppTotalTax = 0;
    let prevLimit = 0;

    for (const slab of slabs) {
      const slabAmount = Math.min(Math.max(0, remainingIncome), slab.limit - prevLimit);
      oppTotalTax += (slabAmount * slab.rate) / 100;
      remainingIncome -= slabAmount;
      prevLimit = slab.limit;
      if (remainingIncome <= 0) break;
    }

    const rebateLimit = oppositeRegime === 'NEW' ? 700000 : 500000;
    let oppRebate = 0;
    if (oppTaxableIncome <= rebateLimit) {
      oppRebate = Math.min(oppTotalTax, 25000);
    }

    const oppTaxAfterRebate = Math.max(0, oppTotalTax - oppRebate);
    const oppCess = oppTaxAfterRebate * 0.04;
    const oppFinalTax = oppTaxAfterRebate + oppCess;

    const currentTax = currentResult.finalTax;

    setComparisonResult({
      currentRegime: regime,
      currentTax: currentTax,
      otherRegime: oppositeRegime,
      otherTax: oppFinalTax,
      otherDeductions: oppDeductions,
      otherTaxableIncome: oppTaxableIncome,
      recommended: currentTax <= oppFinalTax ? regime : oppositeRegime,
      savings: Math.abs(currentTax - oppFinalTax)
    });
    setShowComparison(true);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Tax Calculator" subtitle="Indian Income Tax (FY 2024-25)" onProfileClick={onProfileClick} />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Top Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Financial Year Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">FY</span>
                <select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm font-medium"
                >
                  {FINANCIAL_YEARS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
                </select>
              </div>

              {/* Regime Selector */}
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                <button
                  onClick={() => setRegime('NEW')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    regime === 'NEW' ? 'bg-white dark:bg-gray-600 shadow-sm text-slate-900 dark:text-white' : 'text-gray-500'
                  }`}
                >
                  New Regime
                </button>
                <button
                  onClick={() => setRegime('OLD')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    regime === 'OLD' ? 'bg-white dark:bg-gray-600 shadow-sm text-slate-900 dark:text-white' : 'text-gray-500'
                  }`}
                >
                  Old Regime
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoCalculate}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span className="text-sm font-medium">Auto Calculate</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition"
              >
                <Save size={16} />
                <span className="text-sm font-medium">{saving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tax Summary Cards */}
        {taxResult && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 p-4">
              <p className="text-xs text-gray-500 mb-1">Total Income</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{fmt(taxResult.totalIncome)}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-800 p-4">
              <p className="text-xs text-gray-500 mb-1">Deductions</p>
              <p className="text-xl font-bold text-orange-600">{fmt(taxResult.totalDeductions)}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800 p-4">
              <p className="text-xs text-gray-500 mb-1">Taxable Income</p>
              <p className="text-xl font-bold text-purple-600">{fmt(taxResult.taxableIncome)}</p>
            </div>
            <div className={`rounded-2xl border p-4 ${taxResult.finalTax > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-100' : 'bg-green-50 dark:bg-green-900/20 border-green-100'}`}>
              <p className="text-xs text-gray-500 mb-1">Tax Payable</p>
              <p className={`text-xl font-bold ${taxResult.finalTax > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {fmt(taxResult.finalTax)}
              </p>
              {taxResult.effectiveRate > 0 && (
                <p className="text-xs text-gray-400 mt-1">Effective Rate: {taxResult.effectiveRate}%</p>
              )}
            </div>
          </div>
        )}

        {/* Compare Button */}
        <div className="mb-6">
          <button
            onClick={handleCompare}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition shadow-lg"
          >
            <Calculator size={20} />
            <span className="font-medium">Compare Both Regimes</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Comparison Result */}
        {showComparison && comparisonResult && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-800 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Recommended Regime</p>
                <p className="text-2xl font-bold text-green-700">
                  {comparisonResult.recommended === 'NEW' ? 'New Tax Regime' : 'Old Tax Regime'}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  You save {fmt(comparisonResult.savings)} with {comparisonResult.recommended === 'NEW' ? 'New' : 'Old'} regime
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Current Regime Tax</p>
                <p className="text-lg font-semibold">{fmt(comparisonResult.currentTax)}</p>
                <p className="text-sm text-gray-500 mt-2">{comparisonResult.otherRegime} Regime Tax</p>
                <p className="text-lg font-semibold">{fmt(comparisonResult.otherTax)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'income', label: 'Income Sources', icon: Wallet },
            { id: 'deductions', label: 'Deductions', icon: PiggyBank },
            { id: 'summary', label: 'Tax Breakdown', icon: Calculator }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Income Tab */}
        {activeTab === 'income' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Wallet size={20} className="text-blue-500" />
              Income Sources
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Briefcase size={16} className="text-gray-400" />
                  Salary Income
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="number"
                    value={salaryIncome}
                    onChange={(e) => setSalaryIncome(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Building size={16} className="text-gray-400" />
                  Business Income
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="number"
                    value={businessIncome}
                    onChange={(e) => setBusinessIncome(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <PiggyBank size={16} className="text-gray-400" />
                  Interest Income (FD/Savings)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="number"
                    value={interestIncome}
                    onChange={(e) => setInterestIncome(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Home size={16} className="text-gray-400" />
                  Rental Income
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="number"
                    value={rentalIncome}
                    onChange={(e) => setRentalIncome(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <TrendingUp size={16} className="text-gray-400" />
                  Short Term Capital Gains
                  <span className="text-xs text-gray-400">(&lt; 1 year)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="number"
                    value={capitalGainsST}
                    onChange={(e) => setCapitalGainsST(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <TrendingDown size={16} className="text-gray-400" />
                  Long Term Capital Gains
                  <span className="text-xs text-gray-400">(&gt; 1 year)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="number"
                    value={capitalGainsLT}
                    onChange={(e) => setCapitalGainsLT(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Wallet size={16} className="text-gray-400" />
                  Other Income
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="number"
                    value={otherIncome}
                    onChange={(e) => setOtherIncome(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Total Income</span>
                <span className="text-2xl font-bold text-slate-800">{fmt(totalIncome)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Deductions Tab */}
        {activeTab === 'deductions' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            {regime === 'NEW' ? (
              <div className="text-center py-12">
                <Info size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">
                  In the <strong>New Tax Regime</strong>, most deductions are not applicable.
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Only Standard Deduction (₹50,000) is allowed for salaried individuals.
                </p>

                <div className="mt-6 max-w-sm mx-auto">
                  <label className="text-sm font-medium text-gray-600">Standard Deduction</label>
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                    <input
                      type="number"
                      value={standardDeduction}
                      onChange={(e) => setStandardDeduction(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <PiggyBank size={20} className="text-green-500" />
                  Deductions (Old Regime)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      Section 80C
                      <span className="text-xs text-gray-400">(Max ₹1.5L)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        value={section80C}
                        onChange={(e) => setSection80C(e.target.value)}
                        placeholder="PF, ELSS, LIC, etc."
                        className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <p className="text-xs text-gray-400">EPF, PPF, ELSS, LIC, Home Loan Principal, etc.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Heart size={16} className="text-red-400" />
                      Section 80D
                      <span className="text-xs text-gray-400">(Health Insurance)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        value={section80D}
                        onChange={(e) => setSection80D(e.target.value)}
                        placeholder="Health insurance premium"
                        className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <GraduationCap size={16} className="text-blue-400" />
                      Section 80E
                      <span className="text-xs text-gray-400">(Education Loan)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        value={section80E}
                        onChange={(e) => setSection80E(e.target.value)}
                        placeholder="Education loan interest"
                        className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Gift size={16} className="text-purple-400" />
                      Section 80G
                      <span className="text-xs text-gray-400">(Donations)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        value={section80G}
                        onChange={(e) => setSection80G(e.target.value)}
                        placeholder="Charitable donations"
                        className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      Section 80CCD(1B)
                      <span className="text-xs text-gray-400">(NPS - Max ₹50k)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        value={section80CCD1B}
                        onChange={(e) => setSection80CCD1B(e.target.value)}
                        placeholder="Additional NPS contribution"
                        className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Home size={16} className="text-orange-400" />
                      Section 24(b)
                      <span className="text-xs text-gray-400">(Home Loan Interest - Max ₹2L)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        value={section24B}
                        onChange={(e) => setSection24B(e.target.value)}
                        placeholder="Home loan interest"
                        className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      HRA Exemption
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        value={hraExemption}
                        onChange={(e) => setHraExemption(e.target.value)}
                        placeholder="House Rent Allowance"
                        className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      LTA Exemption
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        value={ltaExemption}
                        onChange={(e) => setLtaExemption(e.target.value)}
                        placeholder="Leave Travel Allowance"
                        className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      Standard Deduction
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        value={standardDeduction}
                        onChange={(e) => setStandardDeduction(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Total Deductions</span>
                <span className="text-2xl font-bold text-green-600">{fmt(totalDeductions)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && taxResult && (
          <div className="space-y-6">
            {/* Tax Calculation Steps */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-6">Tax Calculation</h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Total Income</span>
                  <span className="font-semibold">{fmt(taxResult.totalIncome)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">(-) Deductions</span>
                  <span className="font-semibold text-green-600">-{fmt(taxResult.totalDeductions)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-800 font-medium">Taxable Income</span>
                  <span className="font-bold text-purple-600">{fmt(taxResult.taxableIncome)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Tax Before Rebate</span>
                  <span className="font-semibold">{fmt(taxResult.taxBeforeRebate)}</span>
                </div>
                {taxResult.rebate > 0 && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-100 bg-green-50 rounded-lg px-4 -mx-4">
                    <span className="text-green-700 font-medium">(-) Section 87A Rebate</span>
                    <span className="font-bold text-green-600">-{fmt(taxResult.rebate)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Tax After Rebate</span>
                  <span className="font-semibold">{fmt(taxResult.taxAfterRebate)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">(+) Health & Education Cess (4%)</span>
                  <span className="font-semibold">{fmt(taxResult.cess)}</span>
                </div>
                <div className="flex justify-between items-center py-4 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 -mx-4">
                  <span className="text-red-800 dark:text-red-200 font-bold">Total Tax Payable</span>
                  <span className="text-2xl font-bold text-red-600">{fmt(taxResult.finalTax)}</span>
                </div>
              </div>
            </div>

            {/* Slab Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-6">
                {regime === 'NEW' ? 'New Regime' : 'Old Regime'} Tax Slabs
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                      <th className="pb-3">Income Slab</th>
                      <th className="pb-3">Rate</th>
                      <th className="pb-3 text-right">Amount in Slab</th>
                      <th className="pb-3 text-right">Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxResult.slabBreakdown.map((slab, idx) => (
                      <tr key={idx} className="border-b border-gray-50 last:border-0">
                        <td className="py-3">{slab.label}</td>
                        <td className="py-3">{slab.rate}%</td>
                        <td className="py-3 text-right">{fmt(slab.amount)}</td>
                        <td className="py-3 text-right font-medium">{fmt(slab.tax)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <Info size={14} className="inline mr-1" />
                  {regime === 'NEW'
                    ? 'Section 87A: Full tax rebate up to ₹25,000 if taxable income is ≤ ₹7L'
                    : 'Section 87A: Full tax rebate up to ₹12,500 if taxable income is ≤ ₹5L'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
