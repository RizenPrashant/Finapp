package com.finapp.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Entity
@Table(name = "investments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Investment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvestmentType type;
    
    @Column(nullable = false)
    private BigDecimal buyPrice;
    
    @Column(nullable = false)
    private BigDecimal currentValue;
    
    private Integer quantity;
    
    @Column(name = "buy_date")
    private LocalDate buyDate;
    
    private String notes;
    
    // Interest configuration fields
    @Column(name = "interest_enabled")
    private Boolean interestEnabled = false;
    
    @Column(name = "interest_rate", precision = 5, scale = 2)
    private BigDecimal interestRate;  // Annual interest rate in percentage (e.g., 7.5 for 7.5%)
    
    @Enumerated(EnumType.STRING)
    @Column(name = "interest_frequency")
    private InterestFrequency interestFrequency = InterestFrequency.MONTHLY;
    
    @Column(name = "last_interest_date")
    private LocalDate lastInterestDate;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Transient
    public BigDecimal getProfitLoss() {
        if (currentValue == null || buyPrice == null) return BigDecimal.ZERO;
        BigDecimal qty = quantity != null ? BigDecimal.valueOf(quantity) : BigDecimal.ONE;
        return currentValue.multiply(qty).subtract(buyPrice.multiply(qty));
    }
    
    @Transient
    public BigDecimal getProfitLossPercentage() {
        if (buyPrice == null || buyPrice.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        BigDecimal qty = quantity != null ? BigDecimal.valueOf(quantity) : BigDecimal.ONE;
        BigDecimal invested = buyPrice.multiply(qty);
        BigDecimal current = currentValue.multiply(qty);
        if (invested.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        return current.subtract(invested)
                .divide(invested, 4, BigDecimal.ROUND_HALF_UP)
                .multiply(BigDecimal.valueOf(100));
    }
    
    @Transient
    public BigDecimal getTotalInvested() {
        if (buyPrice == null) return BigDecimal.ZERO;
        BigDecimal qty = quantity != null ? BigDecimal.valueOf(quantity) : BigDecimal.ONE;
        return buyPrice.multiply(qty);
    }
    
    @Transient
    public BigDecimal getTotalCurrentValue() {
        if (currentValue == null) return BigDecimal.ZERO;
        BigDecimal qty = quantity != null ? BigDecimal.valueOf(quantity) : BigDecimal.ONE;
        return currentValue.multiply(qty);
    }
    
    /**
     * Check if interest calculation is due based on frequency and last calculation date
     */
    @Transient
    public boolean isInterestDue() {
        if (!Boolean.TRUE.equals(interestEnabled) || interestRate == null || interestRate.compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }
        
        LocalDate today = LocalDate.now();
        LocalDate referenceDate = lastInterestDate != null ? lastInterestDate : buyDate;
        
        if (referenceDate == null) return false;
        
        long monthsSince = ChronoUnit.MONTHS.between(referenceDate.withDayOfMonth(1), today.withDayOfMonth(1));
        
        return switch (interestFrequency) {
            case MONTHLY -> monthsSince >= 1;
            case QUARTERLY -> monthsSince >= 3;
            case HALF_YEARLY -> monthsSince >= 6;
            case YEARLY -> monthsSince >= 12;
        };
    }
    
    /**
     * Get the number of months since last interest calculation
     */
    @Transient
    public long getMonthsSinceLastInterest() {
        LocalDate today = LocalDate.now();
        LocalDate referenceDate = lastInterestDate != null ? lastInterestDate : buyDate;
        
        if (referenceDate == null) return 0;
        
        return ChronoUnit.MONTHS.between(referenceDate.withDayOfMonth(1), today.withDayOfMonth(1));
    }
}
