package com.finapp.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "tax_profiles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private TaxRegime regime = TaxRegime.NEW; // NEW or OLD

    @Column(nullable = false)
    private String financialYear = "2024-25"; // Format: YYYY-YY

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private EmploymentType employmentType = EmploymentType.SALARIED;

    // Income Sources
    private BigDecimal salaryIncome = BigDecimal.ZERO;
    private BigDecimal businessIncome = BigDecimal.ZERO;
    private BigDecimal interestIncome = BigDecimal.ZERO; // FD, Savings
    private BigDecimal rentalIncome = BigDecimal.ZERO;
    private BigDecimal capitalGainsST = BigDecimal.ZERO; // Short term (<1 year)
    private BigDecimal capitalGainsLT = BigDecimal.ZERO; // Long term (>1 year)
    private BigDecimal otherIncome = BigDecimal.ZERO;

    // Deductions (Only applicable for OLD regime)
    private BigDecimal section80C = BigDecimal.ZERO;     // Max 1.5L
    private BigDecimal section80D = BigDecimal.ZERO;     // Health insurance
    private BigDecimal section80E = BigDecimal.ZERO;     // Education loan interest
    private BigDecimal section80G = BigDecimal.ZERO;     // Donations
    private BigDecimal section80CCD1B = BigDecimal.ZERO; // NPS additional 50k
    private BigDecimal section24B = BigDecimal.ZERO;     // Home loan interest (max 2L)
    private BigDecimal hraExemption = BigDecimal.ZERO;  // HRA
    private BigDecimal ltaExemption = BigDecimal.ZERO;  // Leave Travel
    private BigDecimal standardDeduction = BigDecimal.valueOf(75000); // 75k default for FY 2024-25 New Regime

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private LocalDateTime updatedAt = LocalDateTime.now();

    public enum TaxRegime {
        NEW, OLD
    }

    public enum EmploymentType {
        SALARIED, SELF_EMPLOYED, BUSINESS
    }

    // Calculate total income
    public BigDecimal getTotalIncome() {
        return salaryIncome
                .add(businessIncome)
                .add(interestIncome)
                .add(rentalIncome)
                .add(capitalGainsST)
                .add(capitalGainsLT)
                .add(otherIncome);
    }

    // Calculate total deductions (Old regime only)
    public BigDecimal getTotalDeductions() {
        if (regime == TaxRegime.NEW) {
            // New regime FY 2024-25: Standard Deduction increased to ₹75,000
            // Only standard deduction is allowed in new regime
            return BigDecimal.valueOf(75000);
        }
        // Old regime: All deductions + Standard Deduction of ₹50,000
        return section80C.min(BigDecimal.valueOf(150000))
                .add(section80D)
                .add(section80E)
                .add(section80G)
                .add(section80CCD1B.min(BigDecimal.valueOf(50000)))
                .add(section24B.min(BigDecimal.valueOf(200000)))
                .add(hraExemption)
                .add(ltaExemption)
                .add(BigDecimal.valueOf(50000)); // Old regime: Standard Deduction ₹50,000
    }

    // Calculate taxable income
    public BigDecimal getTaxableIncome() {
        return getTotalIncome().subtract(getTotalDeductions()).max(BigDecimal.ZERO);
    }
}
