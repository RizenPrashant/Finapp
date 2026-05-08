package com.finapp.service;

import com.finapp.dto.BudgetLimitDTO;
import com.finapp.model.BudgetLimit;
import com.finapp.repository.BudgetLimitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BudgetLimitService {

    private final BudgetLimitRepository budgetLimitRepository;

    public List<BudgetLimit> getAll() {
        return budgetLimitRepository.findAll();
    }

    public BudgetLimit getByCategory(String category) {
        return budgetLimitRepository.findByCategoryIgnoreCase(category)
                .orElseThrow(() -> new RuntimeException("Budget limit not found for: " + category));
    }

    public BudgetLimit save(BudgetLimitDTO dto) {
        BudgetLimit limit = budgetLimitRepository.findByCategoryIgnoreCase(dto.getCategory())
                .orElse(new BudgetLimit());
        limit.setCategory(dto.getCategory());
        limit.setLimitAmount(dto.getLimitAmount());
        limit.setColor(dto.getColor());
        limit.setNote(dto.getNote());
        limit.setIcon(dto.getIcon());
        return budgetLimitRepository.save(limit);
    }

    public void delete(Long id) {
        budgetLimitRepository.deleteById(id);
    }
}
