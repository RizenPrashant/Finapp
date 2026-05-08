package com.finapp.repository;

import com.finapp.model.BudgetLimit;
import com.finapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BudgetLimitRepository extends JpaRepository<BudgetLimit, Long> {
    
    // User-specific queries
    List<BudgetLimit> findByUser(User user);

    Optional<BudgetLimit> findByIdAndUser(Long id, User user);

    Optional<BudgetLimit> findByUserAndCategoryIgnoreCase(User user, String category);

    // Find budgets without user (orphan budgets from DataSeeder)
    List<BudgetLimit> findByUserIsNull();

    // Legacy method
    Optional<BudgetLimit> findByCategoryIgnoreCase(String category);
}
