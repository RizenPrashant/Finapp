/**
 * The Budget Overview categories.
 *
 * This is the whole list, everywhere — filters, re-categorise dropdowns,
 * custom filter rules. It is deliberately a fixed list rather than whatever
 * happens to be in the table: the filter used to be built from
 * SELECT DISTINCT budget_category, so every stray value an import wrote in
 * turned into a permanent option, and the dropdown grew to 21 entries
 * including Salary, Shopping, Cash Withdrawal and Loan EMI.
 *
 * Those are normal categories, not budget buckets. The two are separate
 * fields and neither feeds the other.
 */
export const BUDGET_OVERVIEW_CATEGORIES = [
  'Miscellaneous',
  'Monthly Food Expense',
  'Monthly Investment',
  'Monthly Revenue',
  'Monthly Spend',
  'Monthly Total Expense',
  'Monthly Total Savings',
  'Uncategorized',
];

/**
 * Monthly Total Expense is a rollup of Monthly Food Expense + Monthly Spend
 * + Miscellaneous. It is shown and can be filtered on, but a transaction
 * cannot be filed under it — doing so would count the amount twice, once in
 * the rollup and once in whichever bucket it really belongs to.
 */
export const ROLLUP_BUDGET_CATEGORIES = ['Monthly Total Expense'];

/** What a transaction can actually be assigned to. */
export const ASSIGNABLE_BUDGET_CATEGORIES = BUDGET_OVERVIEW_CATEGORIES
  .filter(c => !ROLLUP_BUDGET_CATEGORIES.includes(c));

/** Where anything unrecognised lands. */
export const DEFAULT_BUDGET_CATEGORY = 'Uncategorized';
