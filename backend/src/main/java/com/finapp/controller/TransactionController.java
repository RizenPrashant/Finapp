/*
 * Copyright (c) 2026 Rizen.Prashant | Prashant Kumar
 * Pacific Finapp - Personal Finance Management Application
 * All rights reserved.
 */
package com.finapp.controller;

import com.finapp.dto.TransactionDTO;
import com.finapp.dto.TransactionPageDTO;
import com.finapp.model.Transaction;
import com.finapp.model.TransactionType;
import com.finapp.model.User;
import com.finapp.repository.TransactionRepository;
import com.finapp.repository.UserRepository;
import com.finapp.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public List<Transaction> getAll(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end) {
        User user = getCurrentUser();
        if (start != null && end != null) {
            LocalDate startDate = LocalDate.parse(start);
            LocalDate endDate = LocalDate.parse(end);
            // type null = all transactions in range (both CREDIT and DEBIT)
            if (type != null)
                return transactionRepository.findByUserAndTypeAndDateBetweenOrderByDateDesc(user, type, startDate, endDate);
            return transactionRepository.findByUserAndDateBetweenOrderByDateDesc(user, startDate, endDate);
        }
        if (month != null && year != null) return transactionService.getByMonthAndYear(month, year, type, user);
        if (year != null) return transactionService.getByYear(year, type, user);
        if (type != null) return transactionService.getByType(type, user);
        return transactionService.getAll(user);
    }

    // Search is a leading-wildcard LIKE across several columns, so it cannot use
    // an index — cap it rather than let an unbounded match scan the whole user.
    private static final int SEARCH_LIMIT = 200;

    private static final int MAX_PAGE_SIZE = 500;

    /**
     * Paged listing. Date, type and category filters are all applied in the
     * query, so a page is a page of the real result — not a slice the client
     * still has to filter down.
     *
     * Sorted by date then id: date alone is not unique, and without a stable
     * tie-breaker rows shift between pages and the reader sees duplicates.
     */
    @GetMapping("/page")
    public TransactionPageDTO getPage(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String budgetCategory,
            @RequestParam(required = false) String paymentSource,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        User user = getCurrentUser();
        LocalDate start = startDate != null ? LocalDate.parse(startDate) : null;
        LocalDate end   = endDate   != null ? LocalDate.parse(endDate)   : null;
        String cat      = blankToNull(category);
        String budgetCat = blankToNull(budgetCategory);
        String source   = blankToNull(paymentSource);

        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.min(Math.max(1, size), MAX_PAGE_SIZE),
                Sort.by(Sort.Order.desc("date"), Sort.Order.desc("id")));

        Page<Transaction> result = transactionRepository.findPage(user, start, end, type, cat, budgetCat, source, pageable);

        List<Object[]> totals = transactionRepository.sumTotalsForFilter(user, start, end, type, cat, budgetCat, source);
        BigDecimal income  = BigDecimal.ZERO;
        BigDecimal expense = BigDecimal.ZERO;
        if (!totals.isEmpty()) {
            Object[] row = totals.get(0);
            income  = toBigDecimal(row[0]);
            expense = toBigDecimal(row[1]);
        }

        return TransactionPageDTO.builder()
                .content(result.getContent())
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .hasNext(result.hasNext())
                .totalIncome(income)
                .totalExpense(expense)
                .build();
    }

    /** Distinct category / budget category values in the given scope. */
    @GetMapping("/filter-options")
    public Map<String, List<String>> getFilterOptions(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String paymentSource) {
        User user = getCurrentUser();
        LocalDate start = startDate != null ? LocalDate.parse(startDate) : null;
        LocalDate end   = endDate   != null ? LocalDate.parse(endDate)   : null;
        String source   = blankToNull(paymentSource);
        return Map.of(
                "categories", transactionRepository.findDistinctCategories(user, start, end, source),
                "budgetCategories", transactionRepository.findDistinctBudgetCategories(user, start, end, source));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal bd) return bd;
        return new BigDecimal(value.toString());
    }

    @GetMapping("/search")
    public List<Transaction> search(
            @RequestParam String q,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        User user = getCurrentUser();
        LocalDate start = startDate != null ? LocalDate.parse(startDate) : null;
        LocalDate end   = endDate   != null ? LocalDate.parse(endDate)   : null;
        return transactionRepository.searchByUser(user, q.trim(), start, end, PageRequest.of(0, SEARCH_LIMIT));
    }

    @GetMapping("/budget/{budgetCategory}")
    public List<Transaction> getByBudgetCategory(
            @PathVariable String budgetCategory,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        if (startDate != null && endDate != null) {
            LocalDate start = LocalDate.parse(startDate);
            LocalDate end = LocalDate.parse(endDate);
            return transactionService.getByBudgetCategory(budgetCategory, getCurrentUser(), start, end);
        }
        return transactionService.getByBudgetCategory(budgetCategory, getCurrentUser());
    }

    @GetMapping("/type/{type}")
    public List<Transaction> getByType(@PathVariable TransactionType type) {
        return transactionService.getByType(type, getCurrentUser());
    }

    @GetMapping("/source/{source}")
    public List<Transaction> getByPaymentSource(@PathVariable String source) {
        return transactionService.getByPaymentSource(source, getCurrentUser());
    }

    @PostMapping
    public ResponseEntity<Transaction> create(@Valid @RequestBody TransactionDTO dto) {
        return ResponseEntity.ok(transactionService.create(dto, getCurrentUser()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Transaction> update(@PathVariable Long id, @Valid @RequestBody TransactionDTO dto) {
        return ResponseEntity.ok(transactionService.update(id, dto, getCurrentUser()));
    }

    @GetMapping("/analytics/monthly")
    public List<Map<String, Object>> getMonthlySummary(@RequestParam(defaultValue = "#{T(java.time.LocalDate).now().getYear()}") int year) {
        return transactionService.getMonthlySummary(year, getCurrentUser());
    }

    @GetMapping("/analytics/weekly")
    public List<Map<String, Object>> getWeeklySummary(@RequestParam(defaultValue = "8") int weeks) {
        return transactionService.getWeeklySummary(weeks, getCurrentUser());
    }

    @GetMapping("/analytics/category")
    public List<Map<String, Object>> getCategorySummary(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        User user = getCurrentUser();
        LocalDate start, end;
        if (month != null && year != null) {
            start = YearMonth.of(year, month).atDay(1);
            end = YearMonth.of(year, month).atEndOfMonth();
        } else if (year != null) {
            start = LocalDate.of(year, 1, 1);
            end = LocalDate.of(year, 12, 31);
        } else {
            start = LocalDate.of(1970, 1, 1);
            end = LocalDate.now();
        }
        return transactionService.getCategorySummary(start, end, user);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        transactionService.delete(id, getCurrentUser());
        return ResponseEntity.noContent().build();
    }

    // Toggle whether a transaction should be included in tax calculation
    @PutMapping("/{id}/tax-toggle")
    public ResponseEntity<Transaction> toggleTaxInclude(@PathVariable Long id, @RequestParam boolean includeInTax) {
        User user = getCurrentUser();
        Transaction transaction = transactionRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));
        transaction.setIncludeInTax(includeInTax);
        transactionRepository.save(transaction);
        return ResponseEntity.ok(transaction);
    }

    // Re-categorize a transaction — updates category + budgetCategory only
    // Budget Overview automatically reflects the change since it aggregates from universal transactions
    @PatchMapping("/{id}/categorize")
    public ResponseEntity<Transaction> recategorize(
            @PathVariable Long id,
            @RequestParam String category,
            @RequestParam String budgetCategory) {
        User user = getCurrentUser();
        Transaction transaction = transactionRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));
        transaction.setCategory(category);
        transaction.setBudgetCategory(budgetCategory);
        transactionRepository.save(transaction);
        return ResponseEntity.ok(transaction);
    }
}
