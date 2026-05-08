package com.finapp.service;

import com.finapp.dto.BudgetLimitDTO;
import com.finapp.model.BudgetLimit;
import com.finapp.model.User;
import com.finapp.repository.BudgetLimitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BudgetLimitService {

    private final BudgetLimitRepository budgetLimitRepository;

    public List<BudgetLimit> getAll(User user) {
        List<BudgetLimit> budgets = budgetLimitRepository.findByUser(user);
        // If user has no budgets, try to assign orphan budgets first
        if (budgets.isEmpty()) {
            List<BudgetLimit> orphanBudgets = budgetLimitRepository.findByUserIsNull();
            if (!orphanBudgets.isEmpty()) {
                // Assign existing orphan budgets to this user
                orphanBudgets.forEach(b -> b.setUser(user));
                budgetLimitRepository.saveAll(orphanBudgets);
                budgets = budgetLimitRepository.findByUser(user);
            } else {
                // Create new default budgets if no orphans exist
                createDefaultBudgets(user);
                budgets = budgetLimitRepository.findByUser(user);
            }
        }
        return budgets;
    }

    private void createDefaultBudgets(User user) {
        List<BudgetLimit> defaultBudgets = List.of(
            createBudget("Monthly Spend", new BigDecimal("50000"), "#FFA000", "You've used 90% of your spending limit.", user),
            createBudget("Monthly Total Savings", new BigDecimal("10000"), "#4CAF50", "Nice! Keep saving to reach your goal.", user),
            createBudget("Monthly Total Expense", new BigDecimal("50000"), "#D32F2F", "Warning: You're close to your max expense.", user),
            createBudget("Monthly Food Expense", new BigDecimal("15000"), "#4CAF50", "You're managing food expenses well.", user),
            createBudget("Monthly Investment", new BigDecimal("10000"), "#FFA000", "Consider boosting investments.", user),
            createBudget("Miscellaneous", new BigDecimal("10000"), "#4CAF50", "Track your miscellaneous costs.", user)
        );
        budgetLimitRepository.saveAll(defaultBudgets);
    }

    private BudgetLimit createBudget(String category, BigDecimal limit, String color, String note, User user) {
        return BudgetLimit.builder()
            .category(category)
            .limitAmount(limit)
            .color(color)
            .note(note)
            .user(user)
            .build();
    }

    public BudgetLimit getByCategory(String category, User user) {
        return budgetLimitRepository.findByUserAndCategoryIgnoreCase(user, category)
                .orElseThrow(() -> new RuntimeException("Budget limit not found for: " + category));
    }

    public BudgetLimit save(BudgetLimitDTO dto, User user) {
        BudgetLimit limit = budgetLimitRepository.findByUserAndCategoryIgnoreCase(user, dto.getCategory())
                .orElse(new BudgetLimit());
        limit.setCategory(dto.getCategory());
        limit.setLimitAmount(dto.getLimitAmount());
        limit.setColor(dto.getColor());
        limit.setNote(dto.getNote());
        limit.setIcon(dto.getIcon());
        limit.setUser(user);
        return budgetLimitRepository.save(limit);
    }

    public void delete(Long id, User user) {
        BudgetLimit limit = budgetLimitRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Budget limit not found"));
        budgetLimitRepository.delete(limit);
    }
}
