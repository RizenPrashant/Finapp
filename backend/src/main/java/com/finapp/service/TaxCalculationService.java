package com.finapp.service;

import com.finapp.dto.AutoCalculatedTaxDTO;
import com.finapp.dto.TaxCalculationDTO;
import com.finapp.model.TaxProfile;
import com.finapp.model.Transaction;
import com.finapp.model.TransactionType;
import com.finapp.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TaxCalculationService {

    private final TransactionRepository transactionRepository;

    // New Regime 2024-25 Slabs
    private static final BigDecimal[][] NEW_REGIME_SLABS = {
        {BigDecimal.ZERO, new BigDecimal("300000"), new BigDecimal("0")},      // 0% upto 3L
        {new BigDecimal("300001"), new BigDecimal("700000"), new BigDecimal("0.05")},  // 5% 3-7L
        {new BigDecimal("700001"), new BigDecimal("1000000"), new BigDecimal("0.10")}, // 10% 7-10L
        {new BigDecimal("1000001"), new BigDecimal("1200000"), new BigDecimal("0.15")}, // 15% 10-12L
        {new BigDecimal("1200001"), new BigDecimal("1500000"), new BigDecimal("0.20")}, // 20% 12-15L
        {new BigDecimal("1500001"), null, new BigDecimal("0.30")}                      // 30% above 15L
    };

    // Old Regime 2024-25 Slabs
    private static final BigDecimal[][] OLD_REGIME_SLABS = {
        {BigDecimal.ZERO, new BigDecimal("250000"), new BigDecimal("0")},      // 0% upto 2.5L
        {new BigDecimal("250001"), new BigDecimal("500000"), new BigDecimal("0.05")},  // 5% 2.5-5L
        {new BigDecimal("500001"), new BigDecimal("1000000"), new BigDecimal("0.20")}, // 20% 5-10L
        {new BigDecimal("1000001"), null, new BigDecimal("0.30")}                      // 30% above 10L
    };

    // Section 87A Rebate (for income upto 7L in new regime, 5L in old regime)
    private static final BigDecimal REBATE_LIMIT_NEW = new BigDecimal("700000");
    private static final BigDecimal REBATE_LIMIT_OLD = new BigDecimal("500000");
    private static final BigDecimal MAX_REBATE = new BigDecimal("25000");

    public TaxCalculationDTO calculateTax(TaxProfile profile) {
        TaxCalculationDTO result = new TaxCalculationDTO();
        result.setRegime(profile.getRegime().name());
        result.setFinancialYear(profile.getFinancialYear());

        // Set income breakdown
        result.setSalaryIncome(profile.getSalaryIncome());
        result.setBusinessIncome(profile.getBusinessIncome());
        result.setInterestIncome(profile.getInterestIncome());
        result.setRentalIncome(profile.getRentalIncome());
        result.setCapitalGainsST(profile.getCapitalGainsST());
        result.setCapitalGainsLT(profile.getCapitalGainsLT());
        result.setOtherIncome(profile.getOtherIncome());
        result.setTotalIncome(profile.getTotalIncome());

        // Set deductions
        result.setTotalDeductions(profile.getTotalDeductions());
        Map<String, BigDecimal> deductions = new HashMap<>();
        if (profile.getRegime() == TaxProfile.TaxRegime.OLD) {
            deductions.put("80C", profile.getSection80C().min(new BigDecimal("150000")));
            deductions.put("80D", profile.getSection80D());
            deductions.put("80E", profile.getSection80E());
            deductions.put("80G", profile.getSection80G());
            deductions.put("80CCD(1B)", profile.getSection80CCD1B().min(new BigDecimal("50000")));
            deductions.put("24B", profile.getSection24B().min(new BigDecimal("200000")));
            deductions.put("HRA", profile.getHraExemption());
            deductions.put("LTA", profile.getLtaExemption());
        }
        deductions.put("Standard Deduction", profile.getStandardDeduction());
        result.setDeductionBreakdown(deductions);

        // Calculate taxable income
        BigDecimal taxableIncome = profile.getTaxableIncome();
        result.setTaxableIncome(taxableIncome);

        // Calculate tax based on regime
        BigDecimal taxBeforeCess;
        List<TaxCalculationDTO.TaxSlabDTO> slabBreakdown;

        if (profile.getRegime() == TaxProfile.TaxRegime.NEW) {
            slabBreakdown = calculateSlabTax(taxableIncome, NEW_REGIME_SLABS);
            taxBeforeCess = slabBreakdown.stream()
                    .map(TaxCalculationDTO.TaxSlabDTO::getTaxForSlab)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Apply Section 87A rebate for New Regime
            if (taxableIncome.compareTo(REBATE_LIMIT_NEW) <= 0) {
                taxBeforeCess = taxBeforeCess.min(MAX_REBATE).max(BigDecimal.ZERO);
            }
        } else {
            slabBreakdown = calculateSlabTax(taxableIncome, OLD_REGIME_SLABS);
            taxBeforeCess = slabBreakdown.stream()
                    .map(TaxCalculationDTO.TaxSlabDTO::getTaxForSlab)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Apply Section 87A rebate for Old Regime
            if (taxableIncome.compareTo(REBATE_LIMIT_OLD) <= 0) {
                taxBeforeCess = taxBeforeCess.min(MAX_REBATE).max(BigDecimal.ZERO);
            }
        }

        result.setSlabBreakdown(slabBreakdown);
        result.setTaxBeforeCess(taxBeforeCess);

        // Calculate 4% Health & Education Cess
        BigDecimal cess = taxBeforeCess.multiply(new BigDecimal("0.04"));
        result.setCess(cess);

        // Total tax
        BigDecimal totalTax = taxBeforeCess.add(cess);
        result.setTotalTax(totalTax);

        // Effective tax rate
        if (profile.getTotalIncome().compareTo(BigDecimal.ZERO) > 0) {
            result.setEffectiveTaxRate(totalTax
                    .divide(profile.getTotalIncome(), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100")));
        } else {
            result.setEffectiveTaxRate(BigDecimal.ZERO);
        }

        return result;
    }

    public TaxCalculationDTO compareRegimes(TaxProfile profile) {
        // Calculate for New Regime
        profile.setRegime(TaxProfile.TaxRegime.NEW);
        TaxCalculationDTO newRegimeResult = calculateTax(profile);

        // Calculate for Old Regime
        profile.setRegime(TaxProfile.TaxRegime.OLD);
        TaxCalculationDTO oldRegimeResult = calculateTax(profile);

        // Restore original regime
        profile.setRegime(TaxProfile.TaxRegime.valueOf(newRegimeResult.getRegime()));

        // Create comparison result
        TaxCalculationDTO comparison = new TaxCalculationDTO();
        comparison.setRegime("COMPARISON");
        comparison.setTaxInNewRegime(newRegimeResult.getTotalTax());
        comparison.setTaxInOldRegime(oldRegimeResult.getTotalTax());

        if (newRegimeResult.getTotalTax().compareTo(oldRegimeResult.getTotalTax()) <= 0) {
            comparison.setRecommendedRegime("NEW");
            comparison.setPotentialSavings(oldRegimeResult.getTotalTax().subtract(newRegimeResult.getTotalTax()));
        } else {
            comparison.setRecommendedRegime("OLD");
            comparison.setPotentialSavings(newRegimeResult.getTotalTax().subtract(oldRegimeResult.getTotalTax()));
        }

        return comparison;
    }

    private List<TaxCalculationDTO.TaxSlabDTO> calculateSlabTax(BigDecimal income, BigDecimal[][] slabs) {
        List<TaxCalculationDTO.TaxSlabDTO> result = new ArrayList<>();

        for (BigDecimal[] slab : slabs) {
            BigDecimal min = slab[0];
            BigDecimal max = slab[1];
            BigDecimal rate = slab[2];

            TaxCalculationDTO.TaxSlabDTO slabDTO = new TaxCalculationDTO.TaxSlabDTO();
            slabDTO.setMin(min);
            slabDTO.setMax(max);
            slabDTO.setRate(rate.multiply(new BigDecimal("100"))); // Convert to percentage

            // Calculate amount in this slab
            BigDecimal amountInSlab;
            if (max == null) {
                // Last slab - no upper limit
                amountInSlab = income.subtract(min).max(BigDecimal.ZERO);
            } else {
                // Regular slab
                if (income.compareTo(min) <= 0) {
                    amountInSlab = BigDecimal.ZERO;
                } else if (income.compareTo(max) >= 0) {
                    amountInSlab = max.subtract(min).add(BigDecimal.ONE);
                } else {
                    amountInSlab = income.subtract(min);
                }
            }

            slabDTO.setAmountInSlab(amountInSlab.max(BigDecimal.ZERO));
            slabDTO.setTaxForSlab(slabDTO.getAmountInSlab().multiply(rate));

            // Format slab label
            if (max == null) {
                slabDTO.setSlab(String.format("Above ₹%s", formatCurrency(min.subtract(BigDecimal.ONE))));
            } else {
                slabDTO.setSlab(String.format("₹%s - ₹%s", formatCurrency(min), formatCurrency(max)));
            }

            result.add(slabDTO);
        }

        return result;
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount.compareTo(new BigDecimal("100000")) >= 0) {
            return String.format("%.2fL", amount.doubleValue() / 100000);
        }
        return amount.setScale(0, RoundingMode.HALF_UP).toString();
    }

    // Auto-calculate income from transactions for a financial year
    public AutoCalculatedTaxDTO autoCalculateIncomeFromTransactions(Long userId, String financialYear) {
        // Parse financial year (e.g., "2024-25" -> Apr 2024 to Mar 2025)
        int startYear = Integer.parseInt(financialYear.split("-")[0]);
        LocalDate startDate = LocalDate.of(startYear, 4, 1);
        LocalDate endDate = LocalDate.of(startYear + 1, 3, 31);

        AutoCalculatedTaxDTO result = new AutoCalculatedTaxDTO();
        List<AutoCalculatedTaxDTO.TransactionDetail> categorizedTxns = new ArrayList<>();
        Map<String, BigDecimal> categorySummary = new HashMap<>();

        TaxProfile profile = new TaxProfile();
        profile.setFinancialYear(financialYear);
        profile.setRegime(TaxProfile.TaxRegime.NEW);
        profile.setEmploymentType(TaxProfile.EmploymentType.SALARIED);

        // Get all CREDIT transactions in the financial year
        List<Transaction> credits = transactionRepository.findByUserIdAndTypeAndDateBetween(
                userId, TransactionType.CREDIT, startDate, endDate);

        // Categorize income from transactions
        BigDecimal salaryIncome = BigDecimal.ZERO;
        BigDecimal businessIncome = BigDecimal.ZERO;
        BigDecimal interestIncome = BigDecimal.ZERO;
        BigDecimal rentalIncome = BigDecimal.ZERO;
        BigDecimal capitalGainsST = BigDecimal.ZERO;
        BigDecimal capitalGainsLT = BigDecimal.ZERO;
        BigDecimal otherIncome = BigDecimal.ZERO;
        BigDecimal excludedIncome = BigDecimal.ZERO;

        int includedCount = 0;
        int excludedCount = 0;

        for (Transaction t : credits) {
            BigDecimal amount = t.getAmount();
            String category = t.getCategory() != null ? t.getCategory().toUpperCase() : "";
            String title = t.getTitle() != null ? t.getTitle().toUpperCase() : "";
            Boolean includeInTax = t.getIncludeInTax() != null ? t.getIncludeInTax() : true;

            AutoCalculatedTaxDTO.TransactionDetail detail = new AutoCalculatedTaxDTO.TransactionDetail();
            detail.setTransactionId(t.getId());
            detail.setTitle(t.getTitle());
            detail.setCategory(t.getCategory());
            detail.setAmount(amount);
            detail.setDate(t.getDate());
            detail.setIncludeInTax(includeInTax);

            // If user marked this transaction as NOT taxable, skip it
            if (!includeInTax) {
                excludedIncome = excludedIncome.add(amount);
                detail.setIncomeType("USER_EXCLUDED");
                detail.setExplanation("User marked as not taxable");
                categorySummary.merge("USER_EXCLUDED", amount, BigDecimal::add);
                excludedCount++;
                categorizedTxns.add(detail);
                continue;
            }

            includedCount++;

            // Salary Income
            if (category.contains("SALARY") || category.contains("WAGE") ||
                title.contains("SALARY") || title.contains("PAYROLL")) {
                salaryIncome = salaryIncome.add(amount);
                detail.setIncomeType("SALARY");
                detail.setExplanation("Salary/Wage income - taxable");
                categorySummary.merge("SALARY", amount, BigDecimal::add);
            }
            // Business / Freelance Income
            else if (category.contains("BUSINESS") || category.contains("FREELANCE") ||
                     category.contains("CONSULTING") || category.contains("PROFESSION") ||
                     title.contains("CLIENT") || title.contains("PROJECT") ||
                     title.contains("FREELANCE") || title.contains("CONSULTING")) {
                businessIncome = businessIncome.add(amount);
                detail.setIncomeType("BUSINESS");
                detail.setExplanation("Business/Freelance income - taxable");
                categorySummary.merge("BUSINESS", amount, BigDecimal::add);
            }
            // Interest Income
            else if (category.contains("INTEREST") || category.contains("FD") ||
                     category.contains("SAVINGS") || category.contains("RD") ||
                     title.contains("INTEREST") || title.contains("FD MATURITY") ||
                     title.contains("SAVINGS INTEREST")) {
                interestIncome = interestIncome.add(amount);
                detail.setIncomeType("INTEREST");
                detail.setExplanation("Interest income (FD/Savings) - taxable");
                categorySummary.merge("INTEREST", amount, BigDecimal::add);
            }
            // Rental Income
            else if (category.contains("RENT") || category.contains("RENTAL") ||
                     category.contains("PROPERTY") ||
                     title.contains("RENT") || title.contains("TENANT") ||
                     title.contains("HOUSE RENT") || title.contains("LEASE")) {
                rentalIncome = rentalIncome.add(amount);
                detail.setIncomeType("RENTAL");
                detail.setExplanation("Rental income - taxable");
                categorySummary.merge("RENTAL", amount, BigDecimal::add);
            }
            // Dividend Income
            else if (category.contains("DIVIDEND") ||
                     title.contains("DIVIDEND") || title.contains("DIVIDEND PAYOUT")) {
                otherIncome = otherIncome.add(amount);
                detail.setIncomeType("DIVIDEND");
                detail.setExplanation("Dividend income - taxable (if > ₹10L)");
                categorySummary.merge("DIVIDEND", amount, BigDecimal::add);
            }
            // Capital Gains from Investments/Trading
            else if (category.contains("INVESTMENT") || category.contains("CAPITAL") ||
                     category.contains("TRADING") || category.contains("STOCK") ||
                     title.contains("PROFIT") || title.contains("GAIN") ||
                     title.contains("STOCK SOLD") || title.contains("MUTUAL FUND REDEMPTION")) {
                capitalGainsST = capitalGainsST.add(amount);
                detail.setIncomeType("CAPITAL_GAINS_ST");
                detail.setExplanation("Capital Gains (Short Term) - taxable at 15%/slab rate");
                categorySummary.merge("CAPITAL_GAINS_ST", amount, BigDecimal::add);
            }
            // Cashback, Gifts, Refunds - not taxable mostly
            else if (category.contains("CASHBACK") || category.contains("REFUND") ||
                     category.contains("GIFT")) {
                excludedIncome = excludedIncome.add(amount);
                detail.setIncomeType("EXCLUDED");
                detail.setExplanation("Cashback/Refund/Gift - not taxable income");
                categorySummary.merge("EXCLUDED", amount, BigDecimal::add);
            }
            // Everything else as Other Income
            else {
                otherIncome = otherIncome.add(amount);
                detail.setIncomeType("OTHER");
                detail.setExplanation("Other income - taxable");
                categorySummary.merge("OTHER", amount, BigDecimal::add);
            }

            categorizedTxns.add(detail);
        }

        profile.setSalaryIncome(salaryIncome);
        profile.setBusinessIncome(businessIncome);
        profile.setInterestIncome(interestIncome);
        profile.setRentalIncome(rentalIncome);
        profile.setCapitalGainsST(capitalGainsST);
        profile.setCapitalGainsLT(capitalGainsLT);
        profile.setOtherIncome(otherIncome);
        profile.setStandardDeduction(BigDecimal.valueOf(50000));

        // Auto-detect employment type based on income sources
        if (salaryIncome.compareTo(BigDecimal.ZERO) > 0 && businessIncome.compareTo(BigDecimal.ZERO) == 0) {
            profile.setEmploymentType(TaxProfile.EmploymentType.SALARIED);
        } else if (businessIncome.compareTo(BigDecimal.ZERO) > 0 && salaryIncome.compareTo(BigDecimal.ZERO) == 0) {
            profile.setEmploymentType(TaxProfile.EmploymentType.BUSINESS);
        } else if (salaryIncome.compareTo(BigDecimal.ZERO) > 0 && businessIncome.compareTo(BigDecimal.ZERO) > 0) {
            profile.setEmploymentType(TaxProfile.EmploymentType.BUSINESS);
        }

        // Calculate tax
        TaxCalculationDTO taxCalc = calculateTax(profile);

        // Build explanation
        StringBuilder explanation = new StringBuilder();
        explanation.append("Analyzed ").append(credits.size()).append(" credit transactions.\n");
        explanation.append("✓ ").append(includedCount).append(" included in tax calculation\n");
        if (excludedCount > 0) {
            explanation.append("✗ ").append(excludedCount).append(" excluded by user\n");
        }
        explanation.append("\nIncome Sources:\n");
        if (salaryIncome.compareTo(BigDecimal.ZERO) > 0)
            explanation.append("  • Salary: ₹").append(salaryIncome).append("\n");
        if (businessIncome.compareTo(BigDecimal.ZERO) > 0)
            explanation.append("  • Business: ₹").append(businessIncome).append("\n");
        if (interestIncome.compareTo(BigDecimal.ZERO) > 0)
            explanation.append("  • Interest: ₹").append(interestIncome).append("\n");
        if (rentalIncome.compareTo(BigDecimal.ZERO) > 0)
            explanation.append("  • Rental: ₹").append(rentalIncome).append("\n");
        if (capitalGainsST.compareTo(BigDecimal.ZERO) > 0)
            explanation.append("  • Capital Gains (ST): ₹").append(capitalGainsST).append("\n");
        if (otherIncome.compareTo(BigDecimal.ZERO) > 0)
            explanation.append("  • Other: ₹").append(otherIncome).append("\n");
        if (excludedIncome.compareTo(BigDecimal.ZERO) > 0)
            explanation.append("  • Excluded (non-taxable): ₹").append(excludedIncome).append("\n");

        result.setProfile(profile);
        result.setCategorizedTransactions(categorizedTxns);
        result.setCategorySummary(categorySummary);
        result.setTaxCalculation(taxCalc);
        result.setCalculationExplanation(explanation.toString());

        return result;
    }

    // Calculate projected annual tax based on current income run-rate
    public TaxCalculationDTO calculateProjectedTax(TaxProfile partialYearProfile, int monthsCompleted) {
        if (monthsCompleted <= 0 || monthsCompleted > 12) {
            return calculateTax(partialYearProfile);
        }

        // Project full year income
        TaxProfile fullYearProfile = new TaxProfile();
        fullYearProfile.setRegime(partialYearProfile.getRegime());
        fullYearProfile.setFinancialYear(partialYearProfile.getFinancialYear());
        fullYearProfile.setEmploymentType(partialYearProfile.getEmploymentType());

        BigDecimal multiplier = new BigDecimal("12").divide(new BigDecimal(monthsCompleted), 2, RoundingMode.HALF_UP);

        fullYearProfile.setSalaryIncome(partialYearProfile.getSalaryIncome().multiply(multiplier));
        fullYearProfile.setBusinessIncome(partialYearProfile.getBusinessIncome().multiply(multiplier));
        fullYearProfile.setInterestIncome(partialYearProfile.getInterestIncome().multiply(multiplier));
        fullYearProfile.setRentalIncome(partialYearProfile.getRentalIncome().multiply(multiplier));
        fullYearProfile.setCapitalGainsST(partialYearProfile.getCapitalGainsST().multiply(multiplier));
        fullYearProfile.setCapitalGainsLT(partialYearProfile.getCapitalGainsLT().multiply(multiplier));
        fullYearProfile.setOtherIncome(partialYearProfile.getOtherIncome().multiply(multiplier));

        // Deductions remain same (not multiplied)
        fullYearProfile.setSection80C(partialYearProfile.getSection80C());
        fullYearProfile.setSection80D(partialYearProfile.getSection80D());
        fullYearProfile.setSection80E(partialYearProfile.getSection80E());
        fullYearProfile.setSection80G(partialYearProfile.getSection80G());
        fullYearProfile.setSection80CCD1B(partialYearProfile.getSection80CCD1B());
        fullYearProfile.setSection24B(partialYearProfile.getSection24B());
        fullYearProfile.setHraExemption(partialYearProfile.getHraExemption());
        fullYearProfile.setLtaExemption(partialYearProfile.getLtaExemption());
        fullYearProfile.setStandardDeduction(partialYearProfile.getStandardDeduction());

        return calculateTax(fullYearProfile);
    }
}
