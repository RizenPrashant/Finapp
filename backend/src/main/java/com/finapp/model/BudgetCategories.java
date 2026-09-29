package com.finapp.model;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * The Budget Overview buckets, and which of them are rollups of others.
 *
 * Mirrors the frontend's constants/budgetCategories.js, which owns the list
 * the dropdowns show. What lives here is the part the database has to know:
 * a rollup is not stored on any row, so filtering by one has to be turned
 * into a filter over the buckets it covers. Doing that in the browser would
 * break paging and the filtered totals, which are computed over the whole
 * matching set rather than the page on screen.
 */
public final class BudgetCategories {

    private BudgetCategories() {}

    public static final String UNCATEGORIZED = "Uncategorized";
    public static final String MONTHLY_TOTAL_EXPENSE = "Monthly Total Expense";

    /**
     * A rollup and the buckets it covers. Monthly Total Expense is the sum of
     * everything spent in a month, which is these three; no transaction is
     * filed under the rollup itself, so asking for it has to mean asking for
     * its members.
     */
    private static final Map<String, List<String>> ROLLUPS = Map.of(
        MONTHLY_TOTAL_EXPENSE, List.of("Monthly Food Expense", "Monthly Spend", "Miscellaneous")
    );

    /**
     * The buckets a filter value actually matches: the members of a rollup,
     * or the value itself for an ordinary bucket. Null in, null out — no
     * budget filter at all.
     */
    public static Collection<String> expand(String budgetCategory) {
        if (budgetCategory == null || budgetCategory.isBlank()) return null;
        return ROLLUPS.getOrDefault(budgetCategory, List.of(budgetCategory));
    }

    public static boolean isRollup(String budgetCategory) {
        return ROLLUPS.containsKey(budgetCategory);
    }
}
