package com.finapp.controller;

import com.finapp.dto.BudgetLimitDTO;
import com.finapp.model.BudgetLimit;
import com.finapp.model.User;
import com.finapp.repository.UserRepository;
import com.finapp.service.BudgetLimitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/budgets")
@RequiredArgsConstructor
public class BudgetLimitController {

    private final BudgetLimitService budgetLimitService;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public List<BudgetLimit> getAll() {
        return budgetLimitService.getAll(getCurrentUser());
    }

    @GetMapping("/{category}")
    public ResponseEntity<BudgetLimit> getByCategory(@PathVariable String category) {
        return ResponseEntity.ok(budgetLimitService.getByCategory(category, getCurrentUser()));
    }

    @PostMapping
    public ResponseEntity<BudgetLimit> save(@Valid @RequestBody BudgetLimitDTO dto) {
        return ResponseEntity.ok(budgetLimitService.save(dto, getCurrentUser()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        budgetLimitService.delete(id, getCurrentUser());
        return ResponseEntity.noContent().build();
    }
}
