package com.finapp.controller;

import com.finapp.dto.BudgetLimitDTO;
import com.finapp.model.BudgetLimit;
import com.finapp.service.BudgetLimitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/budgets")
@RequiredArgsConstructor
public class BudgetLimitController {

    private final BudgetLimitService budgetLimitService;

    @GetMapping
    public List<BudgetLimit> getAll() {
        return budgetLimitService.getAll();
    }

    @GetMapping("/{category}")
    public ResponseEntity<BudgetLimit> getByCategory(@PathVariable String category) {
        return ResponseEntity.ok(budgetLimitService.getByCategory(category));
    }

    @PostMapping
    public ResponseEntity<BudgetLimit> save(@Valid @RequestBody BudgetLimitDTO dto) {
        return ResponseEntity.ok(budgetLimitService.save(dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        budgetLimitService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
