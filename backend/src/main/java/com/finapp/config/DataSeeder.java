package com.finapp.config;

import com.finapp.model.*;
import com.finapp.repository.AssetRepository;
import com.finapp.repository.BudgetLimitRepository;
import com.finapp.repository.InvestmentRepository;
import com.finapp.repository.TradeRepository;
import com.finapp.repository.TransactionRepository;
import com.finapp.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
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
    private final TradeRepository tradeRepository;
    private final InvestmentRepository investmentRepository;
    private final UserRepository userRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional
    public void run(String... args) {
        System.out.println("=== DataSeeder: Starting... ===");

        // Find or create default user (ID 0)
        User defaultUser = userRepository.findById(0L).orElseGet(() -> {
            // First check if user with email exists
            if (userRepository.findByEmail("test@finapp.com").isPresent()) {
                System.out.println("=== DataSeeder: User with email test@finapp.com already exists ===");
                return userRepository.findByEmail("test@finapp.com").get();
            }

            System.out.println("=== DataSeeder: Creating default user with ID 0... ===");
            // Force insert with ID 0 using native query (MySQL compatible)
            try {
                // Enable NO_AUTO_VALUE_ON_ZERO mode for MySQL to allow ID 0
                entityManager.createNativeQuery("SET SESSION sql_mode='NO_AUTO_VALUE_ON_ZERO'").executeUpdate();

                entityManager.createNativeQuery(
                    "INSERT INTO users (id, email, password, first_name, last_name, role, enabled, created_at, updated_at) " +
                    "VALUES (0, 'test@finapp.com', '$2a$10$N9qoSnQfTw9jSgXw1AZ9bOjF5.KC8lQ8Q2q4m7Y3X9v5w8q2r4t6', 'Test', 'User', 'USER', true, NOW(), NOW()) " +
                    "ON DUPLICATE KEY UPDATE email = 'test@finapp.com'"
                ).executeUpdate();
                entityManager.flush();
                entityManager.clear();
                System.out.println("=== DataSeeder: User created with ID 0 ===");
            } catch (Exception e) {
                System.out.println("=== DataSeeder: Native insert failed: " + e.getMessage());
                e.printStackTrace();
            }

            return userRepository.findById(0L)
                .orElseGet(() -> userRepository.findByEmail("test@finapp.com")
                    .orElseThrow(() -> new RuntimeException("Failed to create or find default user")));
        });

        System.out.println("=== DataSeeder: User ID = " + defaultUser.getId() + " ===");

        if (budgetLimitRepository.count() == 0) {
            System.out.println("=== DataSeeder: Seeding budget limits... ===");
            seedBudgetLimits(defaultUser);
        }
        if (transactionRepository.count() == 0) {
            System.out.println("=== DataSeeder: Seeding transactions... ===");
            seedTransactions(defaultUser);
        }
        if (assetRepository.count() == 0) {
            System.out.println("=== DataSeeder: Seeding assets... ===");
            seedAssets(defaultUser);
        }
        if (tradeRepository.count() == 0) {
            System.out.println("=== DataSeeder: Seeding trades... ===");
            seedTrades(defaultUser);
        }
        if (investmentRepository.count() == 0) {
            System.out.println("=== DataSeeder: Seeding investments... ===");
            seedInvestments(defaultUser);
        }
        System.out.println("=== DataSeeder: Done! ===");
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
            Asset.builder().name("Savings Account").value(new BigDecimal("150000")).type(AssetType.ASSET).category(AssetCategory.BANK).date(LocalDate.of(2025, 10, 1)).user(user).build(),
            Asset.builder().name("Fixed Deposit").value(new BigDecimal("200000")).type(AssetType.ASSET).category(AssetCategory.BANK).date(LocalDate.of(2025, 10, 1)).user(user).build(),
            Asset.builder().name("Mutual Funds").value(new BigDecimal("85000")).type(AssetType.INVESTMENT).category(AssetCategory.INVESTMENTS).date(LocalDate.of(2025, 10, 1)).user(user).build(),
            Asset.builder().name("Stocks Portfolio").value(new BigDecimal("45000")).type(AssetType.INVESTMENT).category(AssetCategory.INVESTMENTS).date(LocalDate.of(2025, 10, 1)).user(user).build(),
            Asset.builder().name("Gold").value(new BigDecimal("30000")).type(AssetType.ASSET).category(AssetCategory.GOLD).date(LocalDate.of(2025, 10, 1)).user(user).build(),
            Asset.builder().name("Credit Card Due").value(new BigDecimal("15000")).type(AssetType.LIABILITY).category(AssetCategory.OTHER).date(LocalDate.of(2025, 10, 1)).user(user).build(),
            Asset.builder().name("Personal Loan").value(new BigDecimal("50000")).type(AssetType.DEBT).category(AssetCategory.OTHER).date(LocalDate.of(2025, 10, 1)).user(user).build(),
            Asset.builder().name("Home Loan EMI").value(new BigDecimal("250000")).type(AssetType.DEBT).category(AssetCategory.OTHER).date(LocalDate.of(2025, 10, 1)).user(user).build()
        );
        assetRepository.saveAll(assets);
    }

    private void seedTrades(User user) {
        List<Trade> trades = List.of(
            // OPEN trades
            Trade.builder()
                .stockName("RELIANCE")
                .segment(TradeSegment.EQUITY)
                .tradeType(Trade.TradeType.SWING)
                .positionType(Trade.PositionType.LONG)
                .quantity(10)
                .buyPrice(new BigDecimal("2450.50"))
                .investedAmount(new BigDecimal("24505.00"))
                .brokerage(new BigDecimal("24.51"))
                .status(TradeStatus.OPEN)
                .entryDate(LocalDate.of(2025, 9, 15))
                .notes("Swing trade - expecting 10% upside")
                .broker("ZERODHA")
                .user(user)
                .build(),
            Trade.builder()
                .stockName("INFY")
                .segment(TradeSegment.INTRADAY)
                .tradeType(Trade.TradeType.INTRADAY)
                .positionType(Trade.PositionType.LONG)
                .quantity(50)
                .buyPrice(new BigDecimal("1850.00"))
                .investedAmount(new BigDecimal("92500.00"))
                .brokerage(new BigDecimal("92.50"))
                .status(TradeStatus.OPEN)
                .entryDate(LocalDate.of(2025, 10, 5))
                .notes("Intraday momentum play")
                .broker("UPSTOX")
                .user(user)
                .build(),
            Trade.builder()
                .stockName("TCS")
                .segment(TradeSegment.LONG_TERM)
                .tradeType(Trade.TradeType.LONG_TERM)
                .positionType(Trade.PositionType.LONG)
                .quantity(5)
                .buyPrice(new BigDecimal("3250.75"))
                .investedAmount(new BigDecimal("16253.75"))
                .brokerage(new BigDecimal("16.25"))
                .status(TradeStatus.OPEN)
                .entryDate(LocalDate.of(2025, 8, 20))
                .notes("Long term wealth creation")
                .broker("ANGELONE")
                .user(user)
                .build(),
            Trade.builder()
                .stockName("HDFCBANK")
                .segment(TradeSegment.FNO)
                .tradeType(Trade.TradeType.SCALPING)
                .positionType(Trade.PositionType.SHORT)
                .quantity(2)
                .buyPrice(new BigDecimal("1650.00"))
                .investedAmount(new BigDecimal("3300.00"))
                .brokerage(new BigDecimal("3.30"))
                .status(TradeStatus.OPEN)
                .entryDate(LocalDate.of(2025, 10, 8))
                .notes("Bank Nifty option short")
                .broker("ZERODHA")
                .user(user)
                .build(),
            Trade.builder()
                .stockName("BTCUSDT")
                .segment(TradeSegment.CRYPTO)
                .tradeType(Trade.TradeType.SWING)
                .positionType(Trade.PositionType.LONG)
                .quantity(1)
                .buyPrice(new BigDecimal("55000.00"))
                .investedAmount(new BigDecimal("55000.00"))
                .brokerage(new BigDecimal("55.00"))
                .status(TradeStatus.OPEN)
                .entryDate(LocalDate.of(2025, 9, 1))
                .notes("Crypto swing - target 60000")
                .broker("COINBASE")
                .user(user)
                .build(),
            // CLOSED trades with profit/loss
            Trade.builder()
                .stockName("SBIN")
                .segment(TradeSegment.EQUITY)
                .tradeType(Trade.TradeType.SWING)
                .positionType(Trade.PositionType.LONG)
                .quantity(20)
                .buyPrice(new BigDecimal("650.00"))
                .sellPrice(new BigDecimal("720.50"))
                .investedAmount(new BigDecimal("13000.00"))
                .returnAmount(new BigDecimal("14410.00"))
                .profitLoss(new BigDecimal("1410.00"))
                .profitLossPercentage(new BigDecimal("10.85"))
                .brokerage(new BigDecimal("26.41"))
                .status(TradeStatus.CLOSED)
                .entryDate(LocalDate.of(2025, 7, 10))
                .exitDate(LocalDate.of(2025, 8, 15))
                .notes("Target achieved - 10% profit")
                .broker("UPSTOX")
                .user(user)
                .build(),
            Trade.builder()
                .stockName("ADANIENT")
                .segment(TradeSegment.INTRADAY)
                .tradeType(Trade.TradeType.INTRADAY)
                .positionType(Trade.PositionType.LONG)
                .quantity(15)
                .buyPrice(new BigDecimal("2850.00"))
                .sellPrice(new BigDecimal("2720.00"))
                .investedAmount(new BigDecimal("42750.00"))
                .returnAmount(new BigDecimal("40800.00"))
                .profitLoss(new BigDecimal("-1950.00"))
                .profitLossPercentage(new BigDecimal("-4.56"))
                .brokerage(new BigDecimal("83.55"))
                .status(TradeStatus.CLOSED)
                .entryDate(LocalDate.of(2025, 9, 5))
                .exitDate(LocalDate.of(2025, 9, 5))
                .notes("Stop loss hit")
                .broker("ANGELONE")
                .user(user)
                .build(),
            Trade.builder()
                .stockName("ZOMATO")
                .segment(TradeSegment.SWING)
                .tradeType(Trade.TradeType.SWING)
                .positionType(Trade.PositionType.LONG)
                .quantity(100)
                .buyPrice(new BigDecimal("180.50"))
                .sellPrice(new BigDecimal("225.75"))
                .investedAmount(new BigDecimal("18050.00"))
                .returnAmount(new BigDecimal("22575.00"))
                .profitLoss(new BigDecimal("4525.00"))
                .profitLossPercentage(new BigDecimal("25.07"))
                .brokerage(new BigDecimal("40.63"))
                .status(TradeStatus.CLOSED)
                .entryDate(LocalDate.of(2025, 6, 15))
                .exitDate(LocalDate.of(2025, 9, 10))
                .notes("Multi-bagger swing trade")
                .broker("ZERODHA")
                .user(user)
                .build(),
            Trade.builder()
                .stockName("ETHUSDT")
                .segment(TradeSegment.CRYPTO)
                .tradeType(Trade.TradeType.SCALPING)
                .positionType(Trade.PositionType.SHORT)
                .quantity(5)
                .buyPrice(new BigDecimal("3200.00"))
                .sellPrice(new BigDecimal("3100.00"))
                .investedAmount(new BigDecimal("16000.00"))
                .returnAmount(new BigDecimal("15500.00"))
                .profitLoss(new BigDecimal("500.00"))
                .profitLossPercentage(new BigDecimal("3.13"))
                .brokerage(new BigDecimal("15.50"))
                .status(TradeStatus.CLOSED)
                .entryDate(LocalDate.of(2025, 8, 25))
                .exitDate(LocalDate.of(2025, 8, 25))
                .notes("Quick scalp in crypto")
                .broker("COINBASE")
                .user(user)
                .build(),
            Trade.builder()
                .stockName("TATAMOTORS")
                .segment(TradeSegment.FNO)
                .tradeType(Trade.TradeType.LONG_TERM)
                .positionType(Trade.PositionType.LONG)
                .quantity(50)
                .buyPrice(new BigDecimal("850.00"))
                .sellPrice(new BigDecimal("920.00"))
                .investedAmount(new BigDecimal("42500.00"))
                .returnAmount(new BigDecimal("46000.00"))
                .profitLoss(new BigDecimal("3500.00"))
                .profitLossPercentage(new BigDecimal("8.24"))
                .brokerage(new BigDecimal("88.50"))
                .status(TradeStatus.CLOSED)
                .entryDate(LocalDate.of(2025, 5, 1))
                .exitDate(LocalDate.of(2025, 10, 1))
                .notes("Partial profit booking")
                .broker("UPSTOX")
                .user(user)
                .build()
        );
        tradeRepository.saveAll(trades);
    }

    private void seedInvestments(User user) {
        List<Investment> investments = List.of(
            // FD - Monthly Interest
            Investment.builder()
                .name("SBI Fixed Deposit")
                .type(InvestmentType.FD)
                .buyPrice(new BigDecimal("100000.00"))
                .currentValue(new BigDecimal("107500.00"))  // 7.5% returns
                .quantity(1)
                .buyDate(LocalDate.of(2024, 1, 15))
                .notes("5 year FD @ 7.5% p.a., monthly interest payout")
                .interestEnabled(true)
                .interestRate(new BigDecimal("7.50"))
                .interestFrequency(InterestFrequency.MONTHLY)
                .lastInterestDate(LocalDate.of(2025, 4, 1))
                .user(user)
                .build(),
            
            // RD - Quarterly Interest
            Investment.builder()
                .name("Post Office RD")
                .type(InvestmentType.RD)
                .buyPrice(new BigDecimal("60000.00"))  // 5000 x 12 months
                .currentValue(new BigDecimal("64500.00"))
                .quantity(12)
                .buyDate(LocalDate.of(2024, 6, 1))
                .notes("Monthly 5000, 7.2% p.a., compounded quarterly")
                .interestEnabled(true)
                .interestRate(new BigDecimal("7.20"))
                .interestFrequency(InterestFrequency.QUARTERLY)
                .lastInterestDate(LocalDate.of(2025, 3, 1))
                .user(user)
                .build(),
            
            // Gold
            Investment.builder()
                .name("24K Gold Biscuit (50g)")
                .type(InvestmentType.GOLD)
                .buyPrice(new BigDecimal("75000.00"))  // 1500/g
                .currentValue(new BigDecimal("85000.00"))  // 1700/g
                .quantity(1)
                .buyDate(LocalDate.of(2024, 3, 10))
                .notes("Physical gold, stored in bank locker")
                .user(user)
                .build(),
            
            // Property
            Investment.builder()
                .name("Residential Plot - Noida")
                .type(InvestmentType.PROPERTY)
                .buyPrice(new BigDecimal("2500000.00"))
                .currentValue(new BigDecimal("3200000.00"))
                .quantity(1)
                .buyDate(LocalDate.of(2023, 8, 20))
                .notes("100 sq yards plot, Sector 150")
                .user(user)
                .build(),
            
            // Stocks
            Investment.builder()
                .name("Reliance Industries")
                .type(InvestmentType.STOCKS)
                .buyPrice(new BigDecimal("2450.00"))
                .currentValue(new BigDecimal("2850.00"))
                .quantity(50)
                .buyDate(LocalDate.of(2024, 5, 15))
                .notes("Long term holding")
                .user(user)
                .build(),
            
            // Mutual Fund
            Investment.builder()
                .name("SBI Blue Chip Fund")
                .type(InvestmentType.MUTUAL_FUND)
                .buyPrice(new BigDecimal("50000.00"))
                .currentValue(new BigDecimal("58200.00"))
                .quantity(1)
                .buyDate(LocalDate.of(2024, 2, 1))
                .notes("SIP 5000/month, Direct plan")
                .user(user)
                .build(),
            
            // Bonds - Half Yearly Interest
            Investment.builder()
                .name("RBI Floating Rate Bonds")
                .type(InvestmentType.BONDS)
                .buyPrice(new BigDecimal("200000.00"))
                .currentValue(new BigDecimal("218000.00"))
                .quantity(1)
                .buyDate(LocalDate.of(2024, 4, 10))
                .notes("7.15% p.a., interest paid semi-annually")
                .interestEnabled(true)
                .interestRate(new BigDecimal("7.15"))
                .interestFrequency(InterestFrequency.HALF_YEARLY)
                .lastInterestDate(LocalDate.of(2025, 4, 10))
                .user(user)
                .build(),
            
            // PPF - Yearly Interest
            Investment.builder()
                .name("PPF Account")
                .type(InvestmentType.PPF)
                .buyPrice(new BigDecimal("150000.00"))
                .currentValue(new BigDecimal("172500.00"))
                .quantity(1)
                .buyDate(LocalDate.of(2023, 4, 5))
                .notes("Yearly 1.5L, 7.1% tax-free")
                .interestEnabled(true)
                .interestRate(new BigDecimal("7.10"))
                .interestFrequency(InterestFrequency.YEARLY)
                .lastInterestDate(LocalDate.of(2025, 4, 5))
                .user(user)
                .build(),
            
            // Cryptocurrency
            Investment.builder()
                .name("Bitcoin (BTC)")
                .type(InvestmentType.CRYPTOCURRENCY)
                .buyPrice(new BigDecimal("45000.00"))  // 45L/BTC
                .currentValue(new BigDecimal("52000.00"))  // 52L/BTC
                .quantity(1)
                .buyDate(LocalDate.of(2024, 7, 20))
                .notes("0.001 BTC holding")
                .user(user)
                .build(),
            
            // Silver
            Investment.builder()
                .name("Silver Coins (1kg)")
                .type(InvestmentType.SILVER)
                .buyPrice(new BigDecimal("72000.00"))  // 72/kg
                .currentValue(new BigDecimal("78000.00"))  // 78/kg
                .quantity(1)
                .buyDate(LocalDate.of(2024, 9, 1))
                .notes("1 kg silver coins")
                .user(user)
                .build()
        );
        
        investmentRepository.saveAll(investments);
        System.out.println("=== DataSeeder: Seeded " + investments.size() + " investments ===");
    }
}
