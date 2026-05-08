package com.finapp.service;

import com.finapp.dto.DashboardSummaryDTO;
import com.finapp.model.AssetType;
import com.finapp.model.TransactionType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TransactionService transactionService;
    private final AssetService assetService;

    public DashboardSummaryDTO getSummary() {
        BigDecimal totalIncome = transactionService.sumByType(TransactionType.CREDIT);
        BigDecimal totalExpenses = transactionService.sumByType(TransactionType.DEBIT);
        // Savings = DEBIT transactions in savings budget (money moved to savings)
        BigDecimal totalSavings = transactionService.sumByBudgetCategoryAndType("Monthly Total Savings", TransactionType.DEBIT);
        // Balance = Income - all DEBIT (expenses + savings)
        BigDecimal totalBalance = totalIncome.subtract(totalExpenses);

        double savingsRate = 0.0;
        if (totalIncome.compareTo(BigDecimal.ZERO) > 0) {
            savingsRate = totalSavings.divide(totalIncome, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .doubleValue();
        }

        BigDecimal totalAssets = assetService.sumByType(AssetType.ASSET);
        BigDecimal totalLiabilities = assetService.sumByType(AssetType.LIABILITY);
        BigDecimal totalDebt = assetService.sumByType(AssetType.DEBT);
        BigDecimal totalInvestments = assetService.sumByType(AssetType.INVESTMENT);
        BigDecimal netWorth = totalAssets.add(totalInvestments).subtract(totalLiabilities).subtract(totalDebt);

        return DashboardSummaryDTO.builder()
                .totalIncome(totalIncome)
                .totalExpenses(totalExpenses)
                .totalSavings(totalSavings)
                .totalBalance(totalBalance)
                .savingsRate(savingsRate)
                .totalAssets(totalAssets)
                .totalLiabilities(totalLiabilities)
                .totalDebt(totalDebt)
                .totalInvestments(totalInvestments)
                .netWorth(netWorth)
                .build();
    }
}
