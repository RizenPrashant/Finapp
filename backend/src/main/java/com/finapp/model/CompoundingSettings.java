package com.finapp.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "compounding_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompoundingSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reinvest_percentage", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal reinvestPercentage = new BigDecimal("100.00"); // Default: 100% reinvest

    @Column(name = "auto_compound")
    @Builder.Default
    private Boolean autoCompound = true; // Master toggle

    @Column(name = "apply_to_trading")
    @Builder.Default
    private Boolean applyToTrading = true;

    @Column(name = "apply_to_investments")
    @Builder.Default
    private Boolean applyToInvestments = true;

    @Column(name = "min_reinvest_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal minReinvestAmount = new BigDecimal("100.00"); // Minimum profit to compound

    @Column(name = "compounding_capital", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal compoundingCapital = BigDecimal.ZERO; // Total capital being compounded

    @Column(name = "initial_capital", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal initialCapital = BigDecimal.ZERO; // Initial seed capital

    @Column(name = "fresh_capital_added", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal freshCapitalAdded = BigDecimal.ZERO; // Additional capital added manually

    @Column(name = "total_reinvested_profits", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalReinvestedProfits = BigDecimal.ZERO; // Total profits reinvested so far

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    @JsonIgnore
    private User user;

    // Helper method to calculate reinvest amount from profit
    public BigDecimal calculateReinvestAmount(BigDecimal profit) {
        if (!Boolean.TRUE.equals(autoCompound) || profit == null || profit.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        if (profit.compareTo(minReinvestAmount) < 0) {
            return BigDecimal.ZERO; // Below minimum threshold
        }
        return profit.multiply(reinvestPercentage)
                .divide(new BigDecimal("100"), 2, BigDecimal.ROUND_HALF_UP);
    }

    // Helper to check if compounding is enabled for a source
    public boolean isEnabledFor(String source) {
        if (!Boolean.TRUE.equals(autoCompound)) return false;

        return switch (source.toLowerCase()) {
            case "trading" -> Boolean.TRUE.equals(applyToTrading);
            case "investments" -> Boolean.TRUE.equals(applyToInvestments);
            default -> false;
        };
    }
}
