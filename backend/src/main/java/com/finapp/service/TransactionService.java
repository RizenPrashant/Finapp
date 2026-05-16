package com.finapp.service;

import com.finapp.dto.TransactionDTO;
import com.finapp.dto.UdharRecordDTO;
import com.finapp.model.Asset;
import com.finapp.model.AssetCategory;
import com.finapp.model.Transaction;
import com.finapp.model.TransactionType;
import com.finapp.model.UdharRecord;
import com.finapp.model.User;
import com.finapp.repository.AssetRepository;
import com.finapp.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final UdharService udharService;
    private final AssetRepository assetRepository;

    public List<Transaction> getAll(User user) {
        List<Transaction> transactions = transactionRepository.findByUser(user);
        // If user has no transactions, try to assign orphan transactions first
        if (transactions.isEmpty()) {
            List<Transaction> orphanTransactions = transactionRepository.findByUserIsNull();
            if (!orphanTransactions.isEmpty()) {
                orphanTransactions.forEach(t -> t.setUser(user));
                transactionRepository.saveAll(orphanTransactions);
                transactions = transactionRepository.findByUser(user);
            }
        }
        return transactions;
    }

    public List<Transaction> getByMonthAndYear(Integer month, Integer year, TransactionType type, User user) {
        LocalDate start = YearMonth.of(year, month).atDay(1);
        LocalDate end = YearMonth.of(year, month).atEndOfMonth();
        if (type != null) return transactionRepository.findByUserAndTypeAndDateBetweenOrderByDateDesc(user, type, start, end);
        return transactionRepository.findByUserAndDateBetweenOrderByDateDesc(user, start, end);
    }

    public List<Transaction> getByYear(Integer year, TransactionType type, User user) {
        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end = LocalDate.of(year, 12, 31);
        if (type != null) return transactionRepository.findByUserAndTypeAndDateBetweenOrderByDateDesc(user, type, start, end);
        return transactionRepository.findByUserAndDateBetweenOrderByDateDesc(user, start, end);
    }

    public List<Transaction> getByBudgetCategory(String budgetCategory, User user) {
        return transactionRepository.findByUserAndBudgetCategoryIgnoreCase(user, budgetCategory);
    }

    public List<Transaction> getByBudgetCategory(String budgetCategory, User user, LocalDate start, LocalDate end) {
        return transactionRepository.findByUserAndBudgetCategoryIgnoreCaseAndDateBetween(user, budgetCategory, start, end);
    }

    public List<Transaction> getByPaymentSource(String paymentSource, User user) {
        return transactionRepository.findByUserAndPaymentSourceIgnoreCaseOrderByDateDesc(user, paymentSource);
    }

    public List<Transaction> getByType(TransactionType type, User user) {
        return transactionRepository.findByUserAndType(user, type);
    }

    @Transactional
    public Transaction create(TransactionDTO dto, User user) {
        boolean isUdhar = dto.getIsUdhar() != null && dto.getIsUdhar();

        // Validate limits for BANK and CREDIT_CARD
        if (dto.getPaymentSource() != null && dto.getType() == TransactionType.DEBIT) {
            validateTransactionLimit(dto, user);
        }

        Transaction transaction = Transaction.builder()
                .title(dto.getTitle())
                .amount(dto.getAmount())
                .type(dto.getType())
                .category(dto.getCategory())
                .budgetCategory(dto.getBudgetCategory())
                .date(dto.getDate())
                .description(dto.getDescription())
                .paymentSource(dto.getPaymentSource())
                .isUdhar(isUdhar)
                .user(user)
                .build();

        transaction = transactionRepository.save(transaction);

        // If udhar transaction, create udhar record
        if (isUdhar && dto.getUdharPersonName() != null && dto.getUdharType() != null) {
            UdharRecord.UdharType udharType = UdharRecord.UdharType.valueOf(dto.getUdharType());

            UdharRecordDTO udharDTO = new UdharRecordDTO();
            udharDTO.setPersonName(dto.getUdharPersonName());
            udharDTO.setMobileNumber(dto.getUdharMobileNumber());
            udharDTO.setTotalAmount(dto.getAmount());
            udharDTO.setType(udharType);
            udharDTO.setDate(dto.getDate());
            udharDTO.setNotes(dto.getDescription());

            udharService.createRecord(udharDTO, user);
        }

        return transaction;
    }

    public Transaction update(Long id, TransactionDTO dto, User user) {
        Transaction existing = transactionRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Transaction not found: " + id));
        existing.setTitle(dto.getTitle());
        existing.setAmount(dto.getAmount());
        existing.setType(dto.getType());
        existing.setCategory(dto.getCategory());
        existing.setBudgetCategory(dto.getBudgetCategory());
        existing.setDate(dto.getDate());
        existing.setDescription(dto.getDescription());
        existing.setPaymentSource(dto.getPaymentSource());
        return transactionRepository.save(existing);
    }

    public void delete(Long id, User user) {
        Transaction transaction = transactionRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Transaction not found: " + id));
        transactionRepository.delete(transaction);
    }

    public BigDecimal sumByType(TransactionType type) {
        return transactionRepository.sumByType(type);
    }

    public BigDecimal sumByUserAndType(User user, TransactionType type) {
        return transactionRepository.sumByUserAndType(user, type);
    }

    public BigDecimal sumByUserAndType(User user, TransactionType type, LocalDate start, LocalDate end) {
        return transactionRepository.sumByUserAndTypeAndDateBetween(user, type, start, end);
    }

    public BigDecimal sumByBudgetCategory(String budgetCategory) {
        return transactionRepository.sumByBudgetCategory(budgetCategory);
    }

    public BigDecimal sumByBudgetCategoryAndType(String budgetCategory, TransactionType type) {
        return transactionRepository.sumByBudgetCategoryAndType(budgetCategory, type);
    }

    public BigDecimal sumByUserAndBudgetCategoryAndType(User user, String budgetCategory, TransactionType type) {
        return transactionRepository.sumByUserAndBudgetCategoryAndType(user, budgetCategory, type);
    }

    public BigDecimal sumByUserAndBudgetCategoryAndType(User user, String budgetCategory, TransactionType type, LocalDate start, LocalDate end) {
        return transactionRepository.sumByUserAndBudgetCategoryAndTypeAndDateBetween(user, budgetCategory, type, start, end);
    }

    // Monthly summary for a year — returns list of {month, income, expense, savings}
    public List<Map<String, Object>> getMonthlySummary(int year, User user) {
        List<Map<String, Object>> result = new ArrayList<>();
        String[] months = {"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"};
        for (int m = 1; m <= 12; m++) {
            LocalDate start = YearMonth.of(year, m).atDay(1);
            LocalDate end = YearMonth.of(year, m).atEndOfMonth();
            BigDecimal income = transactionRepository.sumByUserAndTypeAndDateBetween(user, TransactionType.CREDIT, start, end);
            BigDecimal expense = transactionRepository.sumByUserAndTypeAndDateBetween(user, TransactionType.DEBIT, start, end);
            BigDecimal savings = transactionRepository.sumByUserAndBudgetCategoryAndType(user, "Monthly Total Savings", TransactionType.DEBIT);
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("month", months[m - 1]);
            map.put("income", income);
            map.put("expense", expense);
            map.put("savings", savings);
            result.add(map);
        }
        return result;
    }

    // Weekly summary — last N weeks
    public List<Map<String, Object>> getWeeklySummary(int weeks, User user) {
        List<Map<String, Object>> result = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (int i = weeks - 1; i >= 0; i--) {
            LocalDate weekStart = today.minusWeeks(i).with(DayOfWeek.MONDAY);
            LocalDate weekEnd = weekStart.plusDays(6);
            BigDecimal income = transactionRepository.sumByUserAndTypeAndDateBetween(user, TransactionType.CREDIT, weekStart, weekEnd);
            BigDecimal expense = transactionRepository.sumByUserAndTypeAndDateBetween(user, TransactionType.DEBIT, weekStart, weekEnd);
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("week", "W" + weekStart.get(java.time.temporal.WeekFields.ISO.weekOfWeekBasedYear()));
            map.put("income", income);
            map.put("expense", expense);
            result.add(map);
        }
        return result;
    }

    // Category-wise expense summary
    public List<Map<String, Object>> getCategorySummary(LocalDate start, LocalDate end, User user) {
        List<Object[]> rows = transactionRepository.sumByUserAndCategoryAndDateBetween(user, start, end);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("category", row[0]);
            map.put("amount", row[1]);
            result.add(map);
        }
        return result;
    }

    /**
     * Validate transaction limits for BANK and CREDIT_CARD assets
     * - BANK: Total debit cannot exceed total credit + current balance (no negative balance)
     * - CREDIT_CARD: Total debit cannot exceed credit limit
     */
    private void validateTransactionLimit(TransactionDTO dto, User user) {
        List<Asset> assets = assetRepository.findByUser(user);

        // Find asset by payment source name
        Asset asset = assets.stream()
                .filter(a -> a.getName().equalsIgnoreCase(dto.getPaymentSource()))
                .findFirst()
                .orElse(null);

        if (asset == null) {
            return; // No asset found, skip validation
        }

        // Get all transactions for this payment source
        List<Transaction> transactions = transactionRepository
                .findByUserAndPaymentSourceIgnoreCaseOrderByDateDesc(user, dto.getPaymentSource());

        BigDecimal currentCredit = transactions.stream()
                .filter(t -> t.getType() == TransactionType.CREDIT)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal currentDebit = transactions.stream()
                .filter(t -> t.getType() == TransactionType.DEBIT)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal newDebitTotal = currentDebit.add(dto.getAmount());

        // Validate based on asset category
        if (asset.getCategory() == AssetCategory.BANK) {
            // For bank accounts: Debit cannot exceed Credit + Starting Balance
            // Starting balance is represented by the asset value
            BigDecimal availableFunds = currentCredit.add(asset.getValue() != null ? asset.getValue() : BigDecimal.ZERO);

            if (newDebitTotal.compareTo(availableFunds) > 0) {
                throw new RuntimeException(
                    String.format("Insufficient funds in %s. Available: %s, Trying to spend: %s (Current debits: %s)",
                        asset.getName(),
                        availableFunds.subtract(currentDebit),
                        dto.getAmount(),
                        currentDebit));
            }
        } else if (asset.getCategory() == AssetCategory.CREDIT_CARD) {
            // For credit cards: Debit cannot exceed credit limit
            BigDecimal creditLimit = asset.getCreditLimit() != null ? asset.getCreditLimit() : BigDecimal.ZERO;

            if (newDebitTotal.compareTo(creditLimit) > 0) {
                throw new RuntimeException(
                    String.format("Credit limit exceeded for %s. Limit: %s, Current usage: %s, Trying to add: %s",
                        asset.getName(),
                        creditLimit,
                        currentDebit,
                        dto.getAmount()));
            }
        }
    }
}
