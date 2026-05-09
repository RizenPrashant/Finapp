package com.finapp.service;

import com.finapp.model.Investment;
import com.finapp.model.User;
import com.finapp.repository.InvestmentRepository;
import com.finapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvestmentInterestService {

    private final InvestmentRepository investmentRepository;
    private final UserRepository userRepository;
    private final InvestmentService investmentService;

    /**
     * Monthly interest calculation - runs on 1st of every month at 1 AM
     * Checks each investment if interest is due based on configured frequency
     */
    @Scheduled(cron = "0 0 1 1 * ?")
    @Transactional
    public void calculateMonthlyInterest() {
        log.info("=== Starting Monthly Interest Calculation ===");
        
        List<User> users = userRepository.findAll();
        int processedCount = 0;
        
        for (User user : users) {
            List<Investment> interestInvestments = investmentRepository.findByUser(user).stream()
                .filter(inv -> Boolean.TRUE.equals(inv.getInterestEnabled()))
                .filter(inv -> inv.getInterestRate() != null && inv.getInterestRate().compareTo(BigDecimal.ZERO) > 0)
                .filter(Investment::isInterestDue)  // Check if interest is actually due
                .toList();
            
            for (Investment investment : interestInvestments) {
                try {
                    if (calculateAndApplyInterest(investment, user)) {
                        processedCount++;
                    }
                } catch (Exception e) {
                    log.error("Error calculating interest for investment {}: {}", investment.getId(), e.getMessage());
                }
            }
        }
        
        log.info("=== Monthly Interest Calculation Complete. Processed {} investments ===", processedCount);
    }

    /**
     * Manual trigger for testing - can be called from controller
     * Respects the interest configuration (enabled, rate, frequency, due date)
     */
    @Transactional
    public void manualInterestCalculation(User user) {
        log.info("=== Manual Interest Calculation for user: {} ===", user.getEmail());
        
        List<Investment> interestInvestments = investmentRepository.findByUser(user).stream()
            .filter(inv -> Boolean.TRUE.equals(inv.getInterestEnabled()))
            .filter(inv -> inv.getInterestRate() != null && inv.getInterestRate().compareTo(BigDecimal.ZERO) > 0)
            .filter(Investment::isInterestDue)
            .toList();
        
        int processedCount = 0;
        for (Investment investment : interestInvestments) {
            if (calculateAndApplyInterest(investment, user)) {
                processedCount++;
            }
        }
        
        log.info("=== Manual calculation complete. Processed {} investments ===", processedCount);
    }

    /**
     * Calculate and apply interest to an investment
     * @return true if interest was applied, false otherwise
     */
    private boolean calculateAndApplyInterest(Investment investment, User user) {
        // Validate interest configuration
        if (!Boolean.TRUE.equals(investment.getInterestEnabled()) || 
            investment.getInterestRate() == null || 
            investment.getInterestRate().compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }
        
        // Check if interest is due
        if (!investment.isInterestDue()) {
            log.debug("Interest not due for {} ({}). Last date: {}", 
                investment.getName(), 
                investment.getType(),
                investment.getLastInterestDate() != null ? investment.getLastInterestDate() : investment.getBuyDate());
            return false;
        }

        BigDecimal annualRate = investment.getInterestRate().divide(BigDecimal.valueOf(100)); // Convert percentage to decimal
        BigDecimal principal = investment.getBuyPrice().multiply(
            BigDecimal.valueOf(investment.getQuantity() != null ? investment.getQuantity() : 1)
        );
        
        BigDecimal currentValue = investment.getCurrentValue();
        
        // Calculate interest based on frequency
        BigDecimal periodRate = getPeriodRate(annualRate, investment.getInterestFrequency());
        BigDecimal interestAmount = principal.multiply(periodRate);
        
        // Add interest to current value
        BigDecimal newValue = currentValue.add(interestAmount);
        investment.setCurrentValue(newValue);
        
        // Update last interest date
        investment.setLastInterestDate(LocalDate.now());
        
        // Save investment
        investmentRepository.save(investment);
        
        log.info("Interest applied for {} ({}): Principal={}, Rate={}%, Frequency={}, Interest={}, NewValue={}",
            investment.getName(),
            investment.getType(),
            principal,
            investment.getInterestRate(),
            investment.getInterestFrequency(),
            interestAmount,
            newValue
        );
        
        // Update Investment Capital asset
        investmentService.updateInvestmentCapitalAsset(user);
        
        return true;
    }
    
    /**
     * Get interest rate for the period based on frequency
     */
    private BigDecimal getPeriodRate(BigDecimal annualRate, com.finapp.model.InterestFrequency frequency) {
        return switch (frequency) {
            case MONTHLY -> annualRate.divide(BigDecimal.valueOf(12), 10, RoundingMode.HALF_UP);
            case QUARTERLY -> annualRate.divide(BigDecimal.valueOf(4), 10, RoundingMode.HALF_UP);
            case HALF_YEARLY -> annualRate.divide(BigDecimal.valueOf(2), 10, RoundingMode.HALF_UP);
            case YEARLY -> annualRate;
        };
    }

    /**
     * Get interest projection for an investment
     * Uses configured interest rate if available, otherwise returns null
     */
    public InterestProjection getInterestProjection(Investment investment, int months) {
        // Check if interest is enabled and rate is configured
        if (!Boolean.TRUE.equals(investment.getInterestEnabled()) || 
            investment.getInterestRate() == null || 
            investment.getInterestRate().compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }

        BigDecimal annualRate = investment.getInterestRate().divide(BigDecimal.valueOf(100)); // Convert to decimal
        BigDecimal principal = investment.getBuyPrice().multiply(
            BigDecimal.valueOf(investment.getQuantity() != null ? investment.getQuantity() : 1)
        );
        
        BigDecimal monthlyRate = annualRate.divide(BigDecimal.valueOf(12), 10, RoundingMode.HALF_UP);
        
        // Compound interest calculation
        BigDecimal multiplier = BigDecimal.ONE.add(monthlyRate).pow(months);
        BigDecimal projectedValue = principal.multiply(multiplier);
        BigDecimal totalInterest = projectedValue.subtract(principal);
        
        return InterestProjection.builder()
            .principal(principal)
            .projectedValue(projectedValue)
            .totalInterest(totalInterest)
            .monthlyInterest(principal.multiply(monthlyRate))
            .months(months)
            .build();
    }

    // Inner class for projection results
    @lombok.Builder
    @lombok.Data
    public static class InterestProjection {
        private BigDecimal principal;
        private BigDecimal projectedValue;
        private BigDecimal totalInterest;
        private BigDecimal monthlyInterest;
        private int months;
    }
}
