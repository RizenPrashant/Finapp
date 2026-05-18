/**
 * Copyright (c) 2026 Rizen.Prashant | Prashant Kumar
 * Pacific Finapp - Personal Finance Management Application
 * All rights reserved.
 */
import { useState, useEffect } from 'react';
import { X, Building2, CreditCard, Gift, HandCoins, User, Phone } from 'lucide-react';
import { getAssetsByType, getCashbackWallets } from '../api';

const categoryOptions = {
  'Monthly Food Expense': ['Groceries', 'Dining Out', 'Cafe', 'Food Delivery'],
  'Monthly Spend': ['Rent', 'Utilities', 'Transport', 'Housing', 'Bills'],
  'Monthly Investment': ['Mutual Fund', 'Stocks', 'Gold', 'FD'],
  'Monthly Total Savings': ['Savings Deposit'],
  'Miscellaneous': ['Entertainment', 'Health', 'Shopping', 'Others'],
  'Income': ['Salary', 'Freelance', 'Business', 'Others'],
};

export default function AddTransactionModal({ budgetCategory, onClose, onSave, prefilledSource }) {
  const [form, setForm] = useState({
    title: '',
    amount: '',
    type: 'DEBIT',
    category: categoryOptions[budgetCategory]?.[0] || 'Others',
    budgetCategory: budgetCategory,
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentSource: prefilledSource || '',
    isUdhar: false,
    udharPersonName: '',
    udharMobileNumber: '',
    udharType: 'GIVEN',
  });
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [cashbackWallets, setCashbackWallets] = useState([]);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const [assetRes, liabRes, cbRes] = await Promise.all([
          getAssetsByType('ASSET'),
          getAssetsByType('LIABILITY'),
          getCashbackWallets(),
        ]);
        setBanks((assetRes.data || []).filter(a => a.category === 'BANK'));
        setCreditCards((liabRes.data || []).filter(a => a.category === 'CREDIT_CARD'));
        setCashbackWallets(cbRes.data || []);
      } catch (e) {
        console.error('Failed to load payment sources', e);
      }
    };
    fetchSources();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave({ ...form, amount: parseFloat(form.amount) });
    setLoading(false);
    onClose();
  };

  const allSources = [
    ...banks.map(b => ({ name: b.name, type: 'Bank', icon: Building2 })),
    ...creditCards.map(c => ({ name: c.name, type: 'Credit Card', icon: CreditCard })),
    ...cashbackWallets.map(w => ({ name: w.platform, type: 'Cashback', icon: Gift, emoji: w.icon, balance: w.balance })),
  ];

  const inputCls = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 text-sm dark:text-white';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition">
          <X size={22} />
        </button>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 text-center">Add Transaction — {budgetCategory}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Transaction Type */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Transaction Type</label>
            <div className="flex gap-6">
              {['DEBIT', 'CREDIT'].map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer text-sm font-medium dark:text-gray-300">
                  <input type="radio" name="type" value={t} checked={form.type === t}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="accent-black dark:accent-white" />
                  {t === 'DEBIT' ? 'Debit (Expense)' : 'Credit (Income)'}
                </label>
              ))}
            </div>
          </div>

          {/* Payment Source */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">
              {form.type === 'DEBIT' ? 'Paid From' : 'Received In'}
            </label>
            {allSources.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">No banks or credit cards found. Add them in Insights → Assets / Liabilities.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setForm({ ...form, paymentSource: '' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${!form.paymentSource ? 'bg-slate-900 text-white border-slate-900' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  None
                </button>
                {allSources.map(src => {
                  const Icon = src.icon;
                  const selected = form.paymentSource === src.name;
                  const isCashback = src.type === 'Cashback';
                  return (
                    <button key={src.name} type="button"
                      onClick={() => setForm({ ...form, paymentSource: src.name })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        selected
                          ? isCashback ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-900 text-white border-slate-900'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}>
                      {isCashback
                        ? <span className="text-sm leading-none">{src.emoji}</span>
                        : <Icon size={12} />}
                      {src.name}
                      {isCashback
                        ? <span className={`text-[10px] ${selected ? 'text-purple-200' : 'text-gray-400'}`}>₹{parseFloat(src.balance || 0).toLocaleString('en-IN')}</span>
                        : <span className={`text-[10px] ${selected ? 'text-gray-300' : 'text-gray-400'}`}>({src.type})</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Description</label>
            <input required type="text" placeholder="Enter description" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Amount (₹)</label>
            <input required type="number" min="1" placeholder="0" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
              {(categoryOptions[budgetCategory] || ['Others']).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Date</label>
            <input type="date" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
          </div>

          {/* Udhar Toggle */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isUdhar}
                onChange={(e) => setForm({ ...form, isUdhar: e.target.checked })}
                className="w-4 h-4 accent-orange-500"
              />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <HandCoins size={16} className="text-orange-500" />
                Mark as Udhar (Lent / Borrowed)
              </span>
            </label>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-6">
              Track this as money given to or taken from someone
            </p>
          </div>

          {/* Udhar Fields - shown when enabled */}
          {form.isUdhar && (
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 space-y-3 border border-orange-100 dark:border-orange-800">
              {/* GIVEN / TAKEN toggle */}
              <div className="flex rounded-lg overflow-hidden border border-orange-200 dark:border-orange-700">
                {['GIVEN', 'TAKEN'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, udharType: t })}
                    className={`flex-1 py-2 text-xs font-semibold transition ${
                      form.udharType === t
                        ? t === 'GIVEN' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {t === 'GIVEN' ? '📤 I Lent (Diya)' : '📥 I Borrowed (Liya)'}
                  </button>
                ))}
              </div>

              {/* Person Name */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Person Name *</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    required={form.isUdhar}
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={form.udharPersonName}
                    onChange={(e) => setForm({ ...form, udharPersonName: e.target.value })}
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Mobile <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={form.udharMobileNumber}
                    onChange={(e) => setForm({ ...form, udharMobileNumber: e.target.value })}
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 font-semibold border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition dark:text-white">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-700 text-sm transition disabled:opacity-60">
              {loading ? 'Saving...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
