// Shared currency formatter — always shows 2 decimal places (paise)
export const fmt = (val) => {
  const num = parseFloat(val ?? 0);
  if (isNaN(num)) return '₹0.00';
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
