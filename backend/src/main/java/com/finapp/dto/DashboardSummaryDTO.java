package com.finapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryDTO {
    private BigDecimal totalIncome;
    private BigDecimal totalExpenses;
    private BigDecimal totalSavings;
    private BigDecimal totalBalance;
    private Double savingsRate;
    private BigDecimal totalAssets;
    private BigDecimal totalLiabilities;
    private BigDecimal totalDebt;
    private BigDecimal totalInvestments;
    private BigDecimal compoundingCapital;

    // Compounding Breakdown
    private BigDecimal compoundingInitialCapital;
    private BigDecimal compoundingFreshCapital;
    private BigDecimal compoundingReinvestedProfits;

    private BigDecimal netWorth;
}
