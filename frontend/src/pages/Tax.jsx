import { useState, useEffect, useCallback, useMemo } from 'react';
import { Calculator, TrendingDown, TrendingUp, Info, Save, RefreshCw, ChevronDown, ChevronUp, Wallet, Building, Briefcase, PiggyBank, Home, Heart, GraduationCap, Gift, ArrowRight, Sparkles, AlertCircle, Search, X, Plus, Check } from 'lucide-react';
import Header from '../components/Header';
import { getTaxProfile, saveTaxProfile, autoCalculateTax, calculateTax as apiCalculateTax, compareTaxRegimes, toggleTransactionTaxInclude } from '../api';
import api from '../api';

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

const FINANCIAL_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];

export default function Tax({ onProfileClick }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('income'); // income, deductions, summary
  const [showComparison, setShowComparison] = useState(false);

  // Tax Profile State
  const [financialYear, setFinancialYear] = useState('2025-26');
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
  const [standardDeduction, setStandardDeduction] = useState('75000'); // FY 2024-25 New Regime: ₹75,000

  // Calculation Results
  const [taxResult, setTaxResult] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);

  // Auto-calculation Details
  const [autoCalcDetails, setAutoCalcDetails] = useState(null);
  const [showTransactionBreakdown, setShowTransactionBreakdown] = useState(false);

  // Transaction Selector Modal
  const [showTransactionSelector, setShowTransactionSelector] = useState(false);
  const [availableTransactions, setAvailableTransactions] = useState([]);
  const [transactionSearchQuery, setTransactionSearchQuery] = useState('');
  const [selectedTransactionsForTax, setSelectedTransactionsForTax] = useState([]);

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

  // Load saved profile on mount and FY change
  useEffect(() => {
    loadSavedProfile();
  }, [financialYear]);

  const loadSavedProfile = async () => {
    try {
      setLoading(true);
      const response = await getTaxProfile(financialYear);
      const profile = response.data;

      if (profile) {
        setRegime(profile.regime || 'NEW');
        setEmploymentType(profile.employmentType || 'SALARIED');
        setSalaryIncome(profile.salaryIncome?.toString() || '');
        setBusinessIncome(profile.businessIncome?.toString() || '');
        setInterestIncome(profile.interestIncome?.toString() || '');
        setRentalIncome(profile.rentalIncome?.toString() || '');
        setCapitalGainsST(profile.capitalGainsST?.toString() || '');
        setCapitalGainsLT(profile.capitalGainsLT?.toString() || '');
        setOtherIncome(profile.otherIncome?.toString() || '');
        setSection80C(profile.section80C?.toString() || '');
        setSection80D(profile.section80D?.toString() || '');
        setSection80E(profile.section80E?.toString() || '');
        setSection80G(profile.section80G?.toString() || '');
        setSection80CCD1B(profile.section80CCD1B?.toString() || '');
        setSection24B(profile.section24B?.toString() || '');
        setHraExemption(profile.hraExemption?.toString() || '');
        setLtaExemption(profile.ltaExemption?.toString() || '');
        setStandardDeduction(profile.standardDeduction?.toString() || (profile.regime === 'NEW' ? '75000' : '50000'));
      }
    } catch (error) {
      console.error('Failed to load tax profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update standard deduction when regime changes
  useEffect(() => {
    if (regime === 'NEW') {
      setStandardDeduction('75000'); // FY 2024-25: ₹75,000 for New Regime
    } else {
      setStandardDeduction('50000'); // ₹50,000 for Old Regime
    }
  }, [regime]);

  // Auto-calculate on change
  useEffect(() => {
    const result = calculateTax();
    setTaxResult(result);
  }, [calculateTax]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const profileData = {
        financialYear,
        regime,
        employmentType,
        salaryIncome: parseFloat(salaryIncome) || 0,
        businessIncome: parseFloat(businessIncome) || 0,
        interestIncome: parseFloat(interestIncome) || 0,
        rentalIncome: parseFloat(rentalIncome) || 0,
        capitalGainsST: parseFloat(capitalGainsST) || 0,
        capitalGainsLT: parseFloat(capitalGainsLT) || 0,
        otherIncome: parseFloat(otherIncome) || 0,
        section80C: parseFloat(section80C) || 0,
        section80D: parseFloat(section80D) || 0,
        section80E: parseFloat(section80E) || 0,
        section80G: parseFloat(section80G) || 0,
        section80CCD1B: parseFloat(section80CCD1B) || 0,
        section24B: parseFloat(section24B) || 0,
        hraExemption: parseFloat(hraExemption) || 0,
        ltaExemption: parseFloat(ltaExemption) || 0,
        standardDeduction: parseFloat(standardDeduction) || 50000,
      };
      await saveTaxProfile(profileData);
      alert('Tax profile saved successfully!');
    } catch (error) {
      console.error('Failed to save tax profile:', error);
      alert('Failed to save tax profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoCalculate = async () => {
    setLoading(true);
    try {
      const response = await autoCalculateTax(financialYear);
      const result = response.data;
      const profile = result.profile;

      // Store the full auto-calculation details
      setAutoCalcDetails(result);
      setShowTransactionBreakdown(true);

      // Update all income fields from auto-calculation
      setSalaryIncome(profile.salaryIncome?.toString() || '');
      setBusinessIncome(profile.businessIncome?.toString() || '');
      setInterestIncome(profile.interestIncome?.toString() || '');
      setRentalIncome(profile.rentalIncome?.toString() || '');
      setCapitalGainsST(profile.capitalGainsST?.toString() || '');
      setCapitalGainsLT(profile.capitalGainsLT?.toString() || '');
      setOtherIncome(profile.otherIncome?.toString() || '');
      setEmploymentType(profile.employmentType || 'SALARIED');
    } catch (error) {
      console.error('Failed to auto-calculate:', error);
      alert('Failed to auto-calculate from transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Open transaction selector modal - show ALL FY transactions
  const handleOpenTransactionSelector = async () => {
    setLoading(true);
    try {
      // Parse financial year dates
      const startYear = parseInt(financialYear.split('-')[0]);
      const startDate = new Date(startYear, 3, 1); // April 1
      const endDate = new Date(startYear + 1, 2, 31); // March 31

      // Fetch ALL CREDIT transactions for the financial year
      const startStr = startDate.getFullYear() + '-' + String(startDate.getMonth() + 1).padStart(2, '0') + '-' + String(startDate.getDate()).padStart(2, '0');
      const endStr = endDate.getFullYear() + '-' + String(endDate.getMonth() + 1).padStart(2, '0') + '-' + String(endDate.getDate()).padStart(2, '0');

      const response = await api.get(`/transactions?start=${startStr}&end=${endStr}&type=CREDIT`);
      const allTransactions = response.data || [];

      console.log('Fetched transactions:', allTransactions.length, allTransactions);

      // Store ALL transactions, not just available ones
      setAvailableTransactions(allTransactions);
      setSelectedTransactionsForTax([]);
      setTransactionSearchQuery('');
      setShowTransactionSelector(true);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      alert('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add selected transactions to tax calculation
  const handleAddSelectedTransactions = () => {
    if (selectedTransactionsForTax.length === 0) {
      alert('Please select at least one transaction');
      return;
    }

    // Add selected transactions to auto-calculation with default type OTHER
    const newTransactions = selectedTransactionsForTax.map(tx => ({
      transactionId: tx.id,
      title: tx.title,
      category: tx.category,
      amount: tx.amount,
      date: tx.date,
      incomeType: 'OTHER',
      explanation: 'Other income - taxable (manually selected)',
      includeInTax: true
    }));

    setAutoCalcDetails(prev => {
      if (!prev) return prev;

      const updatedTransactions = [...prev.categorizedTransactions, ...newTransactions];

      // Recalculate category summary
      const newCategorySummary = { ...prev.categorySummary };
      newTransactions.forEach(tx => {
        newCategorySummary[tx.incomeType] = (newCategorySummary[tx.incomeType] || 0) + tx.amount;
      });

      // Update profile totals
      const newProfile = { ...prev.profile };
      const otherTotal = newTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      newProfile.otherIncome = (newProfile.otherIncome || 0) + otherTotal;

      return {
        ...prev,
        categorizedTransactions: updatedTransactions,
        categorySummary: newCategorySummary,
        profile: newProfile
      };
    });

    // Update other income field
    const addedAmount = selectedTransactionsForTax.reduce((sum, tx) => sum + tx.amount, 0);
    setOtherIncome(prev => (parseInput(prev) + addedAmount).toString());

    setShowTransactionSelector(false);
    setSelectedTransactionsForTax([]);
  };

  const handleToggleTransactionTax = async (transactionId, currentValue) => {
    try {
      const newValue = !currentValue;
      await toggleTransactionTaxInclude(transactionId, newValue);

      // Update local state
      setAutoCalcDetails(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          categorizedTransactions: prev.categorizedTransactions.map(tx =>
            tx.transactionId === transactionId
              ? { ...tx, includeInTax: newValue, incomeType: newValue ? tx.incomeType.replace('USER_EXCLUDED', 'OTHER') : 'USER_EXCLUDED' }
              : tx
          )
        };
      });

      // Re-run auto-calculate to update totals
      handleAutoCalculate();
    } catch (error) {
      console.error('Failed to toggle transaction:', error);
      alert('Failed to update transaction. Please try again.');
    }
  };

  // Update income type of a transaction in the auto-calculation
  const handleUpdateIncomeType = (transactionId, newIncomeType) => {
    setAutoCalcDetails(prev => {
      if (!prev) return prev;

      const updatedTransactions = prev.categorizedTransactions.map(tx => {
        if (tx.transactionId === transactionId) {
          // Update explanation based on new type
          const explanations = {
            'SALARY': 'Salary/Wage income - taxable',
            'BUSINESS': 'Business/Freelance income - taxable',
            'INTEREST': 'Interest income (FD/Savings) - taxable',
            'RENTAL': 'Rental income - taxable',
            'CAPITAL_GAINS_ST': 'Capital Gains (Short Term) - taxable at 15%/slab rate',
            'DIVIDEND': 'Dividend income - taxable (if > ₹10L)',
            'OTHER': 'Other income - taxable',
            'EXCLUDED': 'Not taxable income'
          };
          return {
            ...tx,
            incomeType: newIncomeType,
            explanation: explanations[newIncomeType] || 'Income - taxable',
            includeInTax: newIncomeType !== 'EXCLUDED'
          };
        }
        return tx;
      });

      // Recalculate category summary
      const newCategorySummary = {};
      updatedTransactions.forEach(tx => {
        if (tx.includeInTax) {
          newCategorySummary[tx.incomeType] = (newCategorySummary[tx.incomeType] || 0) + tx.amount;
        }
      });

      // Update profile with new totals
      const newProfile = { ...prev.profile };
      newProfile.salaryIncome = updatedTransactions
        .filter(tx => tx.incomeType === 'SALARY' && tx.includeInTax)
        .reduce((sum, tx) => sum + tx.amount, 0);
      newProfile.businessIncome = updatedTransactions
        .filter(tx => tx.incomeType === 'BUSINESS' && tx.includeInTax)
        .reduce((sum, tx) => sum + tx.amount, 0);
      newProfile.interestIncome = updatedTransactions
        .filter(tx => tx.incomeType === 'INTEREST' && tx.includeInTax)
        .reduce((sum, tx) => sum + tx.amount, 0);
      newProfile.rentalIncome = updatedTransactions
        .filter(tx => tx.incomeType === 'RENTAL' && tx.includeInTax)
        .reduce((sum, tx) => sum + tx.amount, 0);
      newProfile.capitalGainsST = updatedTransactions
        .filter(tx => tx.incomeType === 'CAPITAL_GAINS_ST' && tx.includeInTax)
        .reduce((sum, tx) => sum + tx.amount, 0);
      newProfile.otherIncome = updatedTransactions
        .filter(tx => ['DIVIDEND', 'OTHER'].includes(tx.incomeType) && tx.includeInTax)
        .reduce((sum, tx) => sum + tx.amount, 0);

      return {
        ...prev,
        categorizedTransactions: updatedTransactions,
        categorySummary: newCategorySummary,
        profile: newProfile
      };
    });

    // Also update the income fields to reflect changes
    setTimeout(() => {
      if (autoCalcDetails?.profile) {
        const updatedProfile = autoCalcDetails.profile;
        setSalaryIncome(updatedProfile.salaryIncome?.toString() || '');
        setBusinessIncome(updatedProfile.businessIncome?.toString() || '');
        setInterestIncome(updatedProfile.interestIncome?.toString() || '');
        setRentalIncome(updatedProfile.rentalIncome?.toString() || '');
        setCapitalGainsST(updatedProfile.capitalGainsST?.toString() || '');
        setOtherIncome(updatedProfile.otherIncome?.toString() || '');
      }
    }, 0);
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
      <Header title="Tax Calculator" subtitle={`Indian Income Tax (FY ${financialYear})`} onProfileClick={onProfileClick} />

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

            {/* Projected Tax (if partial year income) */}
            {(() => {
              const currentMonth = new Date().getMonth(); // 0-11
              const fyStartMonth = 3; // April
              const monthsCompleted = currentMonth >= fyStartMonth
                ? currentMonth - fyStartMonth + 1
                : 12 - (fyStartMonth - currentMonth - 1);

              if (monthsCompleted <= 0 || monthsCompleted >= 12) return null;

              const projectedMultiplier = 12 / monthsCompleted;
              const projectedIncome = taxResult.totalIncome * projectedMultiplier;
              const projectedTaxableIncome = Math.max(0, projectedIncome - taxResult.totalDeductions);

              // Calculate projected tax
              const slabs = regime === 'NEW' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
              let projectedTax = 0;
              let remainingIncome = projectedTaxableIncome;
              let previousLimit = 0;

              for (const slab of slabs) {
                if (remainingIncome <= 0) break;
                const slabAmount = Math.min(remainingIncome, slab.limit - previousLimit);
                projectedTax += slabAmount * (slab.rate / 100);
                remainingIncome -= slabAmount;
                previousLimit = slab.limit;
              }

              // Apply rebate
              const rebateLimit = regime === 'NEW' ? 700000 : 500000;
              const maxRebate = regime === 'NEW' ? 25000 : 12500;
              if (projectedTaxableIncome <= rebateLimit) {
                projectedTax = Math.max(0, projectedTax - maxRebate);
              }

              // Add cess
              const projectedCess = projectedTax * 0.04;
              const projectedFinalTax = projectedTax + projectedCess;

              return (
                <div className="col-span-2 md:col-span-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 p-4">
                  <p className="text-xs text-gray-500 mb-1">Projected FY Tax ({monthsCompleted} months)</p>
                  <p className="text-xl font-bold text-indigo-600">{fmt(projectedFinalTax)}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Based on ₹{fmt(projectedIncome)} projected income
                  </p>
                </div>
              );
            })()}
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

        {/* Auto-Calculation Transaction Breakdown */}
        {showTransactionBreakdown && autoCalcDetails && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles size={20} className="text-blue-500" />
                Auto-Calculated from Transactions
              </h3>
              <button
                onClick={() => setShowTransactionBreakdown(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Hide
              </button>
            </div>

            {/* Summary by Category */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {autoCalcDetails.categorySummary && Object.entries(autoCalcDetails.categorySummary).map(([type, amount]) => (
                <div key={type} className={`p-3 rounded-xl text-center ${
                  type === 'EXCLUDED' || type === 'USER_EXCLUDED' ? 'bg-gray-100 dark:bg-gray-700' :
                  type === 'SALARY' ? 'bg-blue-50 dark:bg-blue-900/20' :
                  type === 'BUSINESS' ? 'bg-purple-50 dark:bg-purple-900/20' :
                  type === 'INTEREST' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                  type === 'RENTAL' ? 'bg-orange-50 dark:bg-orange-900/20' :
                  type === 'CAPITAL_GAINS_ST' ? 'bg-pink-50 dark:bg-pink-900/20' :
                  'bg-green-50 dark:bg-green-900/20'
                }`}>
                  <p className="text-xs text-gray-500 capitalize">{type.replace(/_/g, ' ').toLowerCase()}</p>
                  <p className="font-semibold">{fmt(amount)}</p>
                </div>
              ))}
            </div>

            {/* Transaction List */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-600 flex items-center justify-between">
                <span>{autoCalcDetails.categorizedTransactions?.length || 0} transactions analyzed</span>
                <span className="text-xs text-gray-400">☑ = include in tax</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {autoCalcDetails.categorizedTransactions?.map((tx, idx) => (
                  <div key={idx} className={`flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    !tx.includeInTax ? 'opacity-60 bg-gray-50 dark:bg-gray-800/50' : ''
                  }`}>
                    {/* Checkbox Toggle */}
                    <label className="flex items-center cursor-pointer mr-3">
                      <input
                        type="checkbox"
                        checked={tx.includeInTax}
                        onChange={() => handleToggleTransactionTax(tx.transactionId, tx.includeInTax)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium text-sm truncate ${!tx.includeInTax ? 'line-through text-gray-400' : ''}`}>
                          {tx.title}
                        </p>
                        {!tx.includeInTax && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">Excluded</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{tx.category}</span>
                        <span>•</span>
                        <span>{new Date(tx.date).toLocaleDateString('en-IN')}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{tx.explanation}</p>
                    </div>
                    <div className="text-right ml-4 flex flex-col items-end gap-1">
                      {/* Amount Badge */}
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        !tx.includeInTax ? 'bg-gray-200 text-gray-500 line-through' :
                        tx.incomeType === 'EXCLUDED' ? 'bg-gray-100 text-gray-600' :
                        tx.incomeType === 'SALARY' ? 'bg-blue-100 text-blue-700' :
                        tx.incomeType === 'BUSINESS' ? 'bg-purple-100 text-purple-700' :
                        tx.incomeType === 'INTEREST' ? 'bg-yellow-100 text-yellow-700' :
                        tx.incomeType === 'RENTAL' ? 'bg-orange-100 text-orange-700' :
                        tx.incomeType === 'CAPITAL_GAINS_ST' ? 'bg-pink-100 text-pink-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {tx.includeInTax ? '+' : '✗'}
                        {fmt(tx.amount)}
                      </span>

                      {/* Change Type Dropdown - Show for all transactions */}
                      <select
                        value={tx.incomeType}
                        onChange={(e) => handleUpdateIncomeType(tx.transactionId, e.target.value)}
                        className="text-xs border border-gray-300 dark:border-gray-500 rounded px-1 py-0.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer hover:border-blue-400"
                        title="Change income type"
                      >
                        <option value="SALARY">Salary</option>
                        <option value="BUSINESS">Business</option>
                        <option value="INTEREST">Interest</option>
                        <option value="RENTAL">Rental</option>
                        <option value="CAPITAL_GAINS_ST">Capital Gains</option>
                        <option value="DIVIDEND">Dividend</option>
                        <option value="OTHER">Other</option>
                        <option value="EXCLUDED">Not Taxable</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Unclassified Transactions Section */}
            {(() => {
              const unclassifiedTxns = autoCalcDetails.categorizedTransactions?.filter(
                tx => tx.incomeType === 'OTHER' || tx.incomeType === 'EXCLUDED' || tx.incomeType === 'USER_EXCLUDED'
              ) || [];

              if (unclassifiedTxns.length === 0) return null;

              return (
                <div className="mt-6 border border-amber-200 dark:border-amber-800 rounded-xl overflow-hidden">
                  <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>Unclassified Transactions ({unclassifiedTxns.length})</span>
                    <span className="text-xs text-amber-600 dark:text-amber-400 ml-2">
                      Select correct income type for these transactions
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    {unclassifiedTxns.map((tx, idx) => (
                      <div key={idx} className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-amber-50/50 dark:hover:bg-amber-900/10">
                        <label className="flex items-center cursor-pointer mr-3">
                          <input
                            type="checkbox"
                            checked={tx.includeInTax && tx.incomeType !== 'EXCLUDED' && tx.incomeType !== 'USER_EXCLUDED'}
                            onChange={() => handleToggleTransactionTax(tx.transactionId, tx.includeInTax)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{tx.title}</p>
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                              {tx.incomeType === 'USER_EXCLUDED' ? 'Excluded by you' : 'Not classified'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{tx.category}</span>
                            <span>•</span>
                            <span>{new Date(tx.date).toLocaleDateString('en-IN')}</span>
                          </div>
                        </div>

                        <div className="text-right ml-4 flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-600">{fmt(tx.amount)}</span>

                          {/* Income Type Selector */}
                          <select
                            value={tx.incomeType}
                            onChange={(e) => handleUpdateIncomeType(tx.transactionId, e.target.value)}
                            className="text-xs border border-amber-300 dark:border-amber-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer hover:border-blue-400 focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="" disabled>Select Type ▼</option>
                            <option value="SALARY">💼 Salary</option>
                            <option value="BUSINESS">🏢 Business</option>
                            <option value="INTEREST">🏦 Interest</option>
                            <option value="RENTAL">🏠 Rental</option>
                            <option value="CAPITAL_GAINS_ST">📈 Capital Gains</option>
                            <option value="DIVIDEND">💰 Dividend</option>
                            <option value="OTHER">📝 Other Income</option>
                            <option value="EXCLUDED">🚫 Not Taxable</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Add More Transactions Button */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleOpenTransactionSelector}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-lg font-medium"
              >
                <Plus size={20} />
                <span>Add More Transactions from FY {financialYear}</span>
                <Search size={18} className="ml-1" />
              </button>
            </div>

            {/* Calculation Explanation */}
            {autoCalcDetails.calculationExplanation && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-line">
                  {autoCalcDetails.calculationExplanation}
                </p>
              </div>
            )}
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

        {/* Transaction Selector Modal */}
        {showTransactionSelector && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="text-lg font-semibold">Add Transactions to Tax</h3>
                  <p className="text-sm text-gray-500">
                    Select transactions from FY {financialYear} to include in tax calculation
                  </p>
                </div>
                <button
                  onClick={() => setShowTransactionSelector(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transactions by title or category..."
                    value={transactionSearchQuery}
                    onChange={(e) => setTransactionSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Transaction List - Show ALL transactions for the FY */}
              <div className="flex-1 overflow-y-auto p-4">
                {(() => {
                  // Get already added transaction IDs
                  const alreadyAddedIds = new Set(autoCalcDetails?.categorizedTransactions?.map(tx => tx.transactionId || tx.id) || []);

                  // Filter by search query
                  const filteredTxns = availableTransactions.filter(tx =>
                    tx.title?.toLowerCase().includes(transactionSearchQuery.toLowerCase()) ||
                    tx.category?.toLowerCase().includes(transactionSearchQuery.toLowerCase())
                  );

                  const notAddedTxns = filteredTxns.filter(tx => !alreadyAddedIds.has(tx.id));
                  const addedTxns = filteredTxns.filter(tx => alreadyAddedIds.has(tx.id));

                  return (
                    <div className="space-y-4">
                      {/* Section: NOT YET ADDED */}
                      {notAddedTxns.length > 0 && (
                        <>
                          <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Available to Add ({notAddedTxns.length})
                          </p>
                          <div className="space-y-2">
                            {notAddedTxns.map(tx => (
                              <label
                                key={tx.id}
                                className={`flex items-center p-3 rounded-xl border cursor-pointer transition ${
                                  selectedTransactionsForTax.find(st => st.id === tx.id)
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 bg-white dark:bg-gray-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={!!selectedTransactionsForTax.find(st => st.id === tx.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedTransactionsForTax([...selectedTransactionsForTax, tx]);
                                    } else {
                                      setSelectedTransactionsForTax(selectedTransactionsForTax.filter(st => st.id !== tx.id));
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{tx.title}</p>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>{tx.category}</span>
                                    <span>•</span>
                                    <span>{new Date(tx.date).toLocaleDateString('en-IN')}</span>
                                  </div>
                                </div>
                                <span className="font-semibold text-green-600 ml-4">+{fmt(tx.amount)}</span>
                              </label>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Section: ALREADY ADDED */}
                      {addedTxns.length > 0 && (
                        <>
                          <p className="text-xs font-medium text-green-600 uppercase tracking-wider mb-2 flex items-center gap-2 mt-4">
                            <Check size={14} />
                            Already in Tax ({addedTxns.length})
                          </p>
                          <div className="space-y-2">
                            {addedTxns.map(tx => {
                              // Find the income type from autoCalcDetails
                              const addedTx = autoCalcDetails?.categorizedTransactions?.find(
                                t => (t.transactionId || t.id) === tx.id
                              );
                              return (
                                <div
                                  key={tx.id}
                                  className="flex items-center p-3 rounded-xl border border-green-100 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10"
                                >
                                  <span className="text-green-500 mr-3">
                                    <Check size={16} />
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-sm truncate">{tx.title}</p>
                                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                        {addedTx?.incomeType || 'Added'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <span>{tx.category}</span>
                                      <span>•</span>
                                      <span>{new Date(tx.date).toLocaleDateString('en-IN')}</span>
                                    </div>
                                  </div>
                                  <span className="font-semibold text-green-600 ml-4">{fmt(tx.amount)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {/* No transactions at all */}
                      {filteredTxns.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p className="font-medium">No transactions found</p>
                          <p className="text-sm mt-1">No CREDIT transactions for FY {financialYear}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500">
                  {selectedTransactionsForTax.length} selected
                  {selectedTransactionsForTax.length > 0 && (
                    <span className="ml-2 text-green-600 font-medium">
                      ({fmt(selectedTransactionsForTax.reduce((sum, tx) => sum + tx.amount, 0))})
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTransactionSelector(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSelectedTransactions}
                    disabled={selectedTransactionsForTax.length === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                  >
                    Add to Tax
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
