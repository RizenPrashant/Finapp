/*
 * Copyright (c) 2026 Rizen.Prashant | Prashant Kumar
 * Pacific Finapp - Personal Finance Management Application
 * All rights reserved.
 */
package com.finapp.service;

import com.finapp.dto.TransactionDTO;
import com.finapp.dto.UdharRecordDTO;
import com.finapp.model.Asset;
import com.finapp.model.AssetCategory;
import com.finapp.model.CashbackEntry;
import com.finapp.model.CashbackWallet;
import com.finapp.model.Transaction;
import com.finapp.model.TransactionType;
import com.finapp.model.UdharRecord;
import com.finapp.model.User;
import com.finapp.repository.AssetRepository;
import com.finapp.repository.CashbackEntryRepository;
import com.finapp.repository.CashbackWalletRepository;
import com.finapp.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final UdharService udharService;
    private final AssetRepository assetRepository;
    private final CashbackWalletRepository cashbackWalletRepository;
    private final CashbackEntryRepository cashbackEntryRepository;
    private final BalanceService balanceService;

    // The unbounded list loaders that used to live here (getAll, getByType,
    // getByPaymentSource, getByBudgetCategory, getByMonthAndYear, getByYear)
    // are gone. Every listing path now goes through the capped query in
    // TransactionController, so there is no convenient way to fetch a user's
    // whole table by accident.

    @Transactional
    public Transaction create(TransactionDTO dto, User user) {
        boolean isUdhar = dto.getIsUdhar() != null && dto.getIsUdhar();

        // Validate limits for BANK and CREDIT_CARD. Checked for both directions:
        // on a credit card a refund reduces what is owed, and the projected
        // balance is what matters either way.
        assertWithinAssetLimits(dto.getPaymentSource(), dto.getType(), dto.getAmount(), null, null, user);

        Transaction transaction = Transaction.builder()
                .title(dto.getTitle())
                .amount(dto.getAmount())
                .type(dto.getType())
                .category(dto.getCategory() != null ? dto.getCategory() : "Uncategorized")
                .budgetCategory(dto.getBudgetCategory() != null ? dto.getBudgetCategory() : "Uncategorized")
                .date(dto.getDate())
                .description(dto.getDescription())
                .paymentSource(dto.getPaymentSource())
                .referenceNumber(dto.getReferenceNumber())
                .isUdhar(isUdhar)
                .user(user)
                .build();

        transaction = transactionRepository.save(transaction);
        transactionRepository.flush(); // recompute reads through SQL

        // Update asset/cashback balance based on payment source
        if (dto.getPaymentSource() != null) {
            updateAssetBalanceOnCreate(dto, user, transaction);
            // Rebuild the running balance from this date on. A back-dated entry
            // shifts every later row, so the window starts at the new row's own
            // date rather than at today.
            balanceService.recompute(user, dto.getPaymentSource(), dto.getDate());
        }

        // If udhar transaction, create udhar record linked to this transaction
        if (isUdhar && dto.getUdharPersonName() != null && dto.getUdharType() != null) {
            UdharRecord.UdharType udharType = UdharRecord.UdharType.valueOf(dto.getUdharType());
            UdharRecordDTO udharDTO = new UdharRecordDTO();
            udharDTO.setPersonName(dto.getUdharPersonName());
            udharDTO.setMobileNumber(dto.getUdharMobileNumber());
            udharDTO.setTotalAmount(dto.getAmount());
            udharDTO.setType(udharType);
            udharDTO.setDate(dto.getDate());
            udharDTO.setNotes(dto.getDescription());
            udharService.createRecordFromTransaction(udharDTO, transaction, user);
        }

        // If setoff udhar record id provided, mark this transaction as settlement
        if (dto.getSetoffUdharRecordId() != null) {
            udharService.settleUdharWithTransaction(dto.getSetoffUdharRecordId(), transaction, dto.getAmount(), user);
        }

        return transaction;
    }

    /**
     * Update asset balance when a transaction is created
     * - BANK: Credit increases balance, Debit decreases balance
     * - CREDIT_CARD: Debit increases balance (you owe more), Credit decreases balance (you pay off)
     * - CASHBACK_WALLET: Credit (earned) increases, Debit (redeemed) decreases
     */
    private void updateAssetBalanceOnCreate(TransactionDTO dto, User user, Transaction transaction) {
        // BANK and CREDIT_CARD balances are owned by BalanceService, which
        // rebuilds them from the ledger. Nudging asset.value here as well would
        // double-apply the change and drift from the per-row running balance.
        Asset asset = assetRepository.findByUserAndName(user, dto.getPaymentSource()).orElse(null);
        if (asset != null) {
            return;
        }

        // Try to find as cashback wallet
        CashbackWallet wallet = cashbackWalletRepository.findByUserAndName(user, dto.getPaymentSource()).orElse(null);
        if (wallet != null) {
            // Cashback: Credit (earned) increases balance, Debit (redeemed) decreases
            BigDecimal currentBalance = wallet.getBalance() != null ? wallet.getBalance() : BigDecimal.ZERO;
            BigDecimal newBalance = dto.getType() == TransactionType.CREDIT
                ? currentBalance.add(dto.getAmount())
                : currentBalance.subtract(dto.getAmount());

            wallet.setBalance(newBalance);
            cashbackWalletRepository.save(wallet);

            // Also create a cashback entry to track this
            CashbackEntry.CashbackType entryType = dto.getType() == TransactionType.CREDIT
                ? CashbackEntry.CashbackType.EARNED
                : CashbackEntry.CashbackType.REDEEMED;

            CashbackEntry entry = CashbackEntry.builder()
                    .wallet(wallet)
                    .user(user)
                    .transaction(transaction)
                    .amount(dto.getAmount())
                    .type(entryType)
                    .description(dto.getTitle())
                    .date(dto.getDate() != null ? dto.getDate() : LocalDate.now())
                    .build();
            cashbackEntryRepository.save(entry);
        }
    }

    @Transactional
    public Transaction update(Long id, TransactionDTO dto, User user) {
        Transaction existing = transactionRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Transaction not found: " + id));

        // Store old values for balance reversal
        String oldPaymentSource = existing.getPaymentSource();
        TransactionType oldType = existing.getType();
        BigDecimal oldAmount = existing.getAmount();
        LocalDate oldDate = existing.getDate();

        // Validate before touching anything. On the same account the edit is
        // weighed net of its own old effect; moving to a different account it
        // is weighed as a fresh charge there.
        boolean sameSource = oldPaymentSource != null && oldPaymentSource.equals(dto.getPaymentSource());
        assertWithinAssetLimits(dto.getPaymentSource(), dto.getType(), dto.getAmount(),
                sameSource ? oldType : null, sameSource ? oldAmount : null, user);

        // Reverse old transaction effect on asset balance
        if (oldPaymentSource != null) {
            reverseAssetBalanceEffect(oldPaymentSource, oldType, oldAmount, user);
        }

        // Update transaction fields
        existing.setTitle(dto.getTitle());
        existing.setAmount(dto.getAmount());
        existing.setType(dto.getType());
        existing.setCategory(dto.getCategory() != null ? dto.getCategory() : existing.getCategory());
        existing.setBudgetCategory(dto.getBudgetCategory() != null ? dto.getBudgetCategory() : existing.getBudgetCategory());
        existing.setDate(dto.getDate());
        existing.setDescription(dto.getDescription());
        existing.setPaymentSource(dto.getPaymentSource());
        existing.setReferenceNumber(dto.getReferenceNumber());
        boolean wasUdhar = existing.getIsUdhar() != null && existing.getIsUdhar();
        boolean isNowUdhar = dto.getIsUdhar() != null && dto.getIsUdhar();
        if (dto.getIsUdhar() != null) existing.setIsUdhar(dto.getIsUdhar());

        Transaction saved = transactionRepository.save(existing);
        transactionRepository.flush(); // recompute reads through SQL

        // Apply new transaction effect on asset balance
        if (dto.getPaymentSource() != null) {
            updateAssetBalanceOnCreate(dto, user, saved);
        }

        // Rebuild running balances. Moving the date backwards invalidates rows
        // between the old and new dates too, so start from whichever is
        // earlier; a move between accounts has to rebuild both sides.
        LocalDate from = earliest(oldDate, dto.getDate());
        if (oldPaymentSource != null) balanceService.recompute(user, oldPaymentSource, from);
        if (dto.getPaymentSource() != null && !dto.getPaymentSource().equals(oldPaymentSource)) {
            balanceService.recompute(user, dto.getPaymentSource(), from);
        }

        // Udhar disabled — unlink from any udhar records
        if (wasUdhar && !isNowUdhar) {
            udharService.unlinkTransaction(saved);
        }

        // Udhar newly enabled — create udhar record linked to this transaction
        if (!wasUdhar && isNowUdhar && dto.getUdharPersonName() != null && dto.getUdharType() != null) {
            UdharRecord.UdharType udharType = UdharRecord.UdharType.valueOf(dto.getUdharType());
            UdharRecordDTO udharDTO = new UdharRecordDTO();
            udharDTO.setPersonName(dto.getUdharPersonName());
            udharDTO.setMobileNumber(dto.getUdharMobileNumber());
            udharDTO.setTotalAmount(dto.getAmount());
            udharDTO.setType(udharType);
            udharDTO.setDate(dto.getDate());
            udharDTO.setNotes(dto.getDescription());
            udharService.createRecordFromTransaction(udharDTO, saved, user);
        }

        // Still udhar, but its details may have been edited. Without this the
        // person, the direction and the amount were fixed at the moment the
        // tick went on and no later edit could reach them.
        if (wasUdhar && isNowUdhar) {
            UdharRecordDTO udharDTO = new UdharRecordDTO();
            udharDTO.setPersonName(dto.getUdharPersonName());
            udharDTO.setMobileNumber(dto.getUdharMobileNumber());
            udharDTO.setTotalAmount(dto.getAmount());
            udharDTO.setDate(dto.getDate());
            if (dto.getUdharType() != null) {
                udharDTO.setType(UdharRecord.UdharType.valueOf(dto.getUdharType()));
            }
            udharService.updateOriginalRecord(saved, udharDTO);
        }

        // If setoff udhar record id provided, mark this transaction as settlement
        if (dto.getSetoffUdharRecordId() != null) {
            udharService.settleUdharWithTransaction(dto.getSetoffUdharRecordId(), saved, dto.getAmount(), user);
        }

        return saved;
    }

    /**
     * Reverse the effect of a transaction on asset balance (for update/delete)
     */
    private void reverseAssetBalanceEffect(String paymentSource, TransactionType type, BigDecimal amount, User user) {
        // As above: BANK and CREDIT_CARD are rebuilt from the ledger, so there
        // is nothing to unwind by hand here.
        Asset asset = assetRepository.findByUserAndName(user, paymentSource).orElse(null);
        if (asset != null) {
            return;
        }

        // Try to find as cashback wallet
        CashbackWallet wallet = cashbackWalletRepository.findByUserAndName(user, paymentSource).orElse(null);
        if (wallet != null) {
            BigDecimal currentBalance = wallet.getBalance() != null ? wallet.getBalance() : BigDecimal.ZERO;
            // Reverse: Earned was +, now -; Redeemed was -, now +
            BigDecimal newBalance = type == TransactionType.CREDIT
                ? currentBalance.subtract(amount)
                : currentBalance.add(amount);

            wallet.setBalance(newBalance);
            cashbackWalletRepository.save(wallet);
        }
    }

    @Transactional
    public void delete(Long id, User user) {
        Transaction transaction = transactionRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Transaction not found: " + id));

        String source = transaction.getPaymentSource();
        LocalDate date = transaction.getDate();

        // Reverse transaction effect on asset balance before deleting
        if (source != null) {
            reverseAssetBalanceEffect(source, transaction.getType(), transaction.getAmount(), user);
        }

        transactionRepository.delete(transaction);
        transactionRepository.flush(); // the recompute reads through SQL, so the row must be gone first

        if (source != null) {
            balanceService.recompute(user, source, date);
        }
    }

    /** The earlier of two dates, tolerating nulls. */
    private static LocalDate earliest(LocalDate a, LocalDate b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.isBefore(b) ? a : b;
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

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal bd) return bd;
        return new BigDecimal(value.toString());
    }

    // Monthly summary for a year — returns list of {month, income, expense, savings}
    public List<Map<String, Object>> getMonthlySummary(int year, User user) {
        String[] months = {"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"};

        // month -> {income, expense, savings}; one query for the whole year
        Map<Integer, BigDecimal[]> totals = new HashMap<>();
        for (Object[] row : transactionRepository.monthlyTotalsByUserAndYear(user, year)) {
            totals.put(((Number) row[0]).intValue(),
                    new BigDecimal[]{ toBigDecimal(row[1]), toBigDecimal(row[2]), toBigDecimal(row[3]) });
        }

        List<Map<String, Object>> result = new ArrayList<>();
        BigDecimal[] empty = { BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO };
        for (int m = 1; m <= 12; m++) {
            // Months with no activity are absent from the grouped result but the
            // chart still expects all twelve points.
            BigDecimal[] t = totals.getOrDefault(m, empty);
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("month", months[m - 1]);
            map.put("income", t[0]);
            map.put("expense", t[1]);
            map.put("savings", t[2]);
            result.add(map);
        }
        return result;
    }

    // Weekly summary — last N weeks
    public List<Map<String, Object>> getWeeklySummary(int weeks, User user) {
        LocalDate today = LocalDate.now();
        LocalDate firstWeekStart = today.minusWeeks(weeks - 1L).with(DayOfWeek.MONDAY);
        LocalDate lastWeekEnd = today.with(DayOfWeek.MONDAY).plusDays(6);

        // One pass over the span, bucketed by the Monday each day belongs to,
        // instead of two aggregate queries per week.
        Map<LocalDate, BigDecimal[]> byWeek = new HashMap<>();
        for (Object[] row : transactionRepository.dailyTotalsByUserBetween(user, firstWeekStart, lastWeekEnd)) {
            LocalDate weekStart = ((LocalDate) row[0]).with(DayOfWeek.MONDAY);
            BigDecimal[] acc = byWeek.computeIfAbsent(weekStart, k -> new BigDecimal[]{ BigDecimal.ZERO, BigDecimal.ZERO });
            acc[0] = acc[0].add(toBigDecimal(row[1]));
            acc[1] = acc[1].add(toBigDecimal(row[2]));
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = weeks - 1; i >= 0; i--) {
            LocalDate weekStart = today.minusWeeks(i).with(DayOfWeek.MONDAY);
            BigDecimal[] acc = byWeek.getOrDefault(weekStart, new BigDecimal[]{ BigDecimal.ZERO, BigDecimal.ZERO });
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("week", "W" + weekStart.get(java.time.temporal.WeekFields.ISO.weekOfWeekBasedYear()));
            map.put("income", acc[0]);
            map.put("expense", acc[1]);
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
     * How much a transaction moves an asset's stored balance.
     *
     * A bank balance rises on money in; a credit card's balance is what you
     * owe, so it rises on money out. Returns zero for asset kinds that do not
     * track a balance this way.
     */
    private static BigDecimal balanceDelta(Asset asset, TransactionType type, BigDecimal amount) {
        final boolean increases;
        if (asset.getCategory() == AssetCategory.BANK) {
            increases = type == TransactionType.CREDIT;
        } else if (asset.getCategory() == AssetCategory.CREDIT_CARD) {
            increases = type == TransactionType.DEBIT;
        } else {
            return BigDecimal.ZERO;
        }
        return increases ? amount : amount.negate();
    }

    /**
     * Check a transaction against the asset's limits.
     *
     * This works off the stored balance, which is already kept current by
     * updateAssetBalanceOnCreate / reverseAssetBalanceEffect. The previous
     * version re-summed every credit and debit and added them to that same
     * stored balance, double-counting history: a bank with 7000 left refused
     * a 5000 spend claiming 4000 was available, and a credit card stayed
     * blocked at its limit even after the bill had been paid in full.
     *
     * oldType/oldAmount are the values being replaced on an edit, so a
     * transaction is never weighed against its own earlier effect. Pass null
     * for a create.
     */
    private void assertWithinAssetLimits(String paymentSource, TransactionType newType, BigDecimal newAmount,
                                         TransactionType oldType, BigDecimal oldAmount, User user) {
        if (paymentSource == null) return;

        // Same lookup the balance-update path uses, so validation and the
        // balance mutation can never disagree about which asset this is.
        Asset asset = assetRepository.findByUserAndName(user, paymentSource).orElse(null);
        if (asset == null) return; // not a tracked account, nothing to enforce

        if (asset.getCategory() != AssetCategory.BANK && asset.getCategory() != AssetCategory.CREDIT_CARD) {
            return;
        }

        BigDecimal current = asset.getValue() != null ? asset.getValue() : BigDecimal.ZERO;
        BigDecimal projected = current;
        if (oldType != null && oldAmount != null) {
            projected = projected.subtract(balanceDelta(asset, oldType, oldAmount));
        }
        projected = projected.add(balanceDelta(asset, newType, newAmount));

        if (asset.getCategory() == AssetCategory.BANK) {
            if (projected.signum() < 0) {
                BigDecimal available = current.subtract(
                        oldType != null && oldAmount != null ? balanceDelta(asset, oldType, oldAmount) : BigDecimal.ZERO);
                throw new RuntimeException(
                    String.format("Insufficient funds in %s. Available: %s, trying to spend: %s",
                        asset.getName(), available, newAmount));
            }
        } else {
            BigDecimal creditLimit = asset.getCreditLimit() != null ? asset.getCreditLimit() : BigDecimal.ZERO;
            if (projected.compareTo(creditLimit) > 0) {
                throw new RuntimeException(
                    String.format("Credit limit exceeded for %s. Limit: %s, outstanding would become: %s",
                        asset.getName(), creditLimit, projected));
            }
        }
    }
}
