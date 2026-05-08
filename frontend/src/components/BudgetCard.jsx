export default function BudgetCard({ budget, spent, onClick }) {
  const limit = parseFloat(budget.limitAmount) || 0;
  const spentAmt = parseFloat(spent) || 0;
  const percent = limit > 0 ? Math.min((spentAmt / limit) * 100, 100) : 0;
  const color = budget.color || '#4CAF50';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 cursor-pointer hover:shadow-md hover:border-slate-200 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800">{budget.category}</h3>
        <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: color + '22', color }}>
          {percent.toFixed(0)}%
        </span>
      </div>
      <p className="text-lg font-bold text-slate-700 mb-3">
        ₹{spentAmt.toLocaleString('en-IN')} <span className="text-sm font-normal text-gray-400">/ ₹{limit.toLocaleString('en-IN')}</span>
      </p>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
        <div className="h-2 rounded-full transition-all" style={{ width: `${percent}%`, background: color }} />
      </div>
      <p className="text-xs text-gray-400">{budget.note}</p>
    </div>
  );
}
