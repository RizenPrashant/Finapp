export default function StatsCard({ title, value, change, positive, icon, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-200 transition-all' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {change && (
        <p className={`text-sm font-medium mt-1 ${positive ? 'text-green-500' : 'text-red-500'}`}>
          {change} this month
        </p>
      )}
    </div>
  );
}
