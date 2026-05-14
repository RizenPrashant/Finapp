package com.finapp.dto;

import com.finapp.model.TaxProfile;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
public class AutoCalculatedTaxDTO {
    // The calculated tax profile
    private TaxProfile profile;

    // Categorized transactions breakdown
    private List<TransactionDetail> categorizedTransactions;

    // Summary by category
    private Map<String, BigDecimal> categorySummary;

    // Tax calculation result
    private TaxCalculationDTO taxCalculation;

    // Calculation explanation
    private String calculationExplanation;

    @Data
    public static class TransactionDetail {
        private Long transactionId;
        private String title;
        private String category;
        private BigDecimal amount;
        private LocalDate date;
        private String incomeType; // SALARY, BUSINESS, INTEREST, RENTAL, CAPITAL_GAINS_ST, CAPITAL_GAINS_LT, OTHER, EXCLUDED, USER_EXCLUDED
        private String explanation;
        private Boolean includeInTax; // User toggle to include/exclude from tax calculation
    }
}
