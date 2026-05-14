package com.finapp.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
public class TaxCalculationDTO {
    // Regime info
    private String regime; // NEW or OLD
    private String financialYear;

    // Income breakdown
    private BigDecimal salaryIncome;
    private BigDecimal businessIncome;
    private BigDecimal interestIncome;
    private BigDecimal rentalIncome;
    private BigDecimal capitalGainsST;
    private BigDecimal capitalGainsLT;
    private BigDecimal otherIncome;
    private BigDecimal totalIncome;

    // Deductions
    private BigDecimal totalDeductions;
    private Map<String, BigDecimal> deductionBreakdown;

    // Tax calculation
    private BigDecimal taxableIncome;
    private BigDecimal taxBeforeCess;
    private BigDecimal cess; // 4% health & education cess
    private BigDecimal totalTax;
    private BigDecimal effectiveTaxRate;

    // Slab breakdown
    private List<TaxSlabDTO> slabBreakdown;

    // Comparison
    private BigDecimal taxInNewRegime;
    private BigDecimal taxInOldRegime;
    private String recommendedRegime;
    private BigDecimal potentialSavings;

    @Data
    public static class TaxSlabDTO {
        private String slab;
        private BigDecimal min;
        private BigDecimal max;
        private BigDecimal rate;
        private BigDecimal amountInSlab;
        private BigDecimal taxForSlab;
    }
}
