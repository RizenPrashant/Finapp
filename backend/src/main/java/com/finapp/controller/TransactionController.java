package com.finapp.controller;

import com.finapp.dto.TransactionDTO;
import com.finapp.model.Transaction;
import com.finapp.model.TransactionType;
import com.finapp.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
    public List<Transaction> getAll(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) TransactionType type) {
        if (month != null && year != null) return transactionService.getByMonthAndYear(month, year, type);
        if (year != null) return transactionService.getByYear(year, type);
        if (type != null) return transactionService.getByType(type);
        return transactionService.getAll();
    }

    @GetMapping("/budget/{budgetCategory}")
    public List<Transaction> getByBudgetCategory(@PathVariable String budgetCategory) {
        return transactionService.getByBudgetCategory(budgetCategory);
    }

    @GetMapping("/type/{type}")
    public List<Transaction> getByType(@PathVariable TransactionType type) {
        return transactionService.getByType(type);
    }

    @PostMapping
    public ResponseEntity<Transaction> create(@Valid @RequestBody TransactionDTO dto) {
        return ResponseEntity.ok(transactionService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Transaction> update(@PathVariable Long id, @Valid @RequestBody TransactionDTO dto) {
        return ResponseEntity.ok(transactionService.update(id, dto));
    }

    @GetMapping("/analytics/monthly")
    public List<Map<String, Object>> getMonthlySummary(@RequestParam(defaultValue = "#{T(java.time.LocalDate).now().getYear()}") int year) {
        return transactionService.getMonthlySummary(year);
    }

    @GetMapping("/analytics/weekly")
    public List<Map<String, Object>> getWeeklySummary(@RequestParam(defaultValue = "8") int weeks) {
        return transactionService.getWeeklySummary(weeks);
    }

    @GetMapping("/analytics/category")
    public List<Map<String, Object>> getCategorySummary(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
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
        return transactionService.getCategorySummary(start, end);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        transactionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
