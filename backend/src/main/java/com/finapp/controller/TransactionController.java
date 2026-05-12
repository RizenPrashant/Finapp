package com.finapp.controller;

import com.finapp.dto.TransactionDTO;
import com.finapp.model.Transaction;
import com.finapp.model.TransactionType;
import com.finapp.model.User;
import com.finapp.repository.UserRepository;
import com.finapp.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
            @RequestParam(required = false) TransactionType type) {
        User user = getCurrentUser();
        if (month != null && year != null) return transactionService.getByMonthAndYear(month, year, type, user);
        if (year != null) return transactionService.getByYear(year, type, user);
        if (type != null) return transactionService.getByType(type, user);
        return transactionService.getAll(user);
    }

    @GetMapping("/budget/{budgetCategory}")
    public List<Transaction> getByBudgetCategory(@PathVariable String budgetCategory) {
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
}
