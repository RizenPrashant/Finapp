export default function StatsCard({ title, value, change, positive, icon, onClick }) {
  // Calculate responsive text size based on value length
  const valueStr = String(value || '');
  const length = valueStr.length;
  const textSize = length > 12 ? 'text-base' : length > 9 ? 'text-lg' : 'text-xl lg:text-2xl';

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-6 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-200 dark:hover:border-gray-600 transition-all' : ''}`}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-base sm:text-lg flex-shrink-0">{icon}</div>
      </div>
      <p className={`${textSize} font-bold text-slate-800 dark:text-slate-200 truncate`} title={value}>{value}</p>
      {change && (
        <p className={`text-xs sm:text-sm font-medium mt-1 ${positive ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
          {change} this month
        </p>
      )}
    </div>
  );
}
