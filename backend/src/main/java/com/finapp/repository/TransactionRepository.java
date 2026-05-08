package com.finapp.repository;

import com.finapp.model.Transaction;
import com.finapp.model.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

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
}
