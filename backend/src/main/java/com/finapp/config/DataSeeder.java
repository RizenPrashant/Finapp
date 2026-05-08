package com.finapp.config;

import com.finapp.model.*;
import com.finapp.repository.AssetRepository;
import com.finapp.repository.BudgetLimitRepository;
import com.finapp.repository.TransactionRepository;
import com.finapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final TransactionRepository transactionRepository;
    private final BudgetLimitRepository budgetLimitRepository;
    private final AssetRepository assetRepository;
    private final UserRepository userRepository;

    @Override
    public void run(String... args) {
        // Find or create default user (ID 1)
        User defaultUser = userRepository.findById(1L).orElse(null);
        if (defaultUser == null) {
            return; // Don't seed if no user exists yet
        }

        if (budgetLimitRepository.count() == 0) seedBudgetLimits(defaultUser);
        if (transactionRepository.count() == 0) seedTransactions(defaultUser);
        if (assetRepository.count() == 0) seedAssets(defaultUser);
    }

    private void seedBudgetLimits(User user) {
        List<BudgetLimit> limits = List.of(
            BudgetLimit.builder().category("Monthly Spend").limitAmount(new BigDecimal("50000")).color("#FFA000").note("You've used 90% of your spending limit.").user(user).build(),
            BudgetLimit.builder().category("Monthly Total Savings").limitAmount(new BigDecimal("10000")).color("#4CAF50").note("Nice! Keep saving to reach your goal.").user(user).build(),
            BudgetLimit.builder().category("Monthly Total Expense").limitAmount(new BigDecimal("50000")).color("#D32F2F").note("Warning: You're close to your max expense.").user(user).build(),
            BudgetLimit.builder().category("Monthly Food Expense").limitAmount(new BigDecimal("15000")).color("#4CAF50").note("You're managing food expenses well.").user(user).build(),
            BudgetLimit.builder().category("Monthly Investment").limitAmount(new BigDecimal("10000")).color("#FFA000").note("Consider boosting investments.").user(user).build(),
            BudgetLimit.builder().category("Miscellaneous").limitAmount(new BigDecimal("10000")).color("#4CAF50").note("Track your miscellaneous costs.").user(user).build()
        );
        budgetLimitRepository.saveAll(limits);
    }

    private void seedTransactions(User user) {
        List<Transaction> transactions = List.of(
            Transaction.builder().title("Salary Credit").amount(new BigDecimal("60000")).type(TransactionType.CREDIT).category("Salary").budgetCategory("Income").date(LocalDate.of(2025, 10, 1)).description("Monthly salary").user(user).build(),
            Transaction.builder().title("Freelance Payment").amount(new BigDecimal("17500")).type(TransactionType.CREDIT).category("Freelance").budgetCategory("Income").date(LocalDate.of(2025, 10, 5)).description("Project payment").user(user).build(),
            Transaction.builder().title("Grocery Shopping").amount(new BigDecimal("3500")).type(TransactionType.DEBIT).category("Food").budgetCategory("Monthly Food Expense").date(LocalDate.of(2025, 10, 5)).user(user).build(),
            Transaction.builder().title("Restaurant Dinner").amount(new BigDecimal("2200")).type(TransactionType.DEBIT).category("Food").budgetCategory("Monthly Food Expense").date(LocalDate.of(2025, 10, 8)).user(user).build(),
            Transaction.builder().title("Cafe Coffee").amount(new BigDecimal("800")).type(TransactionType.DEBIT).category("Food").budgetCategory("Monthly Food Expense").date(LocalDate.of(2025, 10, 10)).user(user).build(),
            Transaction.builder().title("Food Delivery").amount(new BigDecimal("1500")).type(TransactionType.DEBIT).category("Food").budgetCategory("Monthly Food Expense").date(LocalDate.of(2025, 10, 12)).user(user).build(),
            Transaction.builder().title("Electricity Bill").amount(new BigDecimal("2200")).type(TransactionType.DEBIT).category("Utilities").budgetCategory("Monthly Spend").date(LocalDate.of(2025, 10, 4)).user(user).build(),
            Transaction.builder().title("Internet Bill").amount(new BigDecimal("1000")).type(TransactionType.DEBIT).category("Utilities").budgetCategory("Monthly Spend").date(LocalDate.of(2025, 10, 7)).user(user).build(),
            Transaction.builder().title("Rent Payment").amount(new BigDecimal("18000")).type(TransactionType.DEBIT).category("Housing").budgetCategory("Monthly Spend").date(LocalDate.of(2025, 10, 1)).user(user).build(),
            Transaction.builder().title("Fuel").amount(new BigDecimal("4000")).type(TransactionType.DEBIT).category("Transport").budgetCategory("Monthly Spend").date(LocalDate.of(2025, 10, 3)).user(user).build(),
            Transaction.builder().title("Netflix Subscription").amount(new BigDecimal("649")).type(TransactionType.DEBIT).category("Entertainment").budgetCategory("Miscellaneous").date(LocalDate.of(2025, 10, 3)).user(user).build(),
            Transaction.builder().title("Gym Membership").amount(new BigDecimal("1500")).type(TransactionType.DEBIT).category("Health").budgetCategory("Miscellaneous").date(LocalDate.of(2025, 10, 2)).user(user).build(),
            Transaction.builder().title("Mutual Fund SIP").amount(new BigDecimal("4000")).type(TransactionType.DEBIT).category("Investment").budgetCategory("Monthly Investment").date(LocalDate.of(2025, 10, 1)).user(user).build(),
            Transaction.builder().title("Stock Purchase").amount(new BigDecimal("2000")).type(TransactionType.DEBIT).category("Investment").budgetCategory("Monthly Investment").date(LocalDate.of(2025, 10, 6)).user(user).build(),
            Transaction.builder().title("Savings Deposit").amount(new BigDecimal("7500")).type(TransactionType.DEBIT).category("Savings").budgetCategory("Monthly Total Savings").date(LocalDate.of(2025, 10, 1)).user(user).build()
        );
        transactionRepository.saveAll(transactions);
    }

    private void seedAssets(User user) {
        List<Asset> assets = List.of(
            Asset.builder().name("Savings Account").value(new BigDecimal("150000")).type(AssetType.ASSET).category("Bank").date(LocalDate.of(2025, 10, 1)).user(user).build(),
            Asset.builder().name("Fixed Deposit").value(new BigDecimal("200000")).type(AssetType.ASSET).category("Bank").date(LocalDate.of(2025, 10, 1)).user(user).build(),
            Asset.builder().name("Mutual Funds").value(new BigDecimal("85000")).type(AssetType.INVESTMENT).category("Market").date(LocalDate.of(2025, 10, 1)).user(user).build(),
            Asset.builder().name("Stocks Portfolio").value(new BigDecimal("45000")).type(AssetType.INVESTMENT).category("Market").date(LocalDate.of(2025, 10, 1)).user(user).build(),
            Asset.builder().name("Gold").value(new BigDecimal("30000")).type(AssetType.INVESTMENT).category("Commodity").date(LocalDate.of(2025, 10, 1)).user(user).build(),
            Asset.builder().name("Credit Card Due").value(new BigDecimal("15000")).type(AssetType.LIABILITY).category("Credit Card").date(LocalDate.of(2025, 10, 1)).user(user).build(),
            Asset.builder().name("Personal Loan").value(new BigDecimal("50000")).type(AssetType.DEBT).category("Loan").date(LocalDate.of(2025, 10, 1)).user(user).build(),
            Asset.builder().name("Home Loan EMI").value(new BigDecimal("250000")).type(AssetType.DEBT).category("Loan").date(LocalDate.of(2025, 10, 1)).user(user).build()
        );
        assetRepository.saveAll(assets);
    }
}
