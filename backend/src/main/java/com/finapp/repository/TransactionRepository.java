package com.finapp.repository;

import com.finapp.model.Transaction;
import com.finapp.model.TransactionType;
import com.finapp.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    // User-specific queries
    List<Transaction> findByUser(User user);

    Optional<Transaction> findByIdAndUser(Long id, User user);

    List<Transaction> findByUserAndBudgetCategoryIgnoreCase(User user, String budgetCategory);

    List<Transaction> findByUserAndType(User user, TransactionType type);

    List<Transaction> findByUserAndCategoryIgnoreCase(User user, String category);

    List<Transaction> findByUserAndDateBetweenOrderByDateDesc(User user, LocalDate startDate, LocalDate endDate);

    List<Transaction> findByUserAndTypeAndDateBetweenOrderByDateDesc(User user, TransactionType type, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.user = :user AND t.type = :type AND t.date BETWEEN :start AND :end")
    BigDecimal sumByUserAndTypeAndDateBetween(@Param("user") User user, @Param("type") TransactionType type, @Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT t.category, COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.user = :user AND t.type = 'DEBIT' AND t.date BETWEEN :start AND :end GROUP BY t.category ORDER BY SUM(t.amount) DESC")
    List<Object[]> sumByUserAndCategoryAndDateBetween(@Param("user") User user, @Param("start") LocalDate start, @Param("end") LocalDate end);

    // One pass over the year instead of three sums per month. Rows come back as
    // [month, credit, debit, savings]; months with no activity are simply absent.
    @Query("SELECT MONTH(t.date), " +
           "COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END), 0), " +
           "COALESCE(SUM(CASE WHEN t.type = 'DEBIT'  THEN t.amount ELSE 0 END), 0), " +
           "COALESCE(SUM(CASE WHEN t.type = 'DEBIT' AND LOWER(t.budgetCategory) = 'monthly total savings' THEN t.amount ELSE 0 END), 0) " +
           "FROM Transaction t WHERE t.user = :user AND YEAR(t.date) = :year " +
           "GROUP BY MONTH(t.date)")
    List<Object[]> monthlyTotalsByUserAndYear(@Param("user") User user, @Param("year") int year);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.user = :user AND LOWER(t.budgetCategory) = LOWER(:budgetCategory) AND t.type = :type")
    BigDecimal sumByUserAndBudgetCategoryAndType(@Param("user") User user, @Param("budgetCategory") String budgetCategory, @Param("type") TransactionType type);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.user = :user AND LOWER(t.budgetCategory) = LOWER(:budgetCategory) AND t.type = :type AND t.date BETWEEN :start AND :end")
    BigDecimal sumByUserAndBudgetCategoryAndTypeAndDateBetween(@Param("user") User user, @Param("budgetCategory") String budgetCategory, @Param("type") TransactionType type, @Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.user = :user AND LOWER(t.budgetCategory) = LOWER(:budgetCategory)")
    BigDecimal sumByUserAndBudgetCategory(@Param("user") User user, @Param("budgetCategory") String budgetCategory);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.user = :user AND LOWER(t.budgetCategory) = LOWER(:budgetCategory) AND t.date BETWEEN :start AND :end")
    BigDecimal sumByUserAndBudgetCategoryAndDateBetween(@Param("user") User user, @Param("budgetCategory") String budgetCategory, @Param("start") LocalDate start, @Param("end") LocalDate end);

    List<Transaction> findByUserAndBudgetCategoryIgnoreCaseAndDateBetween(User user, String budgetCategory, LocalDate startDate, LocalDate endDate);

    List<Transaction> findByBudgetCategoryIgnoreCase(String budgetCategory);

    List<Transaction> findByType(TransactionType type);

    List<Transaction> findByCategoryIgnoreCase(String category);

    List<Transaction> findByDateBetweenOrderByDateDesc(LocalDate startDate, LocalDate endDate);

    List<Transaction> findByTypeAndDateBetweenOrderByDateDesc(TransactionType type, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.type = :type")
    BigDecimal sumByType(@Param("type") TransactionType type);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.type = :type AND t.date BETWEEN :start AND :end")
    BigDecimal sumByTypeAndDateBetween(@Param("type") TransactionType type, @Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT t.category, COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.type = 'DEBIT' AND t.date BETWEEN :start AND :end GROUP BY t.category ORDER BY SUM(t.amount) DESC")
    List<Object[]> sumByCategoryAndDateBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT t.date, COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END), 0), COALESCE(SUM(CASE WHEN t.type = 'DEBIT' THEN t.amount ELSE 0 END), 0) FROM Transaction t WHERE t.date BETWEEN :start AND :end GROUP BY t.date ORDER BY t.date ASC")
    List<Object[]> dailySummaryBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE LOWER(t.budgetCategory) = LOWER(:budgetCategory) AND t.type = :type")
    BigDecimal sumByBudgetCategoryAndType(String budgetCategory, TransactionType type);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE LOWER(t.budgetCategory) = LOWER(:budgetCategory)")
    BigDecimal sumByBudgetCategory(String budgetCategory);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.type = :type AND LOWER(t.budgetCategory) != 'income'")
    BigDecimal sumExpensesByType(TransactionType type);

    List<Transaction> findByUserAndPaymentSourceIgnoreCaseOrderByDateDesc(User user, String paymentSource);

    // Limit validation runs on every DEBIT create — aggregate in SQL rather than
    // loading every transaction for the source and summing in memory.
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.user = :user " +
           "AND LOWER(t.paymentSource) = LOWER(:paymentSource) AND t.type = :type")
    BigDecimal sumByUserAndPaymentSourceAndType(
        @Param("user") User user,
        @Param("paymentSource") String paymentSource,
        @Param("type") TransactionType type);

    boolean existsByUserAndImportHash(User user, String importHash);

    @Query("SELECT t.importHash FROM Transaction t WHERE t.user = :user AND t.importHash IS NOT NULL")
    java.util.Set<String> findAllImportHashesByUser(@Param("user") User user);

    @Query("SELECT MAX(t.date) FROM Transaction t WHERE t.user = :user AND LOWER(t.paymentSource) = LOWER(:paymentSource)")
    Optional<LocalDate> findMaxDateByUserAndPaymentSource(@Param("user") User user, @Param("paymentSource") String paymentSource);

    /**
     * Free-text search across a user's transactions.
     *
     * No LOWER() on either side: the columns are utf8mb4_unicode_ci, so LIKE is
     * already case-insensitive and the wrappers only cost a function call per
     * row per column — measurably, about 30% of the query on a large account.
     *
     * amountQuery is the search term when it contains a digit and null
     * otherwise, so a word search skips the per-row CAST of every amount.
     */
    @Query("SELECT t FROM Transaction t WHERE t.user = :user AND (" +
           "t.title LIKE CONCAT('%', :q, '%') OR " +
           "t.description LIKE CONCAT('%', :q, '%') OR " +
           "t.category LIKE CONCAT('%', :q, '%') OR " +
           "t.budgetCategory LIKE CONCAT('%', :q, '%') OR " +
           "t.paymentSource LIKE CONCAT('%', :q, '%') OR " +
           "(:amountQuery IS NOT NULL AND CAST(t.amount AS string) LIKE CONCAT('%', :amountQuery, '%'))" +
           ") AND (:start IS NULL OR t.date >= :start) AND (:end IS NULL OR t.date <= :end) " +
           "ORDER BY t.date DESC")
    List<Transaction> searchByUser(
        @Param("user") User user,
        @Param("q") String q,
        @Param("amountQuery") String amountQuery,
        @Param("start") LocalDate start,
        @Param("end") LocalDate end,
        Pageable pageable
    );

    // ── Paged listing ────────────────────────────────────────────────────────
    // One dynamic filter shared by the page, its totals and its filter options,
    // so the three can never disagree about what the user is looking at. Null
    // parameters drop out of the predicate, matching the searchByUser pattern.
    // Plain `=` on the text columns rather than LOWER(): the schema collation is
    // utf8mb4_unicode_ci so the comparison is already case-insensitive, and
    // wrapping the column in a function would rule out the indexes.
    String LIST_FILTER =
        "FROM Transaction t WHERE t.user = :user " +
        "AND (:start IS NULL OR t.date >= :start) " +
        "AND (:end IS NULL OR t.date <= :end) " +
        "AND (:type IS NULL OR t.type = :type) " +
        "AND (:category IS NULL OR t.category = :category) " +
        "AND (:budgetCategory IS NULL OR t.budgetCategory = :budgetCategory) " +
        "AND (:paymentSource IS NULL OR t.paymentSource = :paymentSource)";

    @Query("SELECT t " + LIST_FILTER)
    Page<Transaction> findPage(
        @Param("user") User user,
        @Param("start") LocalDate start,
        @Param("end") LocalDate end,
        @Param("type") TransactionType type,
        @Param("category") String category,
        @Param("budgetCategory") String budgetCategory,
        @Param("paymentSource") String paymentSource,
        Pageable pageable);

    // Totals across the whole filtered set, not just the page being shown.
    @Query("SELECT COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END), 0), " +
           "COALESCE(SUM(CASE WHEN t.type = 'DEBIT' THEN t.amount ELSE 0 END), 0) " + LIST_FILTER)
    List<Object[]> sumTotalsForFilter(
        @Param("user") User user,
        @Param("start") LocalDate start,
        @Param("end") LocalDate end,
        @Param("type") TransactionType type,
        @Param("category") String category,
        @Param("budgetCategory") String budgetCategory,
        @Param("paymentSource") String paymentSource);

    // Filter dropdowns can no longer be built from the loaded rows once the list
    // is paged, so ask the server what values exist in the current scope.
    String OPTION_SCOPE =
        "FROM Transaction t WHERE t.user = :user " +
        "AND (:start IS NULL OR t.date >= :start) " +
        "AND (:end IS NULL OR t.date <= :end) " +
        "AND (:paymentSource IS NULL OR t.paymentSource = :paymentSource) ";

    @Query("SELECT DISTINCT t.category " + OPTION_SCOPE + "AND t.category IS NOT NULL ORDER BY t.category")
    List<String> findDistinctCategories(@Param("user") User user, @Param("start") LocalDate start,
                                        @Param("end") LocalDate end, @Param("paymentSource") String paymentSource);

    @Query("SELECT DISTINCT t.budgetCategory " + OPTION_SCOPE + "AND t.budgetCategory IS NOT NULL ORDER BY t.budgetCategory")
    List<String> findDistinctBudgetCategories(@Param("user") User user, @Param("start") LocalDate start,
                                              @Param("end") LocalDate end, @Param("paymentSource") String paymentSource);

    // Daily credit/debit totals over a span, for callers that bucket the days
    // themselves. Grouping by day rather than by week keeps the week boundaries
    // in Java, where they already follow ISO rules, instead of relying on the
    // database agreeing about what week a date falls in.
    // Rows are [date, credit, debit].
    @Query("SELECT t.date, " +
           "COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END), 0), " +
           "COALESCE(SUM(CASE WHEN t.type = 'DEBIT'  THEN t.amount ELSE 0 END), 0) " +
           "FROM Transaction t WHERE t.user = :user AND t.date BETWEEN :start AND :end " +
           "GROUP BY t.date")
    List<Object[]> dailyTotalsByUserBetween(@Param("user") User user,
                                            @Param("start") LocalDate start,
                                            @Param("end") LocalDate end);

    // Budget utilisation for every category in one pass. Callers used to fetch
    // the full transaction list per budget and sum it in the browser, which is
    // one unbounded query per budget to produce a handful of numbers.
    // Rows are [budgetCategory, credit, debit].
    @Query("SELECT t.budgetCategory, " +
           "COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END), 0), " +
           "COALESCE(SUM(CASE WHEN t.type = 'DEBIT'  THEN t.amount ELSE 0 END), 0) " +
           "FROM Transaction t WHERE t.user = :user " +
           "AND (:start IS NULL OR t.date >= :start) AND (:end IS NULL OR t.date <= :end) " +
           "AND t.budgetCategory IS NOT NULL " +
           "GROUP BY t.budgetCategory")
    List<Object[]> sumByUserGroupedByBudgetCategory(@Param("user") User user,
                                                    @Param("start") LocalDate start,
                                                    @Param("end") LocalDate end);

    // User-specific analytics
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.user = :user AND t.type = :type")
    BigDecimal sumByUserAndType(@Param("user") User user, @Param("type") TransactionType type);

    // For tax calculation - find by userId, type and date range
    @Query("SELECT t FROM Transaction t WHERE t.user.id = :userId AND t.type = :type AND t.date BETWEEN :start AND :end")
    List<Transaction> findByUserIdAndTypeAndDateBetween(
            @Param("userId") Long userId,
            @Param("type") TransactionType type,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end);
}
